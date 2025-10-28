const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController')
const userController = require('../controllers/userController')
const productController = require(`../controllers/productController`)
const orderController = require(`../controllers/orderController`)
const categoryController = require('../controllers/categoryController')
const couponController = require(`../controllers/couponController`)
const offerController = require(`../controllers/offerController`)
const searchController = require(`../controllers/searchController`)

const SessionHandling = require("../middlewares/SessionHandling")




///ADMIN CREDENTIAL SIDE///
router.get(`/`, SessionHandling.adminIsLoggedOut, adminController.loginRender)
router.get(`/register`, SessionHandling.adminIsLoggedIn, adminController.registerRender)
router.post(`/register`, adminController.register)
router.post(`/login`, adminController.login)


///DASHBOARD SIDE///
router.get(`/dashboard`, SessionHandling.adminIsLoggedIn, adminController.dashboardRender)
router.get(`/activity-log`, SessionHandling.adminIsLoggedIn, adminController.activityLogRender)
router.get(`/logout`, SessionHandling.adminIsLoggedIn, adminController.logout)


//Search
router.get(`/products/search` , SessionHandling.adminIsLoggedIn , searchController.products)
router.get(`/orders/search` , SessionHandling.adminIsLoggedIn , searchController.orders)
router.get(`/users/search` , SessionHandling.adminIsLoggedIn , searchController.users)
router.get(`/coupons/search` , SessionHandling.adminIsLoggedIn , searchController.coupons)
router.get(`/offer/search` , SessionHandling.adminIsLoggedIn , searchController.offers)

///SALES REPORT///
router.get(`/salesReport`, SessionHandling.adminIsLoggedIn, adminController.salesReportRender)
router.post('/salesReport' ,SessionHandling.adminIsLoggedIn, adminController.salesReportRender)

//PRODUCT SIDE///
router.get(`/products`, SessionHandling.adminIsLoggedIn, productController.showProducts)
router.get(`/addproducts`, SessionHandling.adminIsLoggedIn, productController.addProductsRender)
router.get(`/editproducts/:id`, SessionHandling.adminIsLoggedIn, productController.editProductsRender)
router.get('/delete-product/:id',SessionHandling.adminIsLoggedIn, productController.deleteProducts)
router.post(`/addproducts`,SessionHandling.adminIsLoggedIn, productController.addProducts)
router.post("/updateproduct/:id",SessionHandling.adminIsLoggedIn, productController.updateProduct);

///ORDER MANAGEMENT///
router.get(`/orders`, SessionHandling.adminIsLoggedIn, orderController.ordersRender)
router.get(`/orderDetails/:orderId`, SessionHandling.adminIsLoggedIn, orderController.orderDetails)
router.post('/orderDetails/:orderId/item/:itemId/status',SessionHandling.adminIsLoggedIn, orderController.orderStatusChange)

///USER MANAGEMENT///
router.get(`/users`, SessionHandling.adminIsLoggedIn, userController.showUsers)
router.get('/blockUser/:id', SessionHandling.adminIsLoggedIn, userController.blockUser) ///BLOCK USER///

///CATEGORY MANAGEMENT///
router.get(`/category`, SessionHandling.adminIsLoggedIn, categoryController.showCategories)
router.post("/category", SessionHandling.adminIsLoggedIn, categoryController.addCategory)
router.get("/category/:id", SessionHandling.adminIsLoggedIn, categoryController.editCategoryRender)
router.put("/category/:id", SessionHandling.adminIsLoggedIn, categoryController.editCategory)
router.delete("/category/:id", SessionHandling.adminIsLoggedIn, categoryController.deleteCategory)

///COUPON MANAGEMENT///
router.get(`/coupons`, SessionHandling.adminIsLoggedIn, couponController.couponRender)
router.post("/coupon/addCoupon",SessionHandling.adminIsLoggedIn, couponController.createCoupon)
router.get(`/coupon/:couponId` , SessionHandling.adminIsLoggedIn , couponController.couponEditJson)
router.put('/coupon/:couponId', SessionHandling.adminIsLoggedIn,couponController.couponEdit)
router.delete('/coupon/:couponId',SessionHandling.adminIsLoggedIn, couponController.couponDelete);

///OFFER MANAGEMENT///
router.get(`/offer`, SessionHandling.adminIsLoggedIn,offerController.offerRender )
router.post("/offer/addOffer" ,SessionHandling.adminIsLoggedIn,offerController.createOffer )
router.get(`/offer/:offerId`, SessionHandling.adminIsLoggedIn, offerController.offerEditJson)
router.put('/offer/:offerId',SessionHandling.adminIsLoggedIn, offerController.editOffer)
router.delete('/offer/:offerId',SessionHandling.adminIsLoggedIn, offerController.offerDelete);


module.exports = router





