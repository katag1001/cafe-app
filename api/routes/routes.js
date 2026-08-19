const router = require('express').Router()
const controller = require('../controllers/controllers')

router.get('/getTest', controller.getTest)
router.post('/postTest', controller.postTest)
router.post('/register', controller.createUser)
router.post('/login', controller.loginUser)
router.get('/me', controller.requireAuth, controller.getCurrentUser)

module.exports = router