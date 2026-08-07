const Coupon = require(`../models/couponSchema`)
const Cart = require(`../models/cartSchema`)

//update cart
const recalculateCartSummary = require(`../services/recalculateCartSummary`)

//update offer & coupon & products
const pricingExpiry = require("../services/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate

//pagination
const adminPaginationFactory = require(`../utils/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

/////////////////////////////////////////////////////////////////////////////////////////////////
exports.couponRender = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const query = req.query.query || "";
        const couponStatus = req.query.couponStatus || "";
        const filter = {};
        // Search
        if (query) {
            filter.$or = [
                {
                    couponCode: {
                        $regex: query,
                        $options: "i",
                    },
                },
                {
                    discountType: {
                        $regex: query,
                        $options: "i",
                    },
                },
            ];
        }
        // Status Filter
        if (couponStatus === "active") {
            filter.isActive = true;
        }
        if (couponStatus === "expired") {
            filter.isActive = false;
        }
        const [coupon, totalDocuments] = await Promise.all([
            Coupon.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Coupon.countDocuments(filter),
        ]);
        const totalPages = Math.ceil(totalDocuments / limit);
        return res.render("admin/coupon", {
            admin: true,
            coupon,
            query,
            couponStatus,
            pagination: {
                page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                serialNumberStart: skip,
            },
        });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        return res.render("admin/coupon", {
            admin: true,
            coupon: [],
            query: "",
            couponStatus: "",
            pagination: {
                page: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
                nextPage: 2,
                prevPage: 0,
                serialNumberStart: 0,
            },
            errorMessage: "Error fetching coupons.",
        });
    }
};





exports.couponEditJson = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.couponId);
        return res.json(coupon);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}














exports.createCoupon = async (req, res) => {
    try {
        const {
            couponCode,
            discountType,
            discountValue,
            minimumPurchaseAmount,
            maximumPurchaseAmount,
            startDate,
            endDate,
        } = req.body;
        // 1. INPUT VALIDATION
        if (
            !couponCode ||
            !discountType ||
            !discountValue ||
            !startDate ||
            !endDate
        ) {
            return res.status(400).json({
                success: false,
                type: "validation_error",
                message:
                    "Missing required fields: couponCode, discountType, discountValue, startDate, and endDate are required.",
            });
        }
        // 2. LOGICAL NUMERIC VALIDATION
        const minAmt = Number(minimumPurchaseAmount) || 0;
        const maxAmt = Number(maximumPurchaseAmount) || 0;
        if (maxAmt > 0 && minAmt > maxAmt) {
            return res.status(400).json({
                success: false,
                type: "validation_error",
                message:
                    "Maximum purchase amount must be greater than or equal to minimum purchase amount.",
            });
        }
        if (Number(discountValue) <= 0) {
            return res.status(400).json({
                success: false,
                type: "validation_error",
                message: "Discount value must be greater than 0.",
            });
        }
        // 3. DATE VALIDATION
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                type: "validation_error",
                message: "Invalid date format provided.",
            });
        }
        if (start >= end) {
            return res.status(400).json({
                success: false,
                type: "validation_error",
                message: "End date must be after the start date.",
            });
        }
        // 4. DUPLICATE CHECK (Optimized using findOne)
        // Using case-insensitive regex prevents users from creating "SUMMER20" and "summer20"
        const existingCoupon = await Coupon.findOne({
            couponCode: { $regex: new RegExp(`^${couponCode}$`, "i") },
        });
        if (existingCoupon) {
            return res.status(409).json({
                // 409 Conflict is the correct HTTP status for duplicates
                success: false,
                type: "duplicate_error",
                message: `Coupon code '${couponCode}' already exists.`,
            });
        }
        // 5. SAVE DATABASE RECORD
        const newCoupon = new Coupon({
            couponCode: couponCode.toUpperCase().trim(), // Normalize input data
            discountType,
            discountValue: Number(discountValue),
            minimumPurchaseAmount: minAmt,
            maximumPurchaseAmount: maxAmt,
            startDate: start,
            endDate: end,
        });
        const result = await newCoupon.save();
        // Trigger your background utility function
        await pricingExpiryUpdate();
        return res.status(201).json({
            success: true,
            type: "success",
            message: "Coupon created successfully",
            coupon: result,
        });
    } catch (err) {
        console.error("Error creating coupon:", err);
        return res.status(500).json({
            success: false,
            type: "server_error",
            message: "Internal server error occurred while creating the coupon.",
        });
    }
};














exports.couponEdit = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const {
      couponCode,
      discountType,
      discountValue,
      minimumPurchaseAmount,
      maximumPurchaseAmount,
      startDate,
      endDate,
    } = req.body;

    // 1. INPUT VALIDATION
    if (
      !couponCode ||
      !discountType ||
      !discountValue ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        type: "validation_error",
        message: "Missing required fields: couponCode, discountType, discountValue, startDate, and endDate are required.",
      });
    }

    // 2. LOGICAL NUMERIC VALIDATION
    const minAmt = Number(minimumPurchaseAmount) || 0;
    const maxAmt = Number(maximumPurchaseAmount) || 0;

    if (maxAmt > 0 && minAmt > maxAmt) {
      return res.status(400).json({
        success: false,
        type: "validation_error",
        message: "Maximum purchase amount must be greater than or equal to minimum purchase amount.",
      });
    }

    if (Number(discountValue) <= 0) {
      return res.status(400).json({
        success: false,
        type: "validation_error",
        message: "Discount value must be greater than 0.",
      });
    }

    // 3. DATE VALIDATION
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        type: "validation_error",
        message: "Invalid date format provided.",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        type: "validation_error",
        message: "End date must be after the start date.",
      });
    }

    // 4. DUPLICATE CHECK (Excluding current coupon)
    // Prevents renaming to another existing coupon's code (case-insensitive)
    const existingCoupon = await Coupon.findOne({
      couponCode: { $regex: new RegExp(`^${couponCode}$`, "i") },
      _id: { $ne: couponId }, // Exclude the coupon currently being edited
    });

    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        type: "duplicate_error",
        message: `Coupon code '${couponCode}' already exists on another coupon.`,
      });
    }

    // 5. FETCH AND UPDATE DATABASE RECORD
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        type: "not_found_error",
        message: "Coupon not found.",
      });
    }

    // Assign normalized properties
    coupon.couponCode = couponCode.toUpperCase().trim();
    coupon.discountType = discountType;
    coupon.discountValue = Number(discountValue);
    coupon.minimumPurchaseAmount = minAmt;
    coupon.maximumPurchaseAmount = maxAmt;
    coupon.startDate = start;
    coupon.endDate = end;

    // Maintain the active status logic based on dates if needed
    if (end >= new Date()) {
      coupon.isActive = true;
    }

    const result = await coupon.save();

    // Trigger background utility function
    await pricingExpiryUpdate();

    return res.status(200).json({
      success: true,
      type: "success",
      message: "Coupon updated successfully",
      coupon: result,
    });
  } catch (err) {
    console.error("Error updating coupon:", err);
    return res.status(500).json({
      success: false,
      type: "server_error",
      message: "Internal server error occurred while updating the coupon.",
    });
  }
};








exports.couponDelete = async (req, res) => {
    try {
        const { couponId } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        await pricingExpiryUpdate();

        if (deletedCoupon) {
            return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
        } else {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
    } catch (err) {
        console.error('Error deleting coupon:', err);
        return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
}





//USER SIDE IMPLEMENTATION

exports.applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = res.locals.user._id;

        const coupon = await Coupon.findById(couponId);
        if (!coupon || !coupon.isActive || coupon.endDate < new Date()) {
            return res.json({ success: false, message: 'Coupon is not valid' });
        }

        if (coupon.minimumPurchaseAmount > coupon.maximumPurchaseAmount) {
            return res.json({ success: false, message: 'Coupon is not valid' });
        }

        const cart = await Cart.findOne({ userId });

        // Use offerAmount or subtotal depending on your business logic
        if (cart.totalAmount < coupon.minimumPurchaseAmount) {
            return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minimumPurchaseAmount} required` });
        }

        if (cart.totalAmount > coupon.maximumPurchaseAmount) {
            return res.json({ success: false, message: `Maximum purchase limit ₹${coupon.maximumPurchaseAmount} Exceeded` });
        }

        cart.couponId = coupon._id;
        await cart.save();

        // Immediately recalculate so the user sees the change
        await recalculateCartSummary(userId);

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Error applying coupon' });
    }
}


// Remove coupon route
exports.removeCoupon = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const cart = await Cart.findOne({ userId });

        cart.couponId = null;
        cart.couponDiscount = 0;
        await cart.save();

        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Error removing coupon' });
    }
}