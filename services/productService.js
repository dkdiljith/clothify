import Product from '../models/productSchema.js';
import Category from '../models/categorySchema.js';
import Offer from '../models/offerSchema.js';
import Wishlist from '../models/wishListSchema.js';
import Cart from '../models/cartSchema.js';
import path from 'path'; 
import fs from 'fs';

import { pricingExpiryUpdate } from '../utils/pricingExpiry.js';
 

// MESSAGE_CONSTANTS
import PRODUCT_MESSAGES from '../constants/product.js';
import OFFER_MESSAGES from '../constants/offer.js';

// Helper: Fetch grouped categories
async function getGroupedCategories() {
    const categories = await Category.find().lean();
    return categories
        .filter(cat => !cat.parentCategory)
        .map(parent => ({
            ...parent,
            subcategories: categories.filter(sub =>
                sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
            )
        }));
}

// Helper: Image validations & array parse
function validateAndParseSizes(sizeNamesInput, sizeQuantitiesInput, sizePricesInput) {
    let sizeNames = Array.isArray(sizeNamesInput) ? sizeNamesInput : [sizeNamesInput].filter(Boolean);
    let sizeQuantities = Array.isArray(sizeQuantitiesInput) ? sizeQuantitiesInput : [sizeQuantitiesInput].filter(Boolean);
    let sizePrices = Array.isArray(sizePricesInput) ? sizePricesInput : [sizePricesInput].filter(Boolean);

    if (!sizeNames.length || !sizeQuantities.length || !sizePrices.length) {
        throw new Error(PRODUCT_MESSAGES.SIZE_REQUIRED);
    }
    if (new Set(sizeNames).size !== sizeNames.length) {
        throw new Error(PRODUCT_MESSAGES.DUPLICATE_SIZES);
    }

    const details = [];
    for (let i = 0; i < sizeNames.length; i++) {
        const size = sizeNames[i]?.trim();
        const quantity = Number(sizeQuantities[i]);
        const price = Number(sizePrices[i]);

        if (!size) throw new Error(PRODUCT_MESSAGES.INVALID_SIZE);
        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error(PRODUCT_MESSAGES.INVALID_QUANTITY);
        }
        if (!Number.isInteger(price) || price < 200) {
            throw new Error(PRODUCT_MESSAGES.INVALID_PRICE);
        }

        details.push({ size, quantity, price });
    }
    return details;
}

// ---------------------------------------------------------------------------
// SERVICE METHODS
// ---------------------------------------------------------------------------

