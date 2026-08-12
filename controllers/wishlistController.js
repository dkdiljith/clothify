const Wishlist = require(`../models/wishListSchema`)
const Product = require(`../models/productSchema`)


const { verifyProductVariation } = require('../services/productHelper');
const addToCart = require(`../controllers/cartController`).addToCart

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)

///////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.wishlistRender = async (req, res) => {
    const userId = res.locals.user._id;
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    try {
        const wishlist = await Wishlist.findOne({ userId }).lean();
        if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
            return res.render("user/wishlist", {
                product: [],
                pagination: {
                    page: 1,
                    limit,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            });
        }
        const productIds = wishlist.items.map(item => item.productId);
        const totalProducts = productIds.length;
        const totalPages = Math.ceil(totalProducts / limit);
        // Pagination
        const startIndex = (page - 1) * limit;
        const paginatedProductIds =
            productIds.slice(startIndex, startIndex + limit);
        // Fetch available products
        const foundProducts = await Product.find({
            _id: { $in: paginatedProductIds }
        })
            .select("name images details latestCollection bestSeller")
            .lean();
        // Fast lookup
        const productMap = new Map(
            foundProducts.map(product => [
                product._id.toString(),
                product
            ])
        );
        // Preserve original wishlist order
        const products = paginatedProductIds.map(id => {
            const product = productMap.get(id.toString());
            if (product) {
                product.status = "active";
                return product;
            }
            // Product no longer exists
            return {
                _id: id,
                status: "deleted"
            };
        });
        return res.render("user/wishlist", {
            product: products,
            pagination: {
                page,
                limit,
                totalPages,
                nextPage: page + 1,
                prevPage: page - 1,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    }
    catch {
        return res.status(500).render("user/wishlist", {
            product: [],
            pagination: {
                page: 1,
                limit,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    }
};



exports.addToWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const productId = req.params.id;
        const variationIndex = parseInt(req.params.variationIndex, 10);
        // Validate that the product and specific variation exist and are active
        const check = await verifyProductVariation(productId, variationIndex);
        if (!check.isValid) {
            return res.status(400).json({ success: false, message: check.message });
        }
        let wishlist = await Wishlist.findOne({ userId: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId: userId, items: [] });
        }
        const existingItem = wishlist.items.find(item => 
            item.productId.toString() === productId && 
            item.variationIndex === variationIndex
        );
        // FIX: If the item is already there, return success false, but info true
        if (existingItem) {
            return res.status(200).json({ 
                success: false, 
                info: true, 
                message: 'Item is already in your wishlist!' 
            });
        }
        // Add brand new item configuration cleanly
        wishlist.items.push({
            productId: productId,
            variationIndex: variationIndex,
        });
        await wishlist.save();
        return res.status(200).json({ 
            success: true, 
            message: `Item Added to wishlist!` 
        });
    } catch {
        return res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
};







exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const productId = req.params.id;

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item =>
            !(item.productId.toString() === productId)
        );

        await wishlist.save();

        return res.json({ success: true, message: 'Item removed from wishlist' });

    } catch {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



exports.addToCartFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { productId } = req.params;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        // Find first available variation
        const variationIndex = product.details.findIndex(
            (detail) => detail.quantity > 0,
        );
        if (variationIndex === -1) {
            return res.status(400).json({
                success: false,
                message: "Out of Stock",
            });
        }
        // Remove from wishlist
        await Wishlist.updateOne(
            { userId },
            {
                $pull: {
                    items: {
                        productId: product._id,
                    },
                },
            },
        );
        // Reuse existing addToCart logic
        req.params.variationIndex = variationIndex;
        req.params.quantity = 1;
        return addToCart(req, res);
    } catch {
        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};
