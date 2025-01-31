var express = require('express');
var router = express.Router();

var userController = require('../controllers/userController')
var SessionHandling = require("../middlewares/SessionHandling")


//GET methods USER
router.get('/',SessionHandling.userIsLoggedOut ,userController.indexRender)
router.get(`/login`,SessionHandling.userIsLoggedOut , userController.loginRender)
router.get(`/register`,SessionHandling.userIsLoggedOut ,userController.registerRender)
router.get(`/forgetpassword`,SessionHandling.userIsLoggedOut , userController.forgetPasswordRender)
router.get(`/logout` ,SessionHandling.userIsLoggedIn, userController.userLogout)
router.get(`/home`,SessionHandling.userIsLoggedIn,userController.homeRender )



//POST methods USER
router.post(`/register` ,userController.register)
router.post(`/login`, userController.login)
router.post(`/emailverification` , userController.emailVerification )


// =======================================================================================================
//wildcard route
router.use('*', (req, res) => {
    res.status(404).send('Not Found' );
});





















module.exports = router;
