const router = require('express').Router()
const controller = require('../controllers/controllers')

// Test routes
router.get('/getTest', controller.getTest)
router.post('/postTest', controller.postTest)

// Auth routes
router.post('/register', controller.createUser)
router.post('/login', controller.loginUser)
router.get('/me', controller.requireAuth, controller.getCurrentUser)

// Cafe routes
router.post('/cafes', controller.requireAuth, controller.createCafe)
router.get('/cafes', controller.getCafes)
router.get('/cafes/:id', controller.getCafeById)
router.put('/cafes/:id', controller.requireAuth, controller.updateCafe)
router.delete('/cafes/:id', controller.requireAuth, controller.deleteCafe)

module.exports = router
