// Must run before any local module (routes -> controllers -> middleware) is
// required, since several of those read env vars at module-load time.
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const routes = require('./routes/routes.js')
const { FRONTEND_URL } = require('./config/frontendUrl')

const app = express()
const port = process.env.PORT || 4444

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

// Locked to the actual frontend origin, with credentials enabled, so the
// httpOnly session cookie can be sent/received — this combination is
// required, not optional: the browser rejects a wildcard origin paired
// with credentials.
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
)

// Reuses an existing (or in-progress) connection instead of opening a new
// one on every serverless invocation, which would otherwise exhaust the
// connection pool.
let dbConnection

function connectToDB() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection)
  }

  if (!dbConnection) {
    dbConnection = mongoose
      .connect(process.env.MONGO)
      .then((connection) => {
        console.log('Connected to the DB ✅')
        return connection
      })
      .catch((error) => {
        dbConnection = null
        console.error('MongoDB connection error:', error.message)
        throw error
      })
  }

  return dbConnection
}

connectToDB()

// Mount all routes once
app.use('/api', routes)

// Vercel imports this file as a serverless function and calls the exported
// app directly, so .listen() must only run for local/standalone execution.
if (require.main === module) {
  app.listen(port, () => {
    console.log('🚀 Listening on port: ' + port + ' 🚀')
  })
}

module.exports = app
