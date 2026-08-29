import Wishlist from '../models/wishListSchema.js';
import Product from '../models/productSchema.js';
import { verifyProductVariation } from '../utils/productHelper.js';
import WISHLIST_MESSAGES from '../constants/wishlist.js';

async function fetchUserWishlist(userId, page, limit = 12) {
    const wishlist = await Wishlist.findOne({ userId }).lean();
    
    if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
        return {
            products: [],
            pagination: { page: 1, limit, totalPages: 1, hasNextPage: false, hasPrevPage: false }
        };
    }

    const productIds = wishlist.items.map(item => item.productId);
    const totalProducts = productIds.length;
    const totalPages = Math.ceil(totalProducts / limit);
    
    const startIndex = (page - 1) * limit;
    const paginatedProductIds = productIds.slice(startIndex, startIndex + limit);

    const foundProducts = await Product.find({
        _id: { $in: paginatedProductIds }
    })
        .select("name images details latestCollection bestSeller")
        .lean();

    const productMap = new Map(
        foundProducts.map(product => [product._id.toString(), product])
    );

    const products = paginatedProductIds.map(id => {
        const product = productMap.get(id.toString());
        if (product) {
            product.status = "active";
            return product;
        }
        return { _id: id, status: "deleted" };
    });

    return {
        products,
        pagination: {
            page,
            limit,
            totalPages,
            nextPage: page + 1,
            prevPage: page - 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
}

async function addItemToWishlist(userId, productId, variationIndex) {
    const check = await verifyProductVariation(productId, variationIndex);
    if (!check.isValid) {
        throw new Error(check.message);
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
        wishlist = new Wishlist({ userId, items: [] });
    }

    const existingItem = wishlist.items.find(item => 
        item.productId.toString() === productId && 
        item.variationIndex === variationIndex
    );

    if (existingItem) {
        const error = new Error(WISHLIST_MESSAGES.ITEM_ALREADY_EXISTS);
        error.isInfo = true; // Flag to handle custom response status/code
        throw error;
    }

    wishlist.items.push({ productId, variationIndex });
    await wishlist.save();
}

async function removeItemFromWishlist(userId, productId) {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
        throw new Error(WISHLIST_MESSAGES.NOT_FOUND);
    }

    wishlist.items = wishlist.items.filter(item => !(item.productId.toString() === productId));
    await wishlist.save();
}

async function getFirstAvailableVariationForWishlist(userId, productId) {
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error(WISHLIST_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const variationIndex = product.details.findIndex(detail => detail.quantity > 0);
    if (variationIndex === -1) {
        throw new Error(WISHLIST_MESSAGES.OUT_OF_STOCK);
    }

    await Wishlist.updateOne(
        { userId },
        { $pull: { items: { productId: product._id } } }
    );

    return variationIndex;
}

export {
    fetchUserWishlist,
    addItemToWishlist,
    removeItemFromWishlist,
    getFirstAvailableVariationForWishlist
};