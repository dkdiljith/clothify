var express = require('express');
var router = express.Router();

var adminController = require('../controllers/adminController')
var userController = require('../controllers/userController')
var productController = require(`../controllers/productController`)
var categoryController = require('../controllers/categoryController')


var SessionHandling = require("../middlewares/SessionHandling")




///ADMIN CREDENTIAL SIDE///
router.get(`/` ,SessionHandling.adminIsLoggedOut,adminController.loginRender )
router.get(`/register` ,SessionHandling.adminIsLoggedIn, adminController.registerRender )

router.post(`/register` , adminController.register)
router.post(`/login` , adminController.login)


///DASHBOARD SIDE///
router.get(`/dashboard`,SessionHandling.adminIsLoggedIn, adminController.dashboardRender)
router.get(`/products`, SessionHandling.adminIsLoggedIn,productController.showProducts)
router.get(`/orders`,SessionHandling.adminIsLoggedIn,productController.ordersRender )
router.get(`/orderDetails/:orderId` ,SessionHandling.adminIsLoggedIn , productController.orderDetails)
router.post('/orderDetails/:orderId/item/:itemId/status' , productController.orderStatusChange)
router.get(`/userslist`,SessionHandling.adminIsLoggedIn, userController.showUsers)
router.get('/blockUser/:id' , SessionHandling.adminIsLoggedIn , userController.blockUser) ///BLOCK USER///
router.get(`/category`,SessionHandling.adminIsLoggedIn, categoryController.showCategories)
router.get(`/coupon`, SessionHandling.adminIsLoggedIn,adminController.couponRender)
router.get(`/logout`, SessionHandling.adminIsLoggedIn,adminController.logout)


//PRODUCT SIDE///
router.get(`/addproducts`,SessionHandling.adminIsLoggedIn, productController.addProductsRender)
router.get(`/editproducts/:id` , SessionHandling.adminIsLoggedIn, productController.editProductsRender)
router.get('/delete-product/:id',  productController.deleteProducts )

router.post(`/addproducts` , productController.addProducts)
router.post("/updateproduct/:id", productController.updateProduct);


//CATEGORY SIDE///
router.post("/addCategory",SessionHandling.adminIsLoggedIn,categoryController.addCategory)
router.post("/updateCategory/:id",SessionHandling.adminIsLoggedIn,categoryController.updateCategory )
router.get("/deleteCategory/:id", SessionHandling.adminIsLoggedIn,categoryController.deleteCategory)
router.get(`/editcategory/:id` , SessionHandling.adminIsLoggedIn ,categoryController.editCategory )



module.exports = router





