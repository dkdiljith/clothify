import * as productService from '../services/productService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// MESSAGE_CONSTANTS
import PRODUCT_MESSAGES from '../constants/product.js';
import OFFER_MESSAGES from '../constants/offer.js';
import STATUS_CODDES from '../constants/status-codes.js';


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
})

const upload = multer({ storage: storage }).array('images', 5);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Render Views Controllers
export const addProductsRender = async (req, res) => {
    try {
        const categories = await productService.getGroupedCategories();
        return res.render('admin/addProducts', { admin: true, categories });
    } catch {
        return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).send(PRODUCT_MESSAGES.FAILED_LOADING_ADDPRODUCTPAGE);
    }
};

export const editProductsRender = async (req, res) => {
    try {
        const product = await productService.getProduct(req.params.id)
        if (!product) return res.status(STATUS_CODDES.NOT_FOUND).redirect('/admin/products');

        const categories = await productService.getGroupedCategories();
        return res.render('admin/editProduct', { admin: true, product, categories });
    } catch {
        return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).redirect('/admin/products');
    }
};

export const showProducts = async (req, res) => {
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
        return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).render("error", { message: PRODUCT_MESSAGES.FAILED_LOADING });
    }
};

export const singleProductPage = async (req, res) => {
    try {
        const userId = res.locals.user?._id || null;
        const data = await productService.fetchSingleProductDetails(req.params.id, userId);

        if (!data) return res.render("user/singleProductPageNF");

        return res.render("user/singleProductPage", data);
    } catch {
        return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).render("error", { message: PRODUCT_MESSAGES.FAILED_LOADING });
    }
};

// API Controllers with Multer Execution
export const addProducts = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).json({ success: false, error: err.message });
        try {
            await productService.createNewProduct(req.body, req.files);
            // return res.status(200).json({ success: true, message: "Product added successfully." });
            return res.redirect("/admin/addproducts");
        } catch (innerErr) {
            return res.status(STATUS_CODDES.BAD_REQUEST).json({ success: false, error: innerErr.message });
        }
    });
};

export const updateProduct = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).json({ success: false, error: err.message });
        try {
            await productService.updateExistingProduct(req.params.id, req.body, req.files);
            // return res.status(200).json({ success: true, message: "Product updated successfully." });
            return res.redirect("/admin/products");
        } catch (innerErr) {
            return res.status(STATUS_CODDES.BAD_REQUEST).json({ success: false, error: innerErr.message });
        }
    });
};

export const blockProduct = async (req, res) => {
    try {
        await productService.toggleBlockProduct(req.params.productId);
        return res.status(STATUS_CODDES.OK).json({ success: true, message: 'success' });
    } catch (error) {
        return res.status(STATUS_CODDES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

export const applyOfferJson = async (req, res) => {
    try {
        const { product, offers } = await productService.fetchOffersForProduct(req.params.productId);
        return res.status(STATUS_CODDES.OK).json({ success: true, offers, product });
    } catch (error) {
        return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

export const applyOffer = async (req, res) => {
    try {
        await productService.applyOfferToProduct(req.params.productId, req.body.offerId);
        return res.status(STATUS_CODDES.OK).json({ success: true, message: OFFER_MESSAGES.MANUAL_OVERRIDE_APPLIED });
    } catch (error) {
        return res.status(STATUS_CODDES.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

export const autoPricing = async (req, res) => {
    try {
        await productService.resetAutoPricing(req.params.productId);
        return res.status(STATUS_CODDES.OK).json({ success: true, message: OFFER_MESSAGES.AUTO_PRICING_ENABLED });
    } catch (error) {
        return res.status(STATUS_CODDES.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};