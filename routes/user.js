const { Router } = require('express')
const UserController = require('../controllers/User')
const router = Router()
const auth = require('../middlewares/auth')

router.post('/', UserController.create)
router.put('/', auth, UserController.update)

module.exports = router
