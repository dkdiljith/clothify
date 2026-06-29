const Wishlist = require(`../models/wishListSchema`)
const Product = require(`../models/productSchema`)


const { verifyProductVariation } = require('../services/productHelper');
const addToCart = require(`../controllers/cartController`).addToCart

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

///////////////////////////////////////////////////////////////////////////////////////////////////////////

//wishlistDataIcon
exports.wishlistDataIcon = async (req, res) => {
    try {
        const userId = res.locals.user._id

        const wishlist = await Wishlist.findOne({ userId: userId });

        if (wishlist && wishlist.items) {
            const wishlistCount = wishlist.items.length;
            return res.json({ wishlistCount: wishlistCount });
        } else {
            return res.json({ wishlistCount: 0 });
        }
    } catch (error) {
        console.error("Error fetching wishlist data for icon:", error);
        return res.status(500).json({ error: "Failed to fetch wishlist data" });
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.wishlistRender = async (req, res) => {
    const userId = res.locals.user._id

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 12; // 12 products per page

    try {
        const wishlist = await Wishlist.findOne({ userId: userId }).lean();

        if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
            return res.render('user/wishlist', {
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

        // Get paginated product IDs
        const startIndex = (page - 1) * limit;
        const paginatedProductIds = productIds.slice(startIndex, startIndex + limit);

        const products = await Product.find({ _id: { $in: paginatedProductIds } })
            .select('name images details latestCollection bestSeller') // Include necessary fields for badges
            .lean();

        return res.render('user/wishlist', {
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

    } catch (error) {
        console.error('Error rendering wishlist:', error);
        return res.status(500).render('user/wishlist', {
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
        const variationIndex = parseInt(req.params.variationIndex);

        // Validate that the product and specific variation exist and are active
        const check = await verifyProductVariation(productId, variationIndex);
        if (!check.isValid) {
            return res.status(400).json({
                success: false,
                message: check.message 
            });
        }


        let wishlist = await Wishlist.findOne({ userId: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId: userId, items: [] });
        }

      
        const existingItem = wishlist.items.find(item =>
            item.productId.toString() === productId && item.variationIndex === variationIndex
        );

        if (existingItem) {
            return res.status(200).json({
                success: true,
                message: 'Item is already in your wishlist!'
            });
        }

        wishlist.items.push({
            productId: productId,
            variationIndex: variationIndex,
        });

        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: `Added ${check.product.name} (${check.variation.size}) to wishlist!`
        });

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
};






exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const productId = req.params.id;
        console.log(productId, "this is productId")

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item =>
            !(item.productId.toString() === productId)
        );

        await wishlist.save();

        return res.json({ success: true, message: 'Item removed from wishlist successfully' });

    } catch (error) {
        console.error('Wishlist remove error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};




exports.addToCartFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success:false,
                message:"Product not found"
            });
        }

        // first available variation
        const variationIndex =
            product.details.findIndex(
                detail => detail.quantity > 0
            );

        if (variationIndex === -1){
            return res.status(400).json({
                success:false,
                message:"Out of Stock"
            });
        }

        req.params.variationIndex = variationIndex;
        req.params.quantity = 1;
        return addToCart(req, res);

    }

    catch(err){
        console.error(err);
        return res.status(500).json({
            success:false,
            message:"Server Error"
        });
    }
}