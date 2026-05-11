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
router.post(`/login`, adminController.login)

router.route(`/register`)
.get(SessionHandling.adminIsLoggedIn, adminController.registerRender)
.post(adminController.register)


///DASHBOARD SIDE///
router.get(`/dashboard`, SessionHandling.adminIsLoggedIn, adminController.dashboardRender)
router.get(`/activity-log`, SessionHandling.adminIsLoggedIn, adminController.activityLogRender)
router.get(`/logout`, SessionHandling.adminIsLoggedIn, adminController.logout)


///SALES REPORT///
router.route(`/salesReport`)
.get(SessionHandling.adminIsLoggedIn, adminController.salesReportRender)
.post(SessionHandling.adminIsLoggedIn, adminController.salesReportRender)

//PRODUCT SIDE///
router.get(`/products`, SessionHandling.adminIsLoggedIn, productController.showProducts)
router.get(`/addproducts`, SessionHandling.adminIsLoggedIn, productController.addProductsRender)
router.get(`/editproducts/:id`, SessionHandling.adminIsLoggedIn, productController.editProductsRender)
router.get('/delete-product/:id',SessionHandling.adminIsLoggedIn, productController.deleteProducts)
router.post(`/addproducts`,SessionHandling.adminIsLoggedIn, productController.addProducts)
router.post("/updateproduct/:id",SessionHandling.adminIsLoggedIn, productController.updateProduct);
//offer adding section
router.get(`/products/apply-offer/:productId` , SessionHandling.adminIsLoggedIn ,productController.applyOfferJson)
router.put(`/products/apply-offer/:productId` , SessionHandling.adminIsLoggedIn , productController.applyOffer)
router.put(`/products/auto-pricing/:productId` , SessionHandling.adminIsLoggedIn , productController.autoPricing)

///ORDER MANAGEMENT///
router.get(`/orders`, SessionHandling.adminIsLoggedIn, orderController.ordersRender)
router.get(`/orderDetails/:orderId`, SessionHandling.adminIsLoggedIn, orderController.orderDetails)
router.post('/orderDetails/:orderId/item/:itemId/status',SessionHandling.adminIsLoggedIn, orderController.orderStatusChange)

///USER MANAGEMENT///
router.get(`/users`, SessionHandling.adminIsLoggedIn, userController.showUsers)
router.get('/blockUser/:id', SessionHandling.adminIsLoggedIn, userController.blockUser) ///BLOCK USER///

///CATEGORY MANAGEMENT///
router.route(`/category`)
.get(SessionHandling.adminIsLoggedIn, categoryController.showCategories)
.post(SessionHandling.adminIsLoggedIn, categoryController.addCategory)

router.route(`/category/:id`)
.get(SessionHandling.adminIsLoggedIn, categoryController.editCategoryRender)
.put(SessionHandling.adminIsLoggedIn, categoryController.editCategory)
.delete(SessionHandling.adminIsLoggedIn, categoryController.deleteCategory)

//offer adding section
router.route(`/category/apply-offer/:id`)
.get(SessionHandling.adminIsLoggedIn , categoryController.applyOfferJson)
.put(SessionHandling.adminIsLoggedIn , categoryController.applyOffer)

router.put(`/category/auto-pricing/:id` , SessionHandling.adminIsLoggedIn , categoryController.autoPricing)

///COUPON MANAGEMENT///
router.get(`/coupons`, SessionHandling.adminIsLoggedIn, couponController.couponRender)
router.post("/coupon/addCoupon",SessionHandling.adminIsLoggedIn, couponController.createCoupon)

router.route(`/coupon/:couponId`)
.get(SessionHandling.adminIsLoggedIn , couponController.couponEditJson)
.put(SessionHandling.adminIsLoggedIn,couponController.couponEdit)
.delete(SessionHandling.adminIsLoggedIn, couponController.couponDelete);

///OFFER MANAGEMENT///
router.get(`/offer`, SessionHandling.adminIsLoggedIn,offerController.offerRender )
router.post("/offer/addOffer" ,SessionHandling.adminIsLoggedIn,offerController.createOffer )

router.get('/offer/totalProducts', SessionHandling.adminIsLoggedIn,offerController.totalListOfProducts);
router.get('/offer/totalCategories', SessionHandling.adminIsLoggedIn,offerController.totalListOfCategories);

router.route(`/offer/:offerId`)
.get(SessionHandling.adminIsLoggedIn, offerController.offerEditJson)
.put(SessionHandling.adminIsLoggedIn, offerController.editOffer)
.delete(SessionHandling.adminIsLoggedIn, offerController.offerDelete);



module.exports = router





