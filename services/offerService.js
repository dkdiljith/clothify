import Offer from '../models/offerSchema.js';
import Product from '../models/productSchema.js';
import Category from '../models/categorySchema.js';
import { pricingExpiryUpdate } from '../utils/pricingExpiry.js'; 


//MESSAGE_CONSTANTS
import OFFER_MESAGES from '../constants/offer.js';
import STATUS_CODES from '../constants/status-codes.js';

//////////////////////////////////////////////////////////////////////////////

export const getFilteredOffers = async (queryData) => {
    const page = parseInt(queryData.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const query = queryData.query || "";
    const offerType = queryData.offerType || "";
    const discountType = queryData.discountType || "";
    const offerStatus = queryData.offerStatus || "";
    const filter = {};

    if (query) {
        filter.$or = [
            { offerCode: { $regex: query, $options: "i" } },
            { offerType: { $regex: query, $options: "i" } },
            { discountType: { $regex: query, $options: "i" } },
        ];
    }

    if (offerType) filter.offerType = offerType;
    if (discountType) filter.discountType = discountType;
    if (offerStatus === "active") filter.isActive = true;
    if (offerStatus === "inactive") filter.isActive = false;

    const [offer, totalDocuments] = await Promise.all([
        Offer.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Offer.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);

    return {
        offer,
        query,
        offerType,
        discountType,
        offerStatus,
        pagination: {
            page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            serialNumberStart: skip,
        },
    };
};

export const validateAndFormatOfferPayload = async (body, excludeId = null) => {
    const { offerCode, offerType, discountType, discountValue, startDate, endDate, targetIds } = body;

    if (!offerCode || !offerType || !discountType || discountValue === undefined || !startDate || !endDate) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.VALIDATION};
    }

    if (!["product", "subcategory"].includes(offerType)) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.INVALID_TYPE };
    }

    if (!["percentage", "price"].includes(discountType)) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.INVALID_DISCOUNT_TYPE };
    }

    const numericDiscount = Number(discountValue);
    if (isNaN(numericDiscount) || numericDiscount < 0) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.INVALID_DISCOUNT_VALUE };
    }

    if (discountType === "percentage" && (numericDiscount <= 0 || numericDiscount > 100)) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.INVALID_PERCENTAGE };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.INVALID_DATES };
    }

    if (start >= end) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.END_DATE_INVALID };
    }

    const cleanCode = offerCode.trim().toUpperCase();
    const query = { offerCode: cleanCode };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const duplicate = await Offer.findOne(query);
    if (duplicate) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.CODE_EXISTS };
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
        throw { status: STATUS_CODES.BAD_REQUEST, message: OFFER_MESAGES.SELECT_TARGET_REQUIRED };
    }

    const cleanedTargetIds = [...new Set(targetIds)];

    return {
        cleanCode,
        offerType,
        discountType,
        numericDiscount,
        start,
        end,
        cleanedTargetIds,
    };
};

export const createOffer = async (body) => {
    const payload = await validateAndFormatOfferPayload(body);

    const offer = new Offer({
        offerCode: payload.cleanCode,
        offerType: payload.offerType,
        discountType: payload.discountType,
        discountValue: payload.numericDiscount,
        targetIds: payload.cleanedTargetIds,
        startDate: payload.start,
        endDate: payload.end,
        isActive: true,
    });

    const savedOffer = await offer.save();
    await pricingExpiryUpdate();
    return savedOffer;
};

export const getOfferById = async (offerId) => {
    return await Offer.findById(offerId);
};

export const getPaginatedSubcategories = async (queryData) => {
    const page = parseInt(queryData.page) || 1;
    const limit = 20;
    const search = queryData.search?.trim() || "";

    const filter = { parentCategory: { $ne: null } };
    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    const subcategories = await Category.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return {
        categories: subcategories,
        pagination: {
            page,
            limit,
            totalPages,
            nextPage: page + 1,
            prevPage: page - 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
        search,
    };
};

export const getPaginatedProducts = async (queryData) => {
    const page = parseInt(queryData.page) || 1;
    const limit = 4;
    const search = queryData.search?.trim() || "";

    let filter = {};
    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return {
        products,
        pagination: {
            page,
            limit,
            totalPages,
            nextPage: page + 1,
            prevPage: page - 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
        search,
    };
};

export const updateOffer = async (offerId, body) => {
    const existingOffer = await Offer.findById(offerId);
    if (!existingOffer) {
        throw { status: STATUS_CODES.NOT_FOUND, message: OFFER_MESAGES.NOT_FOUND};
    }

    const payload = await validateAndFormatOfferPayload(body, offerId);

    existingOffer.offerCode = payload.cleanCode;
    existingOffer.offerType = payload.offerType;
    existingOffer.discountType = payload.discountType;
    existingOffer.discountValue = payload.numericDiscount;
    existingOffer.startDate = payload.start;
    existingOffer.endDate = payload.end;
    existingOffer.targetIds = payload.cleanedTargetIds;

    await existingOffer.save();
    await pricingExpiryUpdate();

    return existingOffer;
};

export const deleteOffer = async (offerId) => {
    const deletedOffer = await Offer.findByIdAndDelete(offerId);
    if (!deletedOffer) {
        throw { status: STATUS_CODES.NOT_FOUND, message: OFFER_MESAGES.NOT_FOUND };
    }
    await pricingExpiryUpdate();
    return deletedOffer;
};