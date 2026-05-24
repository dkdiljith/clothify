const Cart = require('../models/cartSchema');
const Wishlist = require('../models/wishListSchema'); 
const { verifyProductVariation } = require('../services/productHelper');



async function validateCollections(req, res, next) {
    try {
        if (!req.session || !req.session.user) {
            return next(); 
        }

        const userId = req.session.user._id;
        let warningMessages = [];

        // VALIDATE & CLEAN CART

        const cart = await Cart.findOne({ userId });
        if (cart && cart.items.length > 0) {
            const validCartItems = [];
            const invalidCartProductIds = [];

            for (const item of cart.items) {
                const check = await verifyProductVariation(item.productId, item.variationIndex);
                if (check.isValid) {
                    validCartItems.push(item);
                } else {
                    invalidCartProductIds.push(item.productId);
                }
            }

            // If invalid items were found, wipe them from the database
            if (invalidCartProductIds.length > 0) {
                await Cart.updateOne(
                    { userId },
                    { $pull: { items: { productId: { $in: invalidCartProductIds } } } }
                );
                warningMessages.push("Some unavailable items were removed from your cart.");
            }
        }


        // VALIDATE & CLEAN WISHLIST
        const wishlist = await Wishlist.findOne({ userId });
        if (wishlist && wishlist.items.length > 0) {
            const validWishlistItems = [];
            const invalidWishlistProductIds = [];

            for (const item of wishlist.items) {
                const check = await verifyProductVariation(item.productId, item.variationIndex);
                if (check.isValid) {
                    validWishlistItems.push(item);
                } else {
                    invalidWishlistProductIds.push(item.productId);
                }
            }

            if (invalidWishlistProductIds.length > 0) {
                await Wishlist.updateOne(
                    { userId },
                    { $pull: { items: { productId: { $in: invalidWishlistProductIds } } } }
                );
                warningMessages.push("Some items in your wishlist are no longer available.");
            }
        }

        req.collectionWarning = warningMessages.length > 0 ? warningMessages.join(' ') : null;

        return next(); 

    } catch (error) {
        console.error("Middleware Collection Validation Error:", error);
        next(error);
    }
}

module.exports = validateCollections;