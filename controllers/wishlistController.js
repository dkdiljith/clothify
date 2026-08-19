// controllers/wishlistController.js
const wishlistService = require("../services/wishlistService");
const addToCart = require("../controllers/cartController").addToCart;
const STATUS_CODES = require("../constants/status-codes");
const WISHLIST_MESSAGES = require("../constants/wishlist");

exports.wishlistRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = 12;

        const { products, pagination } = await wishlistService.fetchUserWishlist(userId, page, limit);

        return res.status(STATUS_CODES.OK).render("user/wishlist", {
            product: products,
            pagination
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("user/wishlist", {
            product: [],
            pagination: { page: 1, limit: 12, totalPages: 1, hasNextPage: false, hasPrevPage: false }
        });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const productId = req.params.id;
        const variationIndex = parseInt(req.params.variationIndex, 10);

        await wishlistService.addItemToWishlist(userId, productId, variationIndex);

        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: WISHLIST_MESSAGES.ITEM_ADDED 
        });
    } catch (error) {
        if (error.isInfo) {
            return res.status(STATUS_CODES.OK).json({ 
                success: false, 
                info: true, 
                message: error.message 
            });
        }
        return res.status(STATUS_CODES.BAD_REQUEST).json({ 
            success: false, 
            message: error.message || WISHLIST_MESSAGES.DEFAULT_ERROR 
        });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const productId = req.params.id;

        await wishlistService.removeItemFromWishlist(userId, productId);

        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: WISHLIST_MESSAGES.ITEM_REMOVED 
        });
    } catch (error) {
        const statusCode = error.message === WISHLIST_MESSAGES.NOT_FOUND ? STATUS_CODES.NOT_FOUND : STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(statusCode).json({ 
            success: false, 
            message: error.message || WISHLIST_MESSAGES.SERVER_ERROR 
        });
    }
};

exports.addToCartFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { productId } = req.params;

        const variationIndex = await wishlistService.getFirstAvailableVariationForWishlist(userId, productId);

        // Reuse existing addToCart logic
        req.params.variationIndex = variationIndex;
        req.params.quantity = 1;
        return addToCart(req, res);
    } catch (error) {
        let statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR;
        
        if (error.message === WISHLIST_MESSAGES.PRODUCT_NOT_FOUND) {
            statusCode = STATUS_CODES.NOT_FOUND;
        } else if (error.message === WISHLIST_MESSAGES.OUT_OF_STOCK) {
            statusCode = STATUS_CODES.BAD_REQUEST;
        }

        return res.status(statusCode).json({
            success: false,
            message: error.message || WISHLIST_MESSAGES.SERVER_ERROR,
        });
    }
};