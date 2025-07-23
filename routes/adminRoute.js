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
router.get(`/salesReport`, SessionHandling.adminIsLoggedIn, adminController.salesReportRender)
router.post('/salesReport' , adminController.salesReport)
router.get(`/products`, SessionHandling.adminIsLoggedIn, productController.showProducts)
router.get(`/orders`, SessionHandling.adminIsLoggedIn, orderController.ordersRender)
router.get(`/orderDetails/:orderId`, SessionHandling.adminIsLoggedIn, orderController.orderDetails)
router.post('/orderDetails/:orderId/item/:itemId/status', orderController.orderStatusChange)
router.get(`/users`, SessionHandling.adminIsLoggedIn, userController.showUsers)
router.get('/blockUser/:id', SessionHandling.adminIsLoggedIn, userController.blockUser) ///BLOCK USER///
router.get(`/category`, SessionHandling.adminIsLoggedIn, categoryController.showCategories)
router.get(`/coupons`, SessionHandling.adminIsLoggedIn, couponController.couponRender)
router.get(`/offer`, SessionHandling.adminIsLoggedIn,offerController.offerRender )
router.get(`/logout`, SessionHandling.adminIsLoggedIn, adminController.logout)


//Search
router.get(`/products/search` , SessionHandling.adminIsLoggedIn , searchController.products)
router.get(`/orders/search` , SessionHandling.adminIsLoggedIn , searchController.orders)
router.get(`/users/search` , SessionHandling.adminIsLoggedIn , searchController.users)
router.get(`/coupons/search` , SessionHandling.adminIsLoggedIn , searchController.coupons)



//PRODUCT SIDE///
router.get(`/addproducts`, SessionHandling.adminIsLoggedIn, productController.addProductsRender)
router.get(`/editproducts/:id`, SessionHandling.adminIsLoggedIn, productController.editProductsRender)
router.get('/delete-product/:id', productController.deleteProducts)

router.post(`/addproducts`, productController.addProducts)
router.post("/updateproduct/:id", productController.updateProduct);


//CATEGORY SIDE
router.post("/category", SessionHandling.adminIsLoggedIn, categoryController.addCategory)
router.get("/category/:id", SessionHandling.adminIsLoggedIn, categoryController.editCategoryRender)
router.put("/category/:id", SessionHandling.adminIsLoggedIn, categoryController.editCategory)
router.delete("/category/:id", SessionHandling.adminIsLoggedIn, categoryController.deleteCategory)

//COUPON SIDE
router.post("/coupon/addCoupon", couponController.createCoupon)
router.get(`/coupon/:couponId`, SessionHandling.adminIsLoggedIn, couponController.couponEditRender)
router.put('/coupon/:couponId', couponController.couponEdit)
router.delete('/coupon/:couponId', couponController.couponDelete);

//OFFER SIDE 
router.post("/offer/addOffer" ,offerController.createOffer )
router.get(`/offer/:offerId`, SessionHandling.adminIsLoggedIn, offerController.offerEditRender)
router.put('/offer/:offerId', offerController.editOffer)
router.delete('/offer/:offerId', offerController.offerDelete);


module.exports = router





