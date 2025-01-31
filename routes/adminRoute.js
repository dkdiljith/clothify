var express = require('express');
var router = express.Router();

var adminController = require('../controllers/adminController')
var userController = require('../controllers/userController')
var productController = require(`../controllers/productController`)


var SessionHandling = require("../middlewares/SessionHandling")





//GET requests
router.get(`/` ,adminController.loginRender )
router.get(`/register` , adminController.registerRender )
router.get(`/products`, productController.showProducts)
router.get(`/addproducts`, productController.addProductsRender)
router.get(`/dashboard`, adminController.dashboardRender)
router.get(`/userslist`, userController.showUsers)
router.get(`/orders`,productController.ordersRender )
router.get(`/category`, productController.categoryRender)
router.get(`/coupon`, adminController.couponRender)
router.get(`/logout`, adminController.logout)


//POST requests
router.post(`/register` , adminController.register)
router.post(`/login` , adminController.login)
router.post(`/addproducts` , productController.addProducts)
router.post('/delete-product/:id',  productController.deleteProducts )


module.exports = router





