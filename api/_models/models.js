const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { FLAG_REASONS, REJECTION_REASONS } = require('../_config/reasons')

/* User models ----------------------------------------------------------------------*/

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
    },

    password: { type: String, required: true },

    // Unverified accounts cannot log in at all.
    emailVerified: { type: Boolean, default: false },

    // Soft-delete flag. A deactivated account has its email/password scrubbed
    // but keeps its username and all authored content intact.
    active: { type: Boolean, default: true },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cafe' }],

    contributorStats: {
      categories: [
        {
          categoryId: { type: String, required: true },
          count: { type: Number, default: 0, min: 0 },
        },
      ],

      cities: [
        {
          city: { type: String, required: true, trim: true },
          country: { type: String, required: true, trim: true },
          count: { type: Number, default: 0, min: 0 },
        },
      ],
    },

    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // One-time in-app toasts (e.g. "your cafe was approved") — fetched and
    // cleared together the next time the user is active (PRD.md §7.1).
    notifications: [
      {
        type: { type: String, enum: ["cafe_verified", "cafe_rejected"], required: true },
        cafeId: { type: mongoose.Schema.Types.ObjectId, ref: "Cafe" },
        cafeName: String,
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { strictQuery: false },
)

userSchema.pre('save', async function validatePassword() {
  if (!this.isModified('password')) {
    return
  }

  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

  if (!passwordPattern.test(this.password)) {
    throw new Error(
      'Password must be at least 8 characters long and include a letter, number, and special character.',
    )
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

/* Cafe models ----------------------------------------------------------------------*/

const cafeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // The user who added the cafe.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    address: {
      street: {
        type: String,
        required: true,
        trim: true,
      },

      houseNumber: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      postcode: {
        type: String,
        required: true,
        trim: true,
      },

      country: {
        type: String,
        required: true,
        trim: true,
      },
    },

    // Coordinates used to place the cafe on your map. Optional at the schema
    // level because a cafe can be saved as "pending" even when the address
    // couldn't be geocoded at all (PRD.md §7.1) — such a cafe simply has no
    // map position until it's corrected/resubmitted.
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },

    // Same coordinates as `location`, in GeoJSON form, purely so MongoDB can
    // index and query it (2dsphere index below). The frontend/map should
    // keep reading the plain `location` field — this one exists for the
    // server-side bounding-box queries in Phase 7.
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },

    openingHours: [
      {
        day: {
          type: String,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          required: true,
        },
        open: { type: String, required: true }, // "HH:MM", 24h
        close: { type: String, required: true },
      },
    ],

    phone: { type: String, trim: true },
    website: { type: String, trim: true },

    // Records how the address/location was verified.
    addressVerification: {
      status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },

      provider: {
        type: String,
        default: "nominatim",
      },

      verifiedAt: {
        type: Date,
      },

      osm: {
        type: {
          type: String,
          enum: ["node", "way", "relation"],
        },

        id: {
          type: String,
        },
      },

      // Only set when status is "rejected" — an admin decision, from the
      // fixed reason list (api/config/reasons.js, PRD.md §6.3).
      rejectionReason: {
        type: String,
        enum: REJECTION_REASONS.map((reason) => reason.id),
      },

      rejectionOtherText: { type: String, trim: true },
    },

    // Cached community rating summary — always derived/rebuildable from the
    // CafeRating collection (CLAUDE.md §4.3), never hand-patched.
    //
    // Array-keyed by categoryId rather than fixed named fields (CLAUDE.md
    // §4.4) so a new category never requires a schema change. `answers` holds
    // whatever aggregated tallies apply to that category's question bank
    // (PRD.md §9) — shape varies per question, built out in Phase 5.
    ratingSummary: {
      overall: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0, min: 0 },
      },

      categories: [
        {
          categoryId: { type: String, required: true },
          average: { type: Number, default: 0, min: 0, max: 5 },
          count: { type: Number, default: 0, min: 0 },
          answers: [
            {
              questionId: { type: String, required: true },
              tally: mongoose.Schema.Types.Mixed,
            },
          ],
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Powers the viewport bounding-box queries in Phase 7 (PRD.md §10.3).
cafeSchema.index({ geoLocation: "2dsphere" });

// One document per (cafe, user) pair. `overallScore` is the unweighted
// Quick Review; `categories` holds at most one entry per categoryId — an
// override updates that entry in place rather than creating a new one.
// `weight` and `commentRankSnapshot` are frozen at submission/edit time and
// never recalculated retroactively (PRD.md §8.2, §8.3).
const cafeRatingSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    overallScore: {
      type: Number,
      min: 1,
      max: 5,
    },

    categories: [
      {
        categoryId: { type: String, required: true },
        // Absent (rather than required) so a comment-only contribution —
        // added straight from a category's comment panel, with no score —
        // can share the same per-category entry shape without a dummy
        // score. Recompute/tier logic must keep treating "no score" as "not
        // a rating" (CLAUDE.md §4.3).
        score: { type: Number, min: 1, max: 5 },
        weight: { type: Number },
        answers: [
          {
            questionId: { type: String, required: true },
            value: mongoose.Schema.Types.Mixed,
          },
        ],
        comment: { type: String, trim: true },
        commentRankSnapshot: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

cafeRatingSchema.index({ cafeId: 1, userId: 1 }, { unique: true });


/* Flag / report models ----------------------------------------------------------------------*/

const flagSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reason: {
      type: String,
      required: true,
      enum: FLAG_REASONS.map((reason) => reason.id),
    },

    otherText: { type: String, trim: true },

    status: {
      type: String,
      enum: ["open", "resolved", "dismissed"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema)
const Cafe = mongoose.model("Cafe", cafeSchema);
const CafeRating = mongoose.model("CafeRating", cafeRatingSchema);
const Flag = mongoose.model("Flag", flagSchema);

module.exports = {
  Cafe,
  User,
  CafeRating,
  Flag,
  };


  
