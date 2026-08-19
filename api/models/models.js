const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

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

const User = mongoose.model('User', userSchema)
module.exports = User