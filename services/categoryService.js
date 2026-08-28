import Category from '../models/categorySchema.js';
import Offer from '../models/offerSchema.js';
import Product from '../models/productSchema.js';


//update offer & coupon & products
import pricingExpiry from '../utils/pricingExpiry.js';
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate;


//MESSAGE_CONSTANTS
import CATEGORY_MESSAGE from '../constants/category.js';
import OFFER_MESSAGES from '../constants/offer.js';
import STATUS_CODES from '../constants/status-codes.js';

///////////////////////////////////////////////////////////////////////////////////////


exports.getAllCategories = async () => {
    const categories = await Category.find().lean();
    return categories;
};



exports.getCategoryEditData = async (parentId) => {
    const parentCategory = await Category.findById(parentId).lean();
    if (!parentCategory) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message: CATEGORY_MESSAGE.PARENT_NOT_FOUND };
    }
    const subcategories = await Category.find({
        parentCategory: parentCategory._id
    }).lean();
    const offers = await Offer.find(
        {},
        { _id: 1, offerCode: 1 }
    ).lean();
    const offerMap = {};
    offers.forEach(item => {
        offerMap[item._id.toString()] = item.offerCode;
    });
    const productCounts = await Product.aggregate([
        {
            $match: {
                categoryId: { $in: subcategories.map(item => item._id) }
            }
        },
        {
            $group: {
                _id: "$categoryId",
                count: { $sum: 1 }
            }
        }
    ]);
    const countMap = {};
    productCounts.forEach(item => {
        countMap[item._id.toString()] = item.count;
    });
    const updatedSubcategories = subcategories.map(item => ({
        ...item,
        productCount: countMap[item._id.toString()] || 0,
        offerCode: item.offerId
            ? offerMap[item.offerId.toString()] || ""
            : ""
    }));
    return {
        success: true,
        data: {
            parentCategory,
            subcategories: updatedSubcategories
        }
    };
};



exports.createCategory = async (name, parentCategory) => {
    const formattedName = name
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    const existingCategory = await Category.findOne({ name: formattedName }).lean();
    if (existingCategory) {
        return { success: false, status: STATUS_CODES.BAD_REQUEST, message:CATEGORY_MESSAGE.CATEGORY_ALREADY_EXISTS };
    }
    const newCategory = new Category({
        name: formattedName,
        parentCategory: parentCategory || null
    });
    await newCategory.save();
    return { success: true, status: STATUS_CODES.CREATED, message: CATEGORY_MESSAGE.CATEGORY };
};



exports.removeCategory = async (categoryId) => {
    const category = await Category.findById(categoryId).lean();
    if (!category) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message: CATEGORY_MESSAGE.CATEGORY_NOT_FOUND };
    }
    if (category.parentCategory == null) {
        // Find subcategories using .lean()
        const subcategories = await Category.find({ parentCategory: category._id }).lean();
        // Collect IDs to delete
        const deleteCategories = [category._id, ...subcategories.map(sub => sub._id)];
        // Delete all categories
        await Promise.all(deleteCategories.map(id => Category.findByIdAndDelete(id)));
        return { success: true, status: STATUS_CODES.OK, message: CATEGORY_MESSAGE.DELETED };
    } else {
        await Category.findByIdAndDelete(categoryId);
        return { success: true, status: STATUS_CODES.OK, message: CATEGORY_MESSAGE.SUBCATEGORY_DELETED };
    }
};




exports.updateCategory = async (categoryId, name, newSubcategory) => {
    // 1. Update name if provided
    if (name) {
        await Category.findByIdAndUpdate(categoryId, {
            name: name.trim(),
            updatedAt: new Date()
        });
    }
    // 2. Add new subcategory if provided
    if (newSubcategory && newSubcategory.trim().length > 0) {
        const trimmedSubcategory = newSubcategory.trim();
        const existingCategory = await Category.findOne({ name: trimmedSubcategory }).lean();
        if (existingCategory) {
            return { success: false, status: STATUS_CODES.BAD_REQUEST, message: CATEGORY_MESSAGE.CATEGORY_ALREADY_EXISTS };
        }
        await Category.create({
            name: trimmedSubcategory,
            parentCategory: categoryId,
        });
    }
    return { success: true, status: STATUS_CODES.OK, message:CATEGORY_MESSAGE.UPDATED };
};




exports.getOfferRenderData = async (categoryId) => {
    const now = new Date();
    const category = await Category.findById(categoryId).lean();
    if (!category) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message: CATEGORY_MESSAGE.CATEGORY_NOT_FOUND};
    }
    const offers = await Offer.find({
        offerType: "subcategory",
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        targetIds: categoryId
    }).lean();
    return {
        success: true,
        status: STATUS_CODES.OK,
        data: {
            category,
            offers
        }
    };
};




exports.applyCategoryOffer = async (categoryId, offerId) => {
    const now = new Date();
    const category = await Category.findById(categoryId);
    const offer = await Offer.findById(offerId).lean();
    const products = await Product.find({ categoryId });
    if (!category) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message: CATEGORY_MESSAGE.CATEGORY_NOT_FOUND };
    }
    if (!offer) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message:  OFFER_MESSAGES.NOT_FOUND};
    }
    if (!offer.isActive || offer.startDate > now || offer.endDate < now) {
        return { success: false, status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESSAGES.OFFER_NOT_ACTIVE };
    }
    if (offer.offerType !== "subcategory") {
        return { success: false, status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESSAGES.INVALID_SUBCATEGORY_OFFER };
    }
    const targetMatch = offer.targetIds.some(item => item.toString() === categoryId);
    if (!targetMatch) {
        return { success: false, status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESSAGES.SUBCATEGORY_MISMATCH };
    }
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
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
            if (newPrice <= 0) return;
            if (newPrice < originalPrice * 0.20) return;
            newPrice = Math.round(newPrice);
            detail.offerId = offer._id;
            detail.offerPrice = newPrice;
            detail.offerLocked = true;
        });
        await product.save();
    }
    category.offerId = null;
    category.offerLocked = false;
    category.offerId = offer._id;
    category.offerLocked = true;
    await category.save();
    await pricingExpiryUpdate();
    return { success: true, status: STATUS_CODES.OK, message: CATEGORY_MESSAGE.MANUAL_OFFER_APPLED };
};





exports.resetCategoryPricing = async (categoryId) => {
    const category = await Category.findById(categoryId);
    const products = await Product.find({ categoryId });
    if (!category) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message:CATEGORY_MESSAGE.CATEGORY_NOT_FOUND };
    }
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        product.details.forEach(detail => {
            detail.offerId = null;
            detail.offerPrice = 0;
            detail.offerLocked = false;
        });
        await product.save();
    }
    category.offerId = null;
    category.offerLocked = false;
    await category.save();
    await pricingExpiryUpdate();
    return { success: true, status: STATUS_CODES.OK, message: CATEGORY_MESSAGE.AUTOMATIC_OFFER_APPLIED };
};