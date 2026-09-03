const jwt = require('jsonwebtoken')
const { User, Cafe, CafeRating, Flag } = require('../models/models')
const { JWT_SECRET, isAdminEmail } = require('../middleware/auth')
const { generateToken, hashToken } = require('../services/tokens')
const { sendEmail } = require('../services/email')
const categories = require('../config/categories')
const { FLAG_REASONS, REJECTION_REASONS } = require('../config/reasons')
const { getTier } = require('../services/tiers')
const { recomputeCafeRatingSummary, recomputeUserContributorStats } = require('../services/recompute')
const { THRESHOLD: LOCAL_BADGE_THRESHOLD } = require('../config/localBadge')

const { findAddress, reverseGeocode, reverseGeocodeAddress } = require("../services/nominatim");
const { findNearbyBusiness } = require("../services/overpass");
const { parseOpeningHours } = require("../services/openingHours");

const isValidPassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)
const isValidUsername = (username) => /^[a-z0-9_]{3,20}$/.test(username)

const USER_SESSION_MS = 1000 * 60 * 60 * 24 * 182 // ~6 months
const ADMIN_SESSION_MS = 1000 * 60 * 60 * 4 // 4 hours — a much shorter blast radius for the higher-privilege role
const EMAIL_VERIFICATION_EXPIRY_MS = 1000 * 60 * 60 * 24 // 24 hours
const PASSWORD_RESET_EXPIRY_MS = 1000 * 60 * 60 // 1 hour — more sensitive than email verification

const { FRONTEND_URL } = require('../config/frontendUrl')


/* User controllers ----------------------------------------------------------------------*/

const createToken = (user, expiresInMs) =>
  jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: Math.floor(expiresInMs / 1000) },
  )

const setSessionCookie = (res, token, maxAge) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  })
}

const getTest = (req, res) => {
  res.status(200).json({ ok: true, message: 'Backend connected.' })
}

const postTest = (req, res) => {
  res.status(200).json({ ok: true, received: req.body || {} })
}

const createUser = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const username = String(req.body?.username || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, username, and password are required.',
      })
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-20 characters and contain only lowercase letters, numbers, or underscores.',
      })
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include a letter, number, and special character.',
      })
    }

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
    ])

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken.',
      })
    }

    const { raw, hash } = generateToken()

    const user = await User.create({
      email,
      username,
      password,
      emailVerificationTokenHash: hash,
      emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS),
    })

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${raw}`
    sendEmail(
      email,
      'Verify your email',
      `<p>Welcome! Click the link below to verify your email and activate your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    )

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account before logging in.',
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or username already exists.',
      })
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const verifyEmail = async (req, res) => {
  try {
    const rawToken = String(req.query?.token || '')

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing verification token.',
      })
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This verification link is invalid or has expired.',
      })
    }

    user.emailVerified = true
    user.emailVerificationTokenHash = undefined
    user.emailVerificationExpires = undefined
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const resendVerification = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const user = email ? await User.findOne({ email, active: true }) : null

    // Always respond the same way regardless of whether the account exists
    // or is already verified, so this endpoint can't be used to check which
    // emails are registered.
    if (user && !user.emailVerified) {
      const { raw, hash } = generateToken()
      user.emailVerificationTokenHash = hash
      user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
      await user.save()

      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${raw}`
      sendEmail(
        email,
        'Verify your email',
        `<p>Click the link below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
      )
    }

    return res.status(200).json({
      success: true,
      message: 'If that email is registered and not yet verified, a new verification link has been sent.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const loginUser = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      })
    }

    const user = await User.findOne({ email, active: true })
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
      })
    }

    const admin = isAdminEmail(user.email)
    const sessionMs = admin ? ADMIN_SESSION_MS : USER_SESSION_MS
    const token = createToken(user, sessionMs)
    setSessionCookie(res, token, sessionMs)

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user._id,
        username: user.username,
        isAdmin: admin,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const logoutUser = (req, res) => {
  res.clearCookie('token')
  return res.status(200).json({ success: true, message: 'Logged out.' })
}

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')

    if (!user || !user.active) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        // This is the one endpoint allowed to return a user's own email —
        // every other response surface (populated fields, public profiles,
        // comment authorship) must expose username only.
        email: user.email,
        isAdmin: isAdminEmail(user.email),
        favorites: user.favorites,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const requestPasswordReset = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const user = email ? await User.findOne({ email, active: true }) : null

    if (user) {
      const { raw, hash } = generateToken()
      user.passwordResetTokenHash = hash
      user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS)
      await user.save()

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${raw}`
      sendEmail(
        email,
        'Reset your password',
        `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      )
    }

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a password reset link has been sent.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const resetPassword = async (req, res) => {
  try {
    const rawToken = String(req.body?.token || '')
    const newPassword = String(req.body?.password || '')

    if (!rawToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      })
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include a letter, number, and special character.',
      })
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(rawToken),
      passwordResetExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired.',
      })
    }

    user.password = newPassword
    user.passwordResetTokenHash = undefined
    user.passwordResetExpires = undefined
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '')
    const newPassword = String(req.body?.newPassword || '')

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      })
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include a letter, number, and special character.',
      })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      })
    }

    user.password = newPassword
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    // Soft delete: scrub personal fields but keep the username and every
    // cafe/rating/comment they've authored, per the product decision that
    // a user's content stays even after they leave.
    user.active = false
    user.email = `deleted-${user._id}@deleted.local`
    user.password = `${require('crypto').randomBytes(24).toString('hex')}!A9`
    await user.save()

    res.clearCookie('token')
    return res.status(200).json({
      success: true,
      message: 'Account deleted.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// PATCH /me/username — re-checks uniqueness the same way registration does.
const changeUsername = async (req, res) => {
  try {
    const newUsername = String(req.body?.username || '').trim().toLowerCase()

    if (!isValidUsername(newUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-20 characters and contain only lowercase letters, numbers, or underscores.',
      })
    }

    const existing = await User.findOne({ username: newUsername })
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken.',
      })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    user.username = newUsername
    await user.save()

    return res.status(200).json({ success: true, username: user.username })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This username is already taken.' })
    }

    return res.status(400).json({ success: false, message: error.message })
  }
}

/* User rating controllers ----------------------------------------------------------------------*/

// Serves the category/question registry (api/config/categories.js) verbatim.
// The frontend must always fetch from here rather than keeping its own copy,
// per CLAUDE.md §4.2 — this is what makes adding a category a config-only change.
const getCategories = (req, res) => {
  res.status(200).json({ success: true, categories })
}

// Same principle as getCategories — the frontend renders its flag/reject
// reason pickers from here, never a hardcoded copy.
const getReasons = (req, res) => {
  res.status(200).json({ success: true, flagReasons: FLAG_REASONS, rejectionReasons: REJECTION_REASONS })
}

/* Cafe controllers ----------------------------------------------------------------------*/

// Level 1 structural validation (PRD.md §7.1) — a thin safety net behind the
// frontend's own required-field checks, since this API is a public URL.
const validateAddressFields = (address) => {
  const requiredFields = ["street", "houseNumber", "city", "postcode", "country"];

  for (const field of requiredFields) {
    const value = address?.[field];

    if (typeof value !== "string" || !value.trim()) {
      return `Address ${field} is required.`;
    }

    if (value.trim().length > 200) {
      return `Address ${field} is too long.`;
    }
  }

  return null;
};

// Runs both verification stages (PRD.md §7.1). Never throws for an
// inconclusive result — a failed, errored, or timed-out stage is treated
// exactly like "not found", which the caller turns into `pending`, never a
// rejection. This is the single source of truth for verification, called by
// both the confirm-step check and the actual save, so a client can never
// simply claim a cafe is verified.
const verifyCafeSubmission = async (address) => {
  let location = null;
  let business = null;

  try {
    location = await findAddress(address);
  } catch (error) {
    location = null;
  }

  if (location) {
    try {
      business = await findNearbyBusiness(location.latitude, location.longitude);
    } catch (error) {
      business = null;
    }
  }

  return {
    verified: Boolean(location && business),
    location,
    business,
  };
};

// Best-effort — a failed write here should never break the caller's action.
const addNotification = async (userId, notification) => {
  try {
    await User.findByIdAndUpdate(userId, { $push: { notifications: notification } });
  } catch (error) {
    console.error("Failed to record notification:", error.message);
  }
};

// Deep-links an admin notification email straight to the relevant queue item
// — AdminPage reads these query params to pre-select the queue tab and item.
const adminReviewLink = (queueType, id) => `${FRONTEND_URL}/admin?type=${queueType}&id=${id}`;

// Shared by every path that can make a cafe verified (instant auto-verify on
// create/edit, and admin approval) — email + one-time toast, per PRD.md §6.4.
const notifyCafeVerified = (cafe, creatorEmail) => {
  addNotification(cafe.createdBy, {
    type: "cafe_verified",
    cafeId: cafe._id,
    cafeName: cafe.name,
  });

  if (creatorEmail) {
    sendEmail(
      creatorEmail,
      "Your cafe is now live",
      `<p>Your cafe "<strong>${cafe.name}</strong>" has been verified and is now publicly visible.</p>`,
    );
  }
};

// Rejection is email-only, no toast (PRD.md §6.4).
const notifyCafeRejected = (cafe, creatorEmail, reasonText) => {
  if (creatorEmail) {
    sendEmail(
      creatorEmail,
      "Your cafe submission was rejected",
      `<p>Your submission "<strong>${cafe.name}</strong>" was rejected.</p>` +
        `<p>Reason: ${reasonText}</p>` +
        `<p>You can edit and resubmit it from your account.</p>`,
    );
  }
};

// GET /cafes/geocode/reverse?lat=&lng= — prefills the add-cafe address form
// from the browser's Geolocation API. Convenience only: the fields it
// returns stay editable and still go through checkCafeAddress/createCafe's
// own verification, never trusted as-is.
const reverseCafeAddress = async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, message: "Valid lat/lng query params are required." });
    }

    const address = await reverseGeocodeAddress({ latitude, longitude });

    if (!address) {
      return res.status(404).json({ success: false, message: "Could not determine an address for that location." });
    }

    return res.status(200).json({ success: true, address });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CHECK (confirm-step): runs verification and returns proposed data without
// saving anything, so the user can review/edit before committing.
const checkCafeAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }

    const validationError = validateAddressFields(address);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { verified, location, business } = await verifyCafeSubmission(address);
    const openingHours = business ? parseOpeningHours(business.openingHours) : null;

    return res.status(200).json({
      success: true,
      verified,
      location: location
        ? { latitude: location.latitude, longitude: location.longitude, displayName: location.displayName }
        : null,
      openingHours,
      phone: business?.phone || null,
      website: business?.website || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE CAFE
const createCafe = async (req, res) => {
  try {
    const { name, address, openingHours, phone, website } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: "Name and address are required.",
      });
    }

    const validationError = validateAddressFields(address);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const { verified, location } = await verifyCafeSubmission(address);

    const cafeData = {
      name,
      address,
      createdBy: req.user.id,
      addressVerification: {
        status: verified ? "verified" : "pending",
        provider: "nominatim",
        verifiedAt: verified ? new Date() : undefined,
        osm: location?.osm,
      },
    };

    if (location) {
      cafeData.location = { latitude: location.latitude, longitude: location.longitude };
      cafeData.geoLocation = { type: "Point", coordinates: [location.longitude, location.latitude] };
    }

    // The user's own confirmed/edited values from the confirm-step — never
    // re-derived here, since these three fields are informational, not
    // security-sensitive (unlike verification status, which is always
    // computed fresh above, never trusted from the client).
    if (openingHours) cafeData.openingHours = openingHours;
    if (phone) cafeData.phone = phone;
    if (website) cafeData.website = website;

    const cafe = await Cafe.create(cafeData);

    if (verified) {
      notifyCafeVerified(cafe, req.user.email);
    } else {
      sendEmail(
        process.env.ADMIN_EMAILS,
        "New cafe requires review",
        `<p>A new cafe submission needs review: <strong>${cafe.name}</strong></p>` +
          `<p>${address.street} ${address.houseNumber}, ${address.postcode} ${address.city}, ${address.country}</p>` +
          `<p><a href="${adminReviewLink("pending", cafe._id)}">Review this submission</a></p>`,
      );
    }

    return res.status(201).json({
      success: true,
      cafe,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const CAFES_PAGE_SIZE = 10;
const CAFES_HARD_CAP = 1000;
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Same simplification/caveat as services/openingHours.js: compares against
// the server process's local time, not the cafe's actual timezone.
function buildOpenNowMatch() {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    openingHours: {
      $elemMatch: { day: dayName, open: { $lte: currentTime }, close: { $gte: currentTime } },
    },
  };
}

// GET ALL — public browsing only ever sees verified cafes (PRD.md §7.1),
// scoped to the requested map viewport. One aggregation does everything:
// geo-match, optional name/open-now filtering, category-aware scoring,
// sorting, hard-capping, and pagination (via $facet so it's a single pass).
const getCafes = async (req, res) => {
  try {
    const { bounds, categories: categoriesParam, search, page, openNow } = req.query;

    if (!bounds) {
      return res.status(400).json({
        success: false,
        message: "bounds is required: swLng,swLat,neLng,neLat",
      });
    }

    const [swLng, swLat, neLng, neLat] = String(bounds).split(",").map(Number);
    if ([swLng, swLat, neLng, neLat].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ success: false, message: "Invalid bounds." });
    }

    const selectedCategories = categoriesParam
      ? String(categoriesParam).split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);

    const matchStage = {
      "addressVerification.status": "verified",
      geoLocation: {
        $geoWithin: {
          // A GeoJSON Polygon, not the legacy $box operator — $box only
          // works with a "2d" index, not the "2dsphere" index this schema
          // actually uses for GeoJSON points.
          $geometry: {
            type: "Polygon",
            coordinates: [[
              [swLng, swLat],
              [neLng, swLat],
              [neLng, neLat],
              [swLng, neLat],
              [swLng, swLat],
            ]],
          },
        },
      },
    };

    if (search) {
      matchStage.name = { $regex: String(search).trim(), $options: "i" };
    }

    const pipeline = [{ $match: matchStage }];

    if (openNow === "true") {
      pipeline.push({ $match: buildOpenNowMatch() });
    }

    if (selectedCategories.length === 0) {
      pipeline.push({ $addFields: { displayScore: "$ratingSummary.overall.average" } });
    } else if (selectedCategories.length === 1) {
      pipeline.push({
        $addFields: {
          displayScore: {
            $let: {
              vars: {
                matched: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$ratingSummary.categories",
                        cond: { $eq: ["$$this.categoryId", selectedCategories[0]] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: "$$matched.average",
            },
          },
        },
      });
    } else {
      // Mean of whichever of the selected categories this cafe actually has
      // data for (inclusive, not requiring all of them) — PRD.md §10.2.
      pipeline.push({
        $addFields: {
          displayScore: {
            $avg: {
              $map: {
                input: {
                  $filter: {
                    input: "$ratingSummary.categories",
                    cond: { $in: ["$$this.categoryId", selectedCategories] },
                  },
                },
                as: "c",
                in: "$$c.average",
              },
            },
          },
        },
      });
    }

    if (selectedCategories.length > 0) {
      // A cafe with none of the selected categories rated is excluded
      // entirely, rather than shown with a meaningless score.
      pipeline.push({ $match: { displayScore: { $ne: null } } });
    }

    pipeline.push({ $sort: { displayScore: -1 } });
    pipeline.push({ $limit: CAFES_HARD_CAP });

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: (pageNumber - 1) * CAFES_PAGE_SIZE },
          { $limit: CAFES_PAGE_SIZE },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "createdBy",
            },
          },
          { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
          { $project: { "createdBy.password": 0, "createdBy.email": 0 } },
        ],
      },
    });

    const [result] = await Cafe.aggregate(pipeline);
    const cafes = result?.data || [];
    const total = result?.metadata?.[0]?.total || 0;

    res.status(200).json({
      success: true,
      cafes,
      pagination: {
        page: pageNumber,
        pageSize: CAFES_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / CAFES_PAGE_SIZE)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ONE — a non-verified cafe is only visible to its own creator
// (optionalAuth populates req.user when a valid session is present, but
// never rejects an anonymous request).
const getCafeById = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.id)
      .populate("createdBy", "username");

    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    const isVerified = cafe.addressVerification?.status === "verified";
    const isOwner = Boolean(req.user) && cafe.createdBy?._id?.toString() === req.user.id;

    if (!isVerified && !isOwner) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    res.status(200).json({
      success: true,
      cafe,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid cafe ID",
    });
  }
};

// GET MINE — every cafe the requester created, regardless of status.
const getMyCafes = async (req, res) => {
  try {
    const cafes = await Cafe.find({ createdBy: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cafes.length,
      cafes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE — open to any logged-in user, not just the creator (PRD.md §7.3).
// Editing the address always re-runs full verification, which also covers
// resubmitting a rejected cafe (PRD.md §6.3) as the same code path.
const updateCafe = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.id);

    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    if (req.body.name !== undefined) {
      cafe.name = req.body.name;
    }

    if (req.body.address !== undefined) {
      const validationError = validateAddressFields(req.body.address);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }

      cafe.address = req.body.address;

      const previousStatus = cafe.addressVerification?.status;
      const { verified, location } = await verifyCafeSubmission(req.body.address);

      cafe.addressVerification = {
        status: verified ? "verified" : "pending",
        provider: "nominatim",
        verifiedAt: verified ? new Date() : undefined,
        osm: location?.osm,
      };

      if (location) {
        cafe.location = { latitude: location.latitude, longitude: location.longitude };
        cafe.geoLocation = { type: "Point", coordinates: [location.longitude, location.latitude] };
      } else {
        cafe.location = undefined;
        cafe.geoLocation = undefined;
      }

      if (verified && previousStatus !== "verified") {
        const creator = await User.findById(cafe.createdBy);
        notifyCafeVerified(cafe, creator?.email);
      } else if (!verified && previousStatus !== "pending") {
        sendEmail(
          process.env.ADMIN_EMAILS,
          "Cafe resubmission requires review",
          `<p>A resubmitted cafe needs review: <strong>${cafe.name}</strong></p>` +
            `<p><a href="${adminReviewLink("pending", cafe._id)}">Review this submission</a></p>`,
        );
      }
    }

    if (req.body.openingHours !== undefined) cafe.openingHours = req.body.openingHours;
    if (req.body.phone !== undefined) cafe.phone = req.body.phone;
    if (req.body.website !== undefined) cafe.website = req.body.website;

    await cafe.save();

    res.status(200).json({
      success: true,
      cafe,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const notifications = user.notifications || [];
    user.notifications = [];
    await user.save();

    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /users/me/favorites — populated, for My Area's own management UI
// (Phase 6's toggle endpoint only ever returns raw ids).
const getMyFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const favorites = await Cafe.find({ _id: { $in: user.favorites } }).select("name address");
    return res.status(200).json({ success: true, favorites });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const FAVORITES_MAX = 10;

// POST /users/me/favorites/:cafeId — toggles membership, enforced server-side.
const toggleFavorite = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.cafeId);
    if (!cafe || cafe.addressVerification?.status !== "verified") {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    const user = await User.findById(req.user.id);
    const cafeIdStr = cafe._id.toString();
    const alreadyFavorited = user.favorites.some((id) => id.toString() === cafeIdStr);

    if (alreadyFavorited) {
      user.favorites = user.favorites.filter((id) => id.toString() !== cafeIdStr);
    } else {
      if (user.favorites.length >= FAVORITES_MAX) {
        return res.status(400).json({
          success: false,
          message: `You can only favorite up to ${FAVORITES_MAX} cafes.`,
        });
      }
      user.favorites.push(cafe._id);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      favorited: !alreadyFavorited,
      favorites: user.favorites,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// GET /cafes/:id/categories/:categoryId/comments — ranked by the frozen
// commentRankSnapshot (PRD.md §8.3), not submission date. Tier/"Local" badge
// info is computed here using services already built in Phase 5 — the
// reusable badge *component* and public profile page are still Phase 8.
const getTopComments = async (req, res) => {
  try {
    const { id: cafeId, categoryId } = req.params;

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    const ratings = await CafeRating.find({ cafeId, "categories.categoryId": categoryId }).populate(
      "userId",
      "username contributorStats",
    );

    const comments = [];

    ratings.forEach((rating) => {
      const entry = rating.categories.find((c) => c.categoryId === categoryId);
      if (!entry?.comment || !rating.userId) return;

      const categoryCount =
        rating.userId.contributorStats?.categories?.find((c) => c.categoryId === categoryId)?.count || 0;
      const tier = getTier(categoryCount);

      const cityEntry = rating.userId.contributorStats?.cities?.find(
        (c) => c.city === cafe.address.city && c.country === cafe.address.country,
      );
      const isLocal = (cityEntry?.count || 0) > LOCAL_BADGE_THRESHOLD;

      comments.push({
        username: rating.userId.username,
        comment: entry.comment,
        commentRankSnapshot: entry.commentRankSnapshot,
        tier,
        isLocal,
      });
    });

    comments.sort((a, b) => b.commentRankSnapshot - a.commentRankSnapshot);

    return res.status(200).json({ success: true, comments: comments.slice(0, 10) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* Flag / report controllers ----------------------------------------------------------------------*/

const FLAG_REASON_IDS = FLAG_REASONS.map((reason) => reason.id);

// Flagged cafes stay publicly visible while under review (PRD.md §6.3) —
// this only ever creates a Flag document, never touches the Cafe itself.
const createFlag = async (req, res) => {
  try {
    const { reason, otherText } = req.body;

    if (!FLAG_REASON_IDS.includes(reason)) {
      return res.status(400).json({ success: false, message: "Invalid reason." });
    }

    const cafe = await Cafe.findById(req.params.id);
    if (!cafe) {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    const flag = await Flag.create({
      cafeId: cafe._id,
      reportedBy: req.user.id,
      reason,
      otherText: reason === "other" ? otherText : undefined,
    });

    const reasonLabel = FLAG_REASONS.find((r) => r.id === reason)?.label || reason;
    sendEmail(
      process.env.ADMIN_EMAILS,
      "Cafe flagged for review",
      `<p><strong>${cafe.name}</strong> has been flagged: ${reasonLabel}</p>` +
        (otherText ? `<p>${otherText}</p>` : "") +
        `<p><a href="${adminReviewLink("flags", flag._id)}">Review this flag</a></p>`,
    );

    return res.status(201).json({ success: true, flag });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* Rating controllers ----------------------------------------------------------------------*/

// How many distinct cafes this user has a rated entry for in this category
// — the basis for both their tier badge and the weight a new rating freezes
// (PRD.md §8.2).
const countUserCategoryRatings = (userId, categoryId) =>
  CafeRating.countDocuments({
    userId,
    categories: { $elemMatch: { categoryId, score: { $exists: true } } },
  });

// Drops unknown questionIds and malformed/empty values, so a client can
// never write arbitrary data into ratingSummary.answers. An unanswered
// question is simply absent from the result (PRD.md §9).
const validateAnswers = (categoryDef, answers) => {
  if (!Array.isArray(answers)) return [];

  const questionMap = new Map(categoryDef.questions.map((q) => [q.id, q]));
  const validated = [];

  for (const answer of answers) {
    const question = questionMap.get(answer?.questionId);
    if (!question) continue;

    const value = answer.value;
    if (value === undefined || value === null || value === "") continue;

    if (question.type === "yesno") {
      if (typeof value !== "boolean") continue;
      validated.push({ questionId: question.id, value });
    } else if (question.type === "select") {
      if (!Array.isArray(value) || !value.length) continue;
      const selected = value.filter((v) => question.options.includes(v));
      if (!selected.length) continue;
      validated.push({ questionId: question.id, value: selected });
    } else if (question.type === "scale") {
      if (!question.options.includes(value)) continue;
      validated.push({ questionId: question.id, value });
    } else if (question.type === "time") {
      if (!value || typeof value.start !== "string" || typeof value.end !== "string") continue;
      if (!value.start || !value.end) continue;
      validated.push({ questionId: question.id, value: { start: value.start, end: value.end } });
    }
  }

  return validated;
};

// PUT /cafes/:id/rating/overall — the Quick Review, always weight 1,
// never contributes to any tier (PRD.md §8.1).
const submitOverallRating = async (req, res) => {
  try {
    const numericScore = Number(req.body?.score);

    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 5) {
      return res.status(400).json({ success: false, message: "Score must be an integer from 1 to 5." });
    }

    const cafe = await Cafe.findById(req.params.id);
    if (!cafe || cafe.addressVerification?.status !== "verified") {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    await CafeRating.findOneAndUpdate(
      { cafeId: cafe._id, userId: req.user.id },
      { $set: { overallScore: numericScore }, $setOnInsert: { categories: [] } },
      { upsert: true },
    );

    await recomputeCafeRatingSummary(cafe._id);

    const updatedCafe = await Cafe.findById(cafe._id);
    return res.status(200).json({ success: true, cafe: updatedCafe });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /cafes/:id/rating/:categoryId — the weighted category quick-score,
// plus that category's optional question answers and comment.
const submitCategoryRating = async (req, res) => {
  try {
    const { id: cafeId, categoryId } = req.params;
    const categoryDef = categories.find((c) => c.id === categoryId);

    if (!categoryDef) {
      return res.status(400).json({ success: false, message: "Unknown category." });
    }

    const numericScore = Number(req.body?.score);
    if (!Number.isInteger(numericScore) || numericScore < 1 || numericScore > 5) {
      return res.status(400).json({ success: false, message: "Score must be an integer from 1 to 5." });
    }

    const cafe = await Cafe.findById(cafeId);
    if (!cafe || cafe.addressVerification?.status !== "verified") {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    const validatedAnswers = validateAnswers(categoryDef, req.body?.answers);
    const trimmedComment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";

    let rating = await CafeRating.findOne({ cafeId, userId: req.user.id });
    const existingEntry = rating?.categories?.find((c) => c.categoryId === categoryId);

    // The count BEFORE this submission — an override doesn't add a new cafe
    // to the tally, only a brand-new category-on-this-cafe rating does.
    const priorCount = await countUserCategoryRatings(req.user.id, categoryId);
    const effectiveCount = existingEntry ? priorCount : priorCount + 1;
    const tier = getTier(effectiveCount);
    const weight = tier ? tier.weight : 1;

    const entryData = {
      categoryId,
      score: numericScore,
      weight,
      answers: validatedAnswers,
      comment: trimmedComment || undefined,
      commentRankSnapshot: trimmedComment ? effectiveCount : existingEntry?.commentRankSnapshot ?? 0,
    };

    if (!rating) {
      rating = new CafeRating({ cafeId, userId: req.user.id, categories: [entryData] });
    } else if (existingEntry) {
      Object.assign(existingEntry, entryData);
    } else {
      rating.categories.push(entryData);
    }

    await rating.save();

    await recomputeCafeRatingSummary(cafeId);
    await recomputeUserContributorStats(req.user.id);

    const updatedCafe = await Cafe.findById(cafeId);
    return res.status(200).json({ success: true, cafe: updatedCafe });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /cafes/:id/rating/:categoryId — "overall" deletes the Quick Review,
// anything else deletes that category entry. Ownership is absolute here,
// unlike cafe editing — no exceptions.
const deleteMyRating = async (req, res) => {
  try {
    const { id: cafeId, categoryId } = req.params;

    const rating = await CafeRating.findOne({ cafeId, userId: req.user.id });
    if (!rating) {
      return res.status(404).json({ success: false, message: "Rating not found." });
    }

    if (categoryId === "overall") {
      if (rating.overallScore === undefined) {
        return res.status(404).json({ success: false, message: "You have not given an overall rating." });
      }
      rating.overallScore = undefined;
    } else {
      const beforeLength = rating.categories.length;
      rating.categories = rating.categories.filter((c) => c.categoryId !== categoryId);

      if (rating.categories.length === beforeLength) {
        return res.status(404).json({ success: false, message: "You have not rated this category." });
      }
    }

    if (!rating.categories.length && rating.overallScore === undefined) {
      await rating.deleteOne();
    } else {
      await rating.save();
    }

    await recomputeCafeRatingSummary(cafeId);
    await recomputeUserContributorStats(req.user.id);

    return res.status(200).json({ success: true, message: "Rating removed." });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /cafes/:id/categories/:categoryId/comment — a comment-only
// contribution: no score, no question answers, so it never touches
// weight/tier/ratingSummary averages (those stay score-driven only, per
// recompute.js). Lets a user leave feedback on a category's comment panel
// without going through the full "Rate this cafe" flow.
const addCategoryComment = async (req, res) => {
  try {
    const { id: cafeId, categoryId } = req.params;
    const categoryDef = categories.find((c) => c.id === categoryId);

    if (!categoryDef) {
      return res.status(400).json({ success: false, message: "Unknown category." });
    }

    const trimmedComment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";
    if (!trimmedComment) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty." });
    }

    const cafe = await Cafe.findById(cafeId);
    if (!cafe || cafe.addressVerification?.status !== "verified") {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    // Ranked by the commenter's already-rated experience in this category —
    // a comment-only submission carries no score, so it never advances that
    // count itself (see countUserCategoryRatings).
    const ratedCount = await countUserCategoryRatings(req.user.id, categoryId);

    let rating = await CafeRating.findOne({ cafeId, userId: req.user.id });
    const existingEntry = rating?.categories?.find((c) => c.categoryId === categoryId);

    if (existingEntry) {
      existingEntry.comment = trimmedComment;
      existingEntry.commentRankSnapshot = ratedCount;
    } else if (rating) {
      rating.categories.push({ categoryId, comment: trimmedComment, commentRankSnapshot: ratedCount });
    } else {
      rating = new CafeRating({
        cafeId,
        userId: req.user.id,
        categories: [{ categoryId, comment: trimmedComment, commentRankSnapshot: ratedCount }],
      });
    }

    await rating.save();

    return res.status(200).json({ success: true, message: "Comment added." });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* Profile controllers ----------------------------------------------------------------------*/

// Shared by the public profile and the "Browse user faves" local-users list
// so both surfaces compute badges the same way, at read time, from
// contributorStats — never stored (PRD.md §8.4).
const computeUserBadges = (user) => {
  const categoryTiers = (user.contributorStats?.categories || [])
    .map((c) => ({ categoryId: c.categoryId, tier: getTier(c.count) }))
    .filter((c) => c.tier);

  const localBadges = (user.contributorStats?.cities || [])
    .filter((c) => c.count > LOCAL_BADGE_THRESHOLD)
    .map((c) => ({ city: c.city, country: c.country }));

  return { categoryTiers, localBadges };
};

// GET /users/:username/profile — fully public, no auth. Badges are computed
// at read time from contributorStats, never stored (PRD.md §8.4).
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username, active: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const { categoryTiers, localBadges } = computeUserBadges(user);

    const favorites = await Cafe.find({ _id: { $in: user.favorites } }).select("name address");

    // Only ever the creator's verified cafes — pending/rejected stay private
    // to their own My Area, never shown on the public profile (PRD.md §7.1).
    const cafesCreated = await Cafe.find({
      createdBy: user._id,
      "addressVerification.status": "verified",
    }).select("name address ratingSummary.overall");

    const ratings = await CafeRating.find({ userId: user._id }).populate("cafeId", "name");
    const cafesRated = ratings
      .filter((r) => r.cafeId)
      .map((r) => ({
        cafeId: r.cafeId._id,
        cafeName: r.cafeId.name,
        overallScore: r.overallScore,
        // Comment-only entries carry no score — they're feedback, not a
        // rating, so they're left out of this "rated cafes" list.
        categories: (r.categories || [])
          .filter((c) => typeof c.score === "number")
          .map((c) => ({ categoryId: c.categoryId, score: c.score })),
      }))
      .filter((r) => r.overallScore != null || r.categories.length);

    return res.status(200).json({
      success: true,
      profile: {
        username: user.username,
        categoryTiers,
        localBadges,
        favorites,
        cafesCreated,
        cafesRated,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /users/me/rated-cafes — the requester's own rated cafes, sorted by
// their own given score (their overall score if given, else the mean of
// their category scores). Serves both the profile's "Add to Top 10" picker
// (Phase 8.5) and My Area's ratings list (Phase 9.3) — one endpoint, two
// consumers, rather than near-duplicate queries in each phase.
const getMyRatedCafes = async (req, res) => {
  try {
    const ratings = await CafeRating.find({ userId: req.user.id }).populate("cafeId", "name");

    const ratedCafes = ratings
      .filter((r) => r.cafeId)
      .map((r) => {
        // Comment-only entries carry no score — they're feedback, not a
        // rating, so they're left out of this "rated cafes" list.
        const ratedCategories = (r.categories || [])
          .filter((c) => typeof c.score === "number")
          .map((c) => ({ categoryId: c.categoryId, score: c.score }));

        const categoryScores = ratedCategories.map((c) => c.score);
        const ownScore =
          r.overallScore != null
            ? r.overallScore
            : categoryScores.length
              ? categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length
              : null;

        return {
          cafeId: r.cafeId._id,
          cafeName: r.cafeId.name,
          overallScore: r.overallScore,
          categories: ratedCategories,
          ownScore,
        };
      })
      .filter((r) => r.overallScore != null || r.categories.length)
      .sort((a, b) => (b.ownScore ?? -1) - (a.ownScore ?? -1));

    return res.status(200).json({ success: true, ratedCafes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /users/local?lat=&lng= — "Browse user faves": resolves the given
// coordinates (from the browser's Geolocation API, which only returns
// lat/lng) to a city via reverse geocoding, then lists every user who has
// crossed that city's "Local" badge threshold (PRD.md §8.4), with all of
// their badges. City/country matching is case-insensitive since
// Cafe.address.city/country is free-typed at cafe-submission time and may
// not match Nominatim's casing exactly.
const getLocalUsers = async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ success: false, message: "Valid lat/lng query params are required." });
    }

    const location = await reverseGeocode({ latitude, longitude });
    if (!location) {
      return res.status(404).json({ success: false, message: "Could not determine a city for that location." });
    }

    const users = await User.find({
      active: true,
      "contributorStats.cities": {
        $elemMatch: {
          city: new RegExp(`^${escapeRegex(location.city)}$`, "i"),
          country: new RegExp(`^${escapeRegex(location.country)}$`, "i"),
          count: { $gt: LOCAL_BADGE_THRESHOLD },
        },
      },
    });

    const profiles = users.map((user) => ({ username: user.username, ...computeUserBadges(user) }));

    return res.status(200).json({ success: true, city: location.city, country: location.country, users: profiles });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* Admin controllers ----------------------------------------------------------------------*/

const getPendingCafes = async (req, res) => {
  try {
    const cafes = await Cafe.find({ "addressVerification.status": "pending" })
      .populate("createdBy", "username")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: cafes.length, cafes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveCafe = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.id);
    if (!cafe) {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    cafe.addressVerification.status = "verified";
    cafe.addressVerification.verifiedAt = new Date();
    cafe.addressVerification.rejectionReason = undefined;
    cafe.addressVerification.rejectionOtherText = undefined;
    await cafe.save();

    const creator = await User.findById(cafe.createdBy);
    notifyCafeVerified(cafe, creator?.email);

    return res.status(200).json({ success: true, cafe });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const REJECTION_REASON_MAP = Object.fromEntries(REJECTION_REASONS.map((r) => [r.id, r.label]));

const rejectCafe = async (req, res) => {
  try {
    const { reason, otherText } = req.body;

    if (!REJECTION_REASON_MAP[reason]) {
      return res.status(400).json({ success: false, message: "Invalid rejection reason." });
    }

    const cafe = await Cafe.findById(req.params.id);
    if (!cafe) {
      return res.status(404).json({ success: false, message: "Cafe not found" });
    }

    cafe.addressVerification.status = "rejected";
    cafe.addressVerification.rejectionReason = reason;
    cafe.addressVerification.rejectionOtherText = reason === "other" ? otherText : undefined;
    await cafe.save();

    const reasonText = reason === "other" ? otherText : REJECTION_REASON_MAP[reason];
    const creator = await User.findById(cafe.createdBy);
    notifyCafeRejected(cafe, creator?.email, reasonText);

    return res.status(200).json({ success: true, cafe });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getFlags = async (req, res) => {
  try {
    const flags = await Flag.find({ status: "open" })
      .populate("cafeId", "name")
      .populate("reportedBy", "username")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: flags.length, flags });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dismissing a flag just closes it out with no side effects. Resolving one
// only has a side effect for "permanently_closed" — it hard-deletes the
// cafe outright, since cafes are only ever hard-closed, never soft-archived
// (PRD.md §6.3).
const resolveFlag = async (req, res) => {
  try {
    const { action } = req.body;

    if (!["resolve", "dismiss"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action." });
    }

    const flag = await Flag.findById(req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Flag not found" });
    }

    flag.status = action === "resolve" ? "resolved" : "dismissed";
    await flag.save();

    if (action === "resolve" && flag.reason === "permanently_closed") {
      await Cafe.findByIdAndDelete(flag.cafeId);
    }

    return res.status(200).json({ success: true, flag });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTest,
  postTest,
  getCategories,
  getReasons,
  createUser,
  verifyEmail,
  resendVerification,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  changePassword,
  deactivateAccount,
  changeUsername,
  getMyNotifications,
  reverseCafeAddress,
  checkCafeAddress,
  createCafe,
  getCafes,
  getCafeById,
  getMyCafes,
  updateCafe,
  submitOverallRating,
  submitCategoryRating,
  deleteMyRating,
  addCategoryComment,
  toggleFavorite,
  getMyFavorites,
  getTopComments,
  getPublicProfile,
  getMyRatedCafes,
  getLocalUsers,
  createFlag,
  getPendingCafes,
  approveCafe,
  rejectCafe,
  getFlags,
  resolveFlag,
}
