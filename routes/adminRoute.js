const express = require('express');
const router = express.Router();

router.use((req, res, next) => {
    res.locals.layout = 'admin-layout';
    next();
});

//session for user
router.use((req, res, next) => {
    res.locals.admin = req.session.admin || null;
    next();
});

//controllers
const adminController = require('../controllers/adminController')
const dashboardController = require(`../controllers/dashboardController`)
const userController = require('../controllers/userController')
const productController = require(`../controllers/productController`)
const orderController = require(`../controllers/orderController`)
const categoryController = require('../controllers/categoryController')
const couponController = require(`../controllers/couponController`)
const offerController = require(`../controllers/offerController`)
const salesController = require(`../controllers/salesController`)
const settingController = require(`../controllers/settingController`)

//adminAuth (session)
const adminAuth = require("../middlewares/auth").adminAuth
//invoice generator
const downloadInvoice = require(`../utils/downloadInvoice`)




///ADMIN AUTHENTICATIONS
router.get(`/`, adminController.loginRender)
router.post(`/login`, adminController.login)

router.route(`/register`)
    .get(adminAuth, adminController.registerRender)
    .post(adminAuth, adminController.register)

router.get(`/logout`, adminController.logout)


///DASHBOARD SIDE///
router.get(`/dashboard`, adminAuth, dashboardController.dashboardRender)
router.get("/dashboard/data", adminAuth, dashboardController.getDashboardData);
router.get(`/activity-log`, adminAuth, adminController.activityLogRender)


///SALES REPORT///
router.route(`/salesReport`)
    .get(adminAuth, salesController.salesReportRender)
    .post(adminAuth, salesController.salesReportRender)

router.get('/salesReport/pdf', adminAuth, salesController.downloadSalesReportPdf)
router.get('/salesReport/excel', adminAuth, salesController.downloadSalesReportExcel);
router.get(`/salesReport/csv`, adminAuth, salesController.downloadSalesReportCsv)

//PRODUCT SIDE///
router.get(`/products`, adminAuth, productController.showProducts)
router.get(`/addproducts`, adminAuth, productController.addProductsRender)
router.get(`/editproducts/:id`, adminAuth, productController.editProductsRender)
router.get(`/blockProduct/:productId`, adminAuth, productController.blockProduct)
router.post(`/addproducts`, adminAuth, productController.addProducts)
router.post("/updateproduct/:id", adminAuth, productController.updateProduct);
//offer adding section
router.get(`/products/apply-offer/:productId`, adminAuth, productController.applyOfferJson)
router.put(`/products/apply-offer/:productId`, adminAuth, productController.applyOffer)
router.put(`/products/auto-pricing/:productId`, adminAuth, productController.autoPricing)

///ORDER MANAGEMENT///
router.get(`/orders`, adminAuth, orderController.ordersRender)
router.get(`/orderDetails/:orderId`, adminAuth, orderController.orderDetails)
router.post('/orderDetails/:orderId/item/:itemId/status', adminAuth, orderController.orderStatusChange)
//Invloice download
router.post(`/download-invoice`, adminAuth, downloadInvoice)

///USER MANAGEMENT///
router.get(`/users`, adminAuth, userController.showUsers)
router.get('/blockUser/:id', adminAuth, userController.blockUser) ///BLOCK USER///

///CATEGORY MANAGEMENT///
router.route(`/category`)
    .get(adminAuth, categoryController.showCategories)
    .post(adminAuth, categoryController.addCategory)

router.route(`/category/:id`)
    .get(adminAuth, categoryController.editCategoryRender)
    .put(adminAuth, categoryController.editCategory)
    .delete(adminAuth, categoryController.deleteCategory)

//offer adding section
router.route(`/category/apply-offer/:id`)
    .get(adminAuth, categoryController.applyOfferJson)
    .put(adminAuth, categoryController.applyOffer)

router.put(`/category/auto-pricing/:id`, adminAuth, categoryController.autoPricing)

///COUPON MANAGEMENT///
router.get(`/coupons`, adminAuth, couponController.couponRender)
router.post("/coupon/addCoupon", adminAuth, couponController.createCoupon)

router.route(`/coupon/:couponId`)
    .get(adminAuth, couponController.couponEditJson)
    .put(adminAuth, couponController.couponEdit)
    .delete(adminAuth, couponController.couponDelete);

///OFFER MANAGEMENT///
router.get(`/offer`, adminAuth, offerController.offerRender)
router.post("/offer/addOffer", adminAuth, offerController.createOffer)

router.get('/offer/totalProducts', adminAuth, offerController.totalListOfProducts);
router.get('/offer/totalCategories', adminAuth, offerController.totalListOfCategories);

router.route(`/offer/:offerId`)
    .get(adminAuth, offerController.offerEditJson)
    .put(adminAuth, offerController.editOffer)
    .delete(adminAuth, offerController.offerDelete);

///SETTINGS MANAGEMENT///
router.get(`/settings`, adminAuth, settingController.landingPage)

router.route(`/settings/referral`)
    .get(adminAuth, settingController.referralSettingsRender)
    .post(adminAuth, settingController.referralSettings)


module.exports = router





