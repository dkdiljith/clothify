const Wishlist = require(`../models/wishListSchema`)
const Product = require(`../models/productSchema`)



///////////////////////////////////////////////////////////////////////////////////////////////////////////

//wishlistDataIcon
exports.wishlistDataIcon = async (req, res) => {
    try {
        const userId = res.locals.user._id

        const wishlist = await Wishlist.findOne({ userId: userId });

        if (wishlist && wishlist.items) {
            const wishlistCount = wishlist.items.length;
            res.json({ wishlistCount: wishlistCount });
        } else {
            res.json({ wishlistCount: 0 });
        }
    } catch (error) {
        console.error("Error fetching wishlist data for icon:", error);
        res.status(500).json({ error: "Failed to fetch wishlist data" });
    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.wishlistRender = async (req, res) => {
    const userId = res.locals.user._id
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 12; // 6 products per page
    
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

        res.render('user/wishlist', { 
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
        res.status(500).render('user/wishlist', { 
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
        const userId = res.locals.user._id
        const productId = req.params.id;
        const variationIndex = parseInt(req.params.variationIndex);
        console.log(productId , "this is productId")

        let wishlist = await Wishlist.findOne({ userId: userId })

        if (!wishlist) {
            wishlist = new Wishlist({ userId: userId, items: [] });
        }

        const existingItem = wishlist.items.find(item =>
            item.productId.toString() === productId && item.variationIndex === variationIndex
        )

        if (existingItem) {
        } else {
            wishlist.items.push({
                productId: productId,
                variationIndex: variationIndex,
            });
            responseData = {
                success: true,
                message: 'Item added to wishlist!',
            };
        }

        await wishlist.save();
        return res.json(responseData);


    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
};






exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const productId = req.params.id;
        console.log(productId , "this is productId")

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        wishlist.items = wishlist.items.filter(item =>
            !(item.productId.toString() === productId)
        );

        await wishlist.save();

        res.json({ success: true, message: 'Item removed from wishlist successfully' });

    } catch (error) {
        console.error('Wishlist remove error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};




