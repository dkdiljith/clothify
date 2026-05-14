const Offer = require(`../models/offerSchema`)
const Product = require(`../models/productSchema`)
const Category = require(`../models/categorySchema`)

//update offer & coupon & products
const pricingExpiry = require("../services/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate

//pagination
const adminPaginationFactory = require(`../utils/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)


///////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.offerRender = async (req, res) => {
   try {

        const page = parseInt(req.query.page) || 1;
        const query = req.query.query || '';
        const result = await adminPaginationFactory({
            page,
            limit: 5,
            query,
            type: 'offer'
        });
        return res.render('admin/offer', {
            admin: true,
            ...result
        });

    } catch (error) {

        console.error("Error fetching offers:", error);
        return res.render('admin/offer', {
            admin: true,
            offer: [],
            query: '',
            pagination: {
                page: 1,
                limit: 5,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                serialNumberStart: 0
            },
            errorMessage: "Error fetching offers. Please try again later."
        });
    }
};





exports.createOffer = async (req, res) => {
    try {
        const {
            offerCode,
            offerType,
            discountType,
            discountValue,
            startDate,
            endDate,
            targetIds
        } = req.body;

        // ===============================
        // 1. REQUIRED FIELD VALIDATION
        // ===============================
        if (
            !offerCode ||
            !offerType ||
            !discountType ||
            discountValue === undefined ||
            !startDate ||
            !endDate
        ) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "All required fields must be filled"
            });
        }

        // ===============================
        // 2. OFFER TYPE VALIDATION
        // ===============================
        if (!["product", "subcategory"].includes(offerType)) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Invalid offer type"
            });
        }

        // ===============================
        // 3. DISCOUNT TYPE VALIDATION
        // ===============================
        if (!["percentage", "price"].includes(discountType)) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Invalid discount type"
            });
        }

        const numericDiscount = Number(discountValue);

        if (isNaN(numericDiscount) || numericDiscount < 0) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Invalid discount value"
            });
        }

        if (
            discountType === "percentage" &&
            (numericDiscount <= 0 || numericDiscount > 100)
        ) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Percentage must be between 1 and 100"
            });
        }

        // ===============================
        // 4. DATE VALIDATION
        // ===============================
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Invalid dates"
            });
        }

        if (start >= end) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "End date must be after start date"
            });
        }

        // ===============================
        // 5. DUPLICATE OFFER CODE CHECK
        // ===============================
        const cleanCode = offerCode.trim().toUpperCase();

        const existingOffer = await Offer.findOne({
            offerCode: cleanCode
        });

        if (existingOffer) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Offer code already exists"
            });
        }

        // ===============================
        // 6. TARGET IDS VALIDATION
        // ===============================
        if (!Array.isArray(targetIds) || targetIds.length === 0) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Please select at least one item"
            });
        }

        // remove duplicates
        const cleanedTargetIds = [...new Set(targetIds)];

        // ===============================
        // 7. CREATE OFFER
        // ===============================
        const offer = new Offer({
            offerCode: cleanCode,
            offerType,
            discountType,
            discountValue: numericDiscount,

            targetIds: cleanedTargetIds,

            startDate: start,
            endDate: end,

            isActive: true
        });

        const savedOffer = await offer.save();
        await pricingExpiryUpdate();

        return res.status(201).json({
            success: true,
            type: "success",
            message: "Offer created successfully",
            offer: savedOffer
        });

    } catch (err) {
        console.error("Create Offer Error:", err);

        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message
        });
    }
};



exports.offerEditJson = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.offerId);
        return res.json(offer);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

exports.totalListOfCategories = async (req, res) => {
    try {
        // ===============================
        // 1. QUERY PARAMS
        // ===============================
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const search = req.query.search?.trim() || "";

        // ===============================
        // 2. BASE FILTER
        // only sub-categories
        // ===============================
        let filter = {
            parentCategory: { $ne: null }
        };

        // ===============================
        // 3. SEARCH FILTER
        // ===============================
        if (search) {
            filter.name = {
                $regex: search,
                $options: "i"
            };
        }

        // ===============================
        // 4. COUNT FILTERED RESULTS
        // ===============================
        const totalCategories =
            await Category.countDocuments(filter);

        const totalPages =
            Math.ceil(totalCategories / limit);

        // ===============================
        // 5. FETCH PAGINATED DATA
        // ===============================
        const subcategories =
            await Category.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

        // ===============================
        // 6. RESPONSE
        // ===============================
        return res.json({
            categories: subcategories,

            pagination: {
                page,
                limit,
                totalPages,
                nextPage: page + 1,
                prevPage: page - 1,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },

            search
        });

    } catch (err) {
        return res.status(500).json({
            error: err.message
        });
    }
};

exports.totalListOfProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const search = req.query.search?.trim() || "";

        let filter = {};

        if (search) {
            filter.name = {
                $regex: search,
                $options: "i"
            };
        }

        // Count ONLY matched products
        const totalProducts =
            await Product.countDocuments(filter);

        const totalPages =
            Math.ceil(totalProducts / limit);

        // Get matched products with pagination
        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.json({
            products,

            pagination: {
                page,
                limit,
                totalPages,
                nextPage: page + 1,
                prevPage: page - 1,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },

            search
        });

    } catch (err) {
        return res.status(500).json({
            error: err.message
        });
    }
};



exports.editOffer = async (req, res) => {
    try {
        const { offerId } = req.params;

        const {
            offerCode,
            offerType,
            discountType,
            discountValue,
            startDate,
            endDate,
            targetIds
        } = req.body;

        // ===============================
        // 1. FIND OFFER
        // ===============================
        const existingOffer = await Offer.findById(offerId);

        if (!existingOffer) {
            return res.status(404).json({
                success: false,
                type: "error",
                message: "Offer not found"
            });
        }

        // ===============================
        // 2. DUPLICATE CODE CHECK
        // ===============================
        const cleanCode = offerCode.trim().toUpperCase();

        const duplicate = await Offer.findOne({
            offerCode: cleanCode,
            _id: { $ne: offerId }
        });

        if (duplicate) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Offer code already exists"
            });
        }

        // ===============================
        // 3. VALIDATIONS
        // ===============================
        if (!["product", "subcategory"].includes(offerType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid offer type"
            });
        }

        if (!["percentage", "price"].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount type"
            });
        }

        const numericDiscount = Number(discountValue);

        if (isNaN(numericDiscount) || numericDiscount < 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount value"
            });
        }

        if (
            discountType === "percentage" &&
            (numericDiscount <= 0 || numericDiscount > 100)
        ) {
            return res.status(400).json({
                success: false,
                message: "Percentage must be between 1 and 100"
            });
        }

        if (!Array.isArray(targetIds) || targetIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one target"
            });
        }

        // ===============================
        // 4. UPDATE FIELDS
        // ===============================
        existingOffer.offerCode = cleanCode;
        existingOffer.offerType = offerType;
        existingOffer.discountType = discountType;
        existingOffer.discountValue = numericDiscount;
        existingOffer.startDate = new Date(startDate);
        existingOffer.endDate = new Date(endDate);
        existingOffer.targetIds = [...new Set(targetIds)];

        // ===============================
        // 5. SAVE
        // ===============================
        await existingOffer.save();
        await pricingExpiryUpdate();

        return res.status(200).json({
            success: true,
            type: "success",
            message: "Offer updated successfully",
            offer: existingOffer
        });

    } catch (err) {
        console.error("Edit Offer Error:", err);

        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error",
            error: err.message
        });
    }
};





exports.offerDelete = async (req, res) => {
    try {
        const { offerId } = req.params;
        console.log("this is offerId :", offerId)

        // delete the offer
        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if (!deletedOffer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        await pricingExpiryUpdate();


        return res.status(200).json({
            success: true,
            message: 'Offer deleted successfully',
        });

    } catch (err) {
        console.error('Error deleting offer:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
};
