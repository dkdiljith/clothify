const Cart = require(`../models/cartSchema`)
const Wishlist = require(`../models/wishListSchema`)



async function loadHeaderBadges(req, res, next) {
    try {

        if (res.locals.user) {
            const cart = await Cart.findOne({ userId: res.locals.user._id }).lean();
            const wishlist = await Wishlist.findOne({ userId: res.locals.user._id }).lean();

            res.locals.user.cartCount = cart ? cart.items.length : 0;
            res.locals.user.wishlistCount = wishlist ? wishlist.items.length : 0;
        }

        next();
    } catch {

        if (res.locals.user) {
            res.locals.user.cartCount = 0;
            res.locals.user.wishlistCount = 0;
        }
        next();
    }
}



module.exports = loadHeaderBadges 