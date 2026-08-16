const wishlistService = require("../services/wishlistService");
const addToCart = require("../controllers/cartController").addToCart

exports.wishlistRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = 12;

        const { products, pagination } = await wishlistService.fetchUserWishlist(userId, page, limit);

        return res.render("user/wishlist", {
            product: products,
            pagination
        });
    } catch {
        return res.status(500).render("user/wishlist", {
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

        return res.status(200).json({ 
            success: true, 
            message: 'Item Added to wishlist!' 
        });
    } catch (error) {
        if (error.isInfo) {
            return res.status(200).json({ 
                success: false, 
                info: true, 
                message: error.message 
            });
        }
        return res.status(400).json({ 
            success: false, 
            message: error.message || 'An error occurred. Please try again later.' 
        });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const productId = req.params.id;

        await wishlistService.removeItemFromWishlist(userId, productId);

        return res.status(200).json({ success: true, message: 'Item removed from wishlist' });
    } catch (error) {
        const statusCode = error.message === 'Wishlist not found' ? 404 : 500;
        return res.status(statusCode).json({ success: false, message: error.message || 'Internal server error' });
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
        const statusCode = error.message === "Product not found" ? 404 : error.message === "Out of Stock" ? 400 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Server Error",
        });
    }
};