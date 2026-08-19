const jwt = require('jsonwebtoken')
const { User, Cafe } = require('../models/models')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const isValidPassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)

const { findAddress } = require("../services/nominatim");


/* User controllers ----------------------------------------------------------------------*/

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '1y' },
  )

const getTest = (req, res) => {
  res.status(200).json({ ok: true, message: 'Backend connected.' })
}

const postTest = (req, res) => {
  res.status(200).json({ ok: true, received: req.body || {} })
}

/* Auth middleware */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    })
  }
}

const createUser = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      })
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include a letter, number, and special character.',
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    const user = await User.create({ email, password })
    const token = createToken(user)

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

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

    const user = await User.findOne({ email })
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

    const token = createToken(user)

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

/* User rating controllers ----------------------------------------------------------------------*/

/* Cafe controllers ----------------------------------------------------------------------*/

const createCafe = async (req, res) => {
  console.log("====================================");
  console.log("CREATE CAFE - START");
  console.log("====================================");

  try {
    // ----------------------------------
    // 1. Get data from request
    // ----------------------------------

    const { name, address } = req.body;

    console.log("Cafe name received:", name);
    console.log("Address received:", address);
    console.log("User ID:", req.user?._id);

    // ----------------------------------
    // 2. Check that we have an address
    // ----------------------------------

    if (!address) {
      console.log("❌ No address provided");

      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    console.log("✅ Address exists");

    // ----------------------------------
    // 3. Send address to Nominatim
    // ----------------------------------

    console.log("📍 Sending address to Nominatim...");

    const location = await findAddress(address);

    console.log("Nominatim response:", location);

    // ----------------------------------
    // 4. Check whether Nominatim found it
    // ----------------------------------

    if (!location) {
      console.log("❌ Nominatim could not find this address");

      return res.status(400).json({
        success: false,
        message: "Address could not be found",
      });
    }

    console.log("✅ Nominatim found the address");

    console.log("Latitude:", location.latitude);
    console.log("Longitude:", location.longitude);

    // ----------------------------------
    // 5. Create the Cafe
    // ----------------------------------

    console.log("☕ Creating cafe in MongoDB...");

    const cafe = await Cafe.create({
      name,
      address,

      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },

      createdBy: req.user._id,
    });

    console.log("✅ Cafe successfully created");
    console.log("Cafe ID:", cafe._id);

    console.log("====================================");
    console.log("CREATE CAFE - COMPLETE");
    console.log("====================================");

    // ----------------------------------
    // 6. Send response
    // ----------------------------------

    res.status(201).json({
      success: true,
    });
  } catch (error) {
    console.log("====================================");
    console.log("❌ CREATE CAFE - ERROR");
    console.log("====================================");

    console.error("Error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// GET ALL
const getCafes = async (req, res) => {
  try {
    const cafes = await Cafe.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

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

// GET ONE
const getCafeById = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!cafe) {
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

// UPDATE
const updateCafe = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.id);

    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Only allow the creator to update the cafe
    if (cafe.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this cafe",
      });
    }

    const allowedFields = ["name", "address", "location"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        cafe[field] = req.body[field];
      }
    });

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

// DELETE
const deleteCafe = async (req, res) => {
  try {
    const cafe = await Cafe.findById(req.params.id);

    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    // Only the creator can delete it
    if (cafe.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this cafe",
      });
    }

    await cafe.deleteOne();

    res.status(200).json({
      success: true,
      message: "Cafe deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid cafe ID",
    });
  }
};


module.exports = {
  getTest,
  postTest,
  requireAuth,
  getCurrentUser,
  createUser,
  loginUser,
  deleteUser,
  createCafe,
  getCafes,
  getCafeById,
  updateCafe,
  deleteCafe,
}
