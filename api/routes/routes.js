const router = require('express').Router()
const controller = require('../controllers/controllers')
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth')
const { loginLimiter, accountActionLimiter } = require('../middleware/rateLimit')

// Test routes
router.get('/getTest', controller.getTest)
router.post('/postTest', controller.postTest)

// Config registries (see api/config/*.js)
router.get('/categories', controller.getCategories)
router.get('/reasons', controller.getReasons)

// Auth routes
router.post('/register', accountActionLimiter, controller.createUser)
router.get('/verify-email', controller.verifyEmail)
router.post('/resend-verification', accountActionLimiter, controller.resendVerification)
router.post('/login', loginLimiter, controller.loginUser)
router.post('/logout', controller.logoutUser)
router.get('/me', requireAuth, controller.getCurrentUser)
router.post('/forgot-password', accountActionLimiter, controller.requestPasswordReset)
router.post('/reset-password', controller.resetPassword)
router.post('/change-password', requireAuth, controller.changePassword)
router.delete('/me', requireAuth, controller.deactivateAccount)
router.patch('/me/username', requireAuth, controller.changeUsername)
router.get('/me/notifications', requireAuth, controller.getMyNotifications)

// Cafe routes
// NOTE: '/cafes/mine' must be registered before '/cafes/:id', or Express
// would try to treat "mine" as an :id value.
router.post('/cafes/check', requireAuth, controller.checkCafeAddress)
router.get('/cafes/mine', requireAuth, controller.getMyCafes)
router.post('/cafes', requireAuth, controller.createCafe)
router.get('/cafes', controller.getCafes)
router.get('/cafes/:id', optionalAuth, controller.getCafeById)
router.put('/cafes/:id', requireAuth, controller.updateCafe)
router.post('/cafes/:id/flags', requireAuth, controller.createFlag)

// Rating routes
router.put('/cafes/:id/rating/overall', requireAuth, controller.submitOverallRating)
router.put('/cafes/:id/rating/:categoryId', requireAuth, controller.submitCategoryRating)
router.delete('/cafes/:id/rating/:categoryId', requireAuth, controller.deleteMyRating)
router.get('/cafes/:id/categories/:categoryId/comments', controller.getTopComments)

// Favorites
router.get('/users/me/favorites', requireAuth, controller.getMyFavorites)
router.post('/users/me/favorites/:cafeId', requireAuth, controller.toggleFavorite)

// Profile
router.get('/users/me/rated-cafes', requireAuth, controller.getMyRatedCafes)
router.get('/users/local', controller.getLocalUsers)
router.get('/users/:username/profile', controller.getPublicProfile)

// Admin routes — requireAdmin re-checks ADMIN_EMAILS live on every request
// (CLAUDE.md §4.5), never trusting a cached role.
router.get('/admin/cafes/pending', requireAuth, requireAdmin, controller.getPendingCafes)
router.post('/admin/cafes/:id/approve', requireAuth, requireAdmin, controller.approveCafe)
router.post('/admin/cafes/:id/reject', requireAuth, requireAdmin, controller.rejectCafe)
router.get('/admin/flags', requireAuth, requireAdmin, controller.getFlags)
router.patch('/admin/flags/:id', requireAuth, requireAdmin, controller.resolveFlag)

module.exports = router