async function fetchProductsForAdmin(query, status, page, limit) {
    const skip = (page - 1) * limit;
    let filter = {};

    if (query) {
        filter.$or = [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }
    if (status === "active") filter.isActive = true;
    if (status === "blocked") filter.isActive = false;

    const [totalDocuments, products, categories] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
            .setOptions({ showInactive: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Category.find({}).lean(),
    ]);

    products.forEach(product => {
        product.totalStock = product.details.reduce(
            (sum, detail) => sum + (detail.quantity || 0),
            0
        );
    });

    const totalPages = Math.ceil(totalDocuments / limit);
    return { products, categories, totalPages, skip };
}

async function fetchSingleProductDetails(productId, userId) {
    const product = await Product.findById(productId).lean();
    if (!product) return null;

    const categories = await Category.findById(product.categoryId).lean();
    const relatedProducts = await Product.find({
        categoryId: product.categoryId,
        _id: { $ne: product._id }
    }).limit(4).lean();

    const offers = await Offer.find().lean();
    product.isWishlisted = false;
    let isInCart = false;

    if (userId) {
        const wishlist = await Wishlist.findOne({ userId }).lean();
        const cart = await Cart.findOne({ userId }).lean();

        if (wishlist?.items) {
            product.isWishlisted = wishlist.items.some(item =>
                item.productId.toString() === product._id.toString()
            );

            const wishlistSet = new Set(wishlist.items.map(item => item.productId.toString()));
            relatedProducts.forEach(item => {
                item.isWishlisted = wishlistSet.has(item._id.toString());
            });
        }

        if (cart?.items) {
            isInCart = cart.items.some(item =>
                item.productId.toString() === product._id.toString()
            );
        }
    }

    return { product, categories, relatedProducts, offers, isInCart };
}

async function createNewProduct(body, files) {
    let { name, categoryId, description, gender } = body;
    name = name?.trim();
    description = description?.trim();

    const validNameRegex = /^[a-zA-Z0-9\s\-&()']+$/;
    const categoryExists = await Category.findById(categoryId);
    const validGenders = ["Men", "Women", "Unisex"];

    if (!name || name.length < 3 || name.length > 100 || !validNameRegex.test(name)) {
        throw new Error(PRODUCT_MESSAGES.INVALID_NAME);
    }
    if (!categoryId || !categoryExists) {
        throw new Error(PRODUCT_MESSAGES.INVALID_CATEGORY);
    }
    if (!validGenders.includes(gender)) {
        throw new Error("Invalid gender selected.");
    }
    if (!description || description.length < 20 || description.length > 1000) {
        throw new Error(PRODUCT_MESSAGES.DESCRIPTION_REQUIRED);
    }

    const existingProduct = await Product.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingProduct) {
        throw new Error(PRODUCT_MESSAGES.PRODUCT_EXISTS);
    }

    const details = validateAndParseSizes(body.sizeName, body.sizeQuantity, body.sizePrice);

    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!files || files.length === 0) {
        throw new Error(PRODUCT_MESSAGES.IMAGE_REQUIRED);
    }
    if (files.length > 5) {
        throw new Error("Maximum 5 images allowed.");
    }

    for (const file of files) {
        if (!allowedMimeTypes.includes(file.mimetype) || file.size > 10 * 1024 * 1024) {
            throw new Error(PRODUCT_MESSAGES.INVALID_IMAGE_FORMAT);
        }
    }

    const images = files.map((file, index) => ({
        path: "/images/productImages/" + file.filename,
        altText: `${name}-image(${index + 1})`
    }));

    const newProduct = new Product({
        name,
        categoryId,
        details,
        gender,
        description,
        images,
        latestCollection: body.latestCollection === "true",
        bestSeller: body.bestSeller === "true",
    });

    await newProduct.save();
    await pricingExpiryUpdate();
    return newProduct;
}

