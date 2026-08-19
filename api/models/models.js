const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

/* User models ----------------------------------------------------------------------*/

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
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

/* User rating models ----------------------------------------------------------------------*/

const userRatingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    contributorStats: {
      categories: {
        computer: {
          count: {
            type: Number,
            default: 0,
            min: 0,
          },

          verification: {
            status: {
              type: String,
              enum: ["none", "pending", "verified", "rejected"],
              default: "none",
            },

            verifiedAt: Date,

            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        },

        accessible: {
          count: {
            type: Number,
            default: 0,
            min: 0,
          },

          verification: {
            status: {
              type: String,
              enum: ["none", "pending", "verified", "rejected"],
              default: "none",
            },

            verifiedAt: Date,

            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        },

        veggie: {
          count: {
            type: Number,
            default: 0,
            min: 0,
          },

          verification: {
            status: {
              type: String,
              enum: ["none", "pending", "verified", "rejected"],
              default: "none",
            },

            verifiedAt: Date,

            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        },

        cosy: {
          count: {
            type: Number,
            default: 0,
            min: 0,
          },

          verification: {
            status: {
              type: String,
              enum: ["none", "pending", "verified", "rejected"],
              default: "none",
            },

            verifiedAt: Date,

            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        },

        datespot: {
          count: {
            type: Number,
            default: 0,
            min: 0,
          },

          verification: {
            status: {
              type: String,
              enum: ["none", "pending", "verified", "rejected"],
              default: "none",
            },

            verifiedAt: Date,

            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        },
      },

      cities: [
        {
          city: {
            type: String,
            required: true,
            trim: true,
          },

          country: {
            type: String,
            required: true,
            trim: true,
          },

          count: {
            type: Number,
            default: 0,
            min: 0,
          },

          verification: {
            status: {
              type: String,
              enum: ["none", "pending", "verified", "rejected"],
              default: "none",
            },

            verifiedAt: Date,

            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

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

    // Coordinates used to place the cafe on your map.
    location: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },

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
    },

    // Cached community rating summary.
    // The individual ratings live in CafeRating.
    ratingSummary: {
      computer: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      accessible: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      veggie: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      cosy: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      datespot: {
        average: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        count: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

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

    computer: {
      type: Number,
      min: 1,
      max: 5,
    },

    accessible: {
      type: Number,
      min: 1,
      max: 5,
    },

    veggie: {
      type: Number,
      min: 1,
      max: 5,
    },

    cosy: {
      type: Number,
      min: 1,
      max: 5,
    },

    datespot: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);


const User = mongoose.model('User', userSchema)
const Cafe = mongoose.model("Cafe", cafeSchema);
const CafeRating = mongoose.model("CafeRating", cafeRatingSchema);
const UserRating = mongoose.model("UserRating", userRatingSchema);

module.exports = {
  Cafe,
  User,
  CafeRating,
  UserRating,
  };


  
