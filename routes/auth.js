const express = require('express');
const authController = require('../controller/auth');

const router = express.Router(); //ahora usaremos esto para acudir
//a las diferentes rutas 


router.post('/register', authController.register)

router.post('/login', authController.login)

router.post('/admin', authController.admin)

router.post('/registro', authController.registro)

module.exports = router;