async function updateExistingProduct(productId, body, files) {
    let { name, categoryId, description, gender } = body;
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found.");

    name = name?.trim();
    description = description?.trim();

    const validNameRegex = /^[a-zA-Z0-9\s\-&()']+$/;
    if (!name || name.length < 3 || name.length > 100 || !validNameRegex.test(name)) {
        throw new Error(PRODUCT_MESSAGES.INVALID_NAME);
    }

    const existingProduct = await Product.findOne({
        _id: { $ne: productId },
        name: { $regex: new RegExp(`^${name}$`, "i") }
    });
    if (existingProduct) {
        throw new Error(PRODUCT_MESSAGES.PRODUCT_EXISTS);
    }

    const categoryExists = await Category.findById(categoryId);
    if (!categoryId || !categoryExists) {
        throw new Error("Valid category is required.");
    }

    const validGenders = ["Men", "Women", "Unisex"];
    if (!validGenders.includes(gender)) {
        throw new Error("Invalid gender selected.");
    }

    if (!description || description.length < 20 || description.length > 1000) {
        throw new Error(PRODUCT_MESSAGES.DESCRIPTION_REQUIRED);
    }

    const details = validateAndParseSizes(body.sizeName, body.sizeQuantity, body.sizePrice);

    // Handle Image Deletions
    let deletedImages = [];
    try {
        deletedImages = JSON.parse(body.deletedImages || "[]");
    } catch {
        deletedImages = [];
    }

    const imagesToDelete = product.images.filter(img => deletedImages.includes(img._id.toString()));
    for (const img of imagesToDelete) {
        const filePath = path.join(__dirname, '..', 'public', img.path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    product.images = product.images.filter(img => !deletedImages.includes(img._id.toString()));

    // Handle New Images
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (files && files.length > 0) {
        for (const file of files) {
            if (!allowedMimeTypes.includes(file.mimetype) || file.size > 10 * 1024 * 1024) {
                throw new Error(PRODUCT_MESSAGES.INVALID_IMAGE_FORMAT);
            }
        }
        if (product.images.length + files.length > 5) {
            throw new Error(PRODUCT_MESSAGES.MAX_IMAGES);
        }
        const newImages = files.map((file, index) => ({
            path: "/images/productImages/" + file.filename,
            altText: `${name}-image(${product.images.length + index + 1})`
        }));
        product.images.push(...newImages);
    }

    if (product.images.length === 0) {
        throw new Error(PRODUCT_MESSAGES.IMAGE_REQUIRED);
    }

    product.name = name;
    product.categoryId = categoryId;
    product.description = description;
    product.gender = gender;
    product.details = details;
    product.latestCollection = body.latestCollection === "true";
    product.bestSeller = body.bestSeller === "true";

    await product.save();
    await pricingExpiryUpdate();
    return product;
}

async function toggleBlockProduct(productId) {
    const product = await Product.findById(productId).setOptions({ showInactive: true });
    if (!product) throw new Error("Product not found.");

    const existingActive = await Product.findOne({ name: product.name, isActive: true }).lean();
    if (!product.isActive && existingActive) {
        throw new Error(PRODUCT_MESSAGES.PRODUCT_EXISTS);
    }

    product.isActive = !product.isActive;
    await product.save();
    return product;
}

async function fetchOffersForProduct(productId) {
    const now = new Date();
    const product = await Product.findById(productId).lean();
    if (!product) throw new Error("Product not found.");

    const offers = await Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [
            { offerType: "product", targetIds: productId },
            { offerType: "subcategory", targetIds: product.categoryId }
        ]
    }).lean();

    return { product, offers };
}

async function applyOfferToProduct(productId, offerId) {
    const now = new Date();
    const product = await Product.findById(productId);
    const offer = await Offer.findById(offerId).lean();

    if (!product) throw new Error(PRODUCT_MESSAGES.VARIATION_NOT_FOUND);
    if (!offer) throw new Error(OFFER_MESSAGES.NOT_FOUND);
    if (!offer.isActive || offer.startDate > now || offer.endDate < now) {
        throw new Error(OFFER_MESSAGES.OFFER_NOT_ACTIVE);
    }

    let targetMatch = false;
    if (offer.offerType === "product") {
        targetMatch = offer.targetIds.some(id => id.toString() === productId);
    }
    if (offer.offerType === "subcategory") {
        targetMatch = offer.targetIds.some(id => id.toString() === product.categoryId.toString());
    }

    if (!targetMatch) {
        throw new Error(OFFER_MESSAGES.VARIANT_APPLY_FAILED);
    }

    let appliedCount = 0;
    product.details.forEach(detail => {
        const originalPrice = detail.price;
        detail.offerId = null;
        detail.offerPrice = 0;
        detail.offerLocked = false;

        let newPrice;
        if (offer.discountType === "percentage") {
            newPrice = originalPrice - (originalPrice * offer.discountValue) / 100;
        } else {
            newPrice = originalPrice - offer.discountValue;
        }

        if (newPrice <= 0 || newPrice < originalPrice * 0.20) return;

        newPrice = Math.round(newPrice);
        detail.offerId = offer._id;
        detail.offerPrice = newPrice;
        detail.offerLocked = true;
        appliedCount++;
    });

    if (appliedCount === 0) {
        throw new Error(OFFER_MESSAGES.VARIANT_APPLY_FAILED);
    }

    await product.save();
    await pricingExpiryUpdate();
}

async function resetAutoPricing(productId) {
    const product = await Product.findById(productId);
    if (!product) throw new Error(PRODUCT_MESSAGES.VARIATION_NOT_FOUND);

    product.details.forEach(detail => {
        detail.offerId = null;
        detail.offerPrice = 0;
        detail.offerLocked = false;
    });

    await product.save();
    await pricingExpiryUpdate();
}

async function getProduct(productId){
    const product = await Product.findById(productId).lean();
    return product
}

export {
    getGroupedCategories,
    fetchProductsForAdmin,
    fetchSingleProductDetails,
    createNewProduct,
    updateExistingProduct,
    toggleBlockProduct,
    fetchOffersForProduct,
    applyOfferToProduct,
    resetAutoPricing,
    getProduct
};