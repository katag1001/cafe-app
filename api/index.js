const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const routes = require('./routes/routes.js')

dotenv.config()

const app = express()
const port = process.env.PORT || 4444

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

async function connectingToDB() {
  try {
    await mongoose.connect(process.env.MONGO)
    console.log('Connected to the DB ✅')
  } catch (error) {
    console.error('MongoDB connection error:', error.message)
  }
}

connectingToDB()

// Mount all routes once
app.use('/api', routes)

app.listen(port, () => {
  console.log('🚀 Listening on port: ' + port + ' 🚀')
})
