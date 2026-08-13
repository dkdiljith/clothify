const productService = require("../services/productService");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'public', 'images', 'productImages');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage }).array('images', 5);

// Render Views Controllers
exports.addProductsRender = async (req, res) => {
    try {
        const categories = await productService.getGroupedCategories();
        return res.render('admin/addProducts', { admin: true, categories });
    } catch {
        return res.status(500).send("Error loading add product page.");
    }
};

exports.editProductsRender = async (req, res) => {
    try {
        const Product = require("../models/productSchema"); // Light query check or service wrapper
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.status(404).redirect('/admin/products');

        const categories = await productService.getGroupedCategories();
        return res.render('admin/editProduct', { admin: true, product, categories });
    } catch {
        return res.status(500).redirect('/admin/products');
    }
};

exports.showProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const query = req.query.query || "";
        const status = req.query.status || "";
        const limit = 5;

        const { products, categories, totalPages, skip } = await productService.fetchProductsForAdmin(query, status, page, limit);

        return res.render("admin/products", {
            products,
            categories,
            query,
            status,
            pagination: {
                page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                serialNumberStart: skip,
            },
        });
    } catch {
        return res.status(500).render("error", { message: "Failed to load products" });
    }
};

exports.singleProductPage = async (req, res) => {
    try {
        const userId = res.locals.user?._id || null;
        const data = await productService.fetchSingleProductDetails(req.params.id, userId);

        if (!data) return res.render("user/singleProductPageNF");

        return res.render("user/singleProductPage", data);
    } catch {
        return res.status(500).render("error", { message: "Server Error" });
    }
};

// API Controllers with Multer Execution
exports.addProducts = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        try {
            await productService.createNewProduct(req.body, req.files);
            // return res.status(200).json({ success: true, message: "Product added successfully." });
            return res.redirect("/admin/addproducts");
        } catch (innerErr) {
            return res.status(400).json({ success: false, error: innerErr.message });
        }
    });
};

exports.updateProduct = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        try {
            await productService.updateExistingProduct(req.params.id, req.body, req.files);
            // return res.status(200).json({ success: true, message: "Product updated successfully." });
            return res.redirect("/admin/products");
        } catch (innerErr) {
            return res.status(400).json({ success: false, error: innerErr.message });
        }
    });
};

exports.blockProduct = async (req, res) => {
    try {
        await productService.toggleBlockProduct(req.params.productId);
        return res.status(200).json({ success: true, message: 'success' });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.applyOfferJson = async (req, res) => {
    try {
        const { product, offers } = await productService.fetchOffersForProduct(req.params.productId);
        return res.status(200).json({ success: true, offers, product });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.applyOffer = async (req, res) => {
    try {
        await productService.applyOfferToProduct(req.params.productId, req.body.offerId);
        return res.status(200).json({ success: true, message: "Offer applied successfully with manual override." });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.autoPricing = async (req, res) => {
    try {
        await productService.resetAutoPricing(req.params.productId);
        return res.status(200).json({ success: true, message: "Automatic pricing enabled successfully." });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};