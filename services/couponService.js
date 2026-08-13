const Coupon = require(`../models/couponSchema`);
const Cart = require(`../models/cartSchema`);

//update cart
const recalculateCartSummary = require(`../utils/recalculateCartSummary`);

//update offer & coupon & products
const pricingExpiry = require("../utils/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate;

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)
/////////////////////////////////////////////////////////////////////////////////////////////////



exports.getCouponsWithPagination = async (
  query,
  couponStatus,
  page = 1,
  limit = 5,
) => {
  const skip = (page - 1) * limit;
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
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(totalDocuments / limit);
  return {
    coupon,
    totalPages,
    skip,
  };
};
exports.getCouponById = async (couponId) => {
  const coupon = await Coupon.findById(couponId).lean();
  return coupon;
};
exports.createNewCoupon = async (couponData) => {
  const {
    couponCode,
    discountType,
    discountValue,
    minimumPurchaseAmount,
    maximumPurchaseAmount,
    startDate,
    endDate,
  } = couponData;
  // 1. INPUT VALIDATION
  if (
    !couponCode ||
    !discountType ||
    !discountValue ||
    !startDate ||
    !endDate
  ) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message:
        "Missing required fields: couponCode, discountType, discountValue, startDate, and endDate are required.",
    };
  }
  // 2. LOGICAL NUMERIC VALIDATION
  const minAmt = Number(minimumPurchaseAmount) || 0;
  const maxAmt = Number(maximumPurchaseAmount) || 0;
  if (maxAmt > 0 && minAmt > maxAmt) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message:
        "Maximum purchase amount must be greater than or equal to minimum purchase amount.",
    };
  }
  if (Number(discountValue) <= 0) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message: "Discount value must be greater than 0.",
    };
  }
  // 3. DATE VALIDATION
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message: "Invalid date format provided.",
    };
  }
  if (start >= end) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message: "End date must be after the start date.",
    };
  }
  // 4. DUPLICATE CHECK
  const existingCoupon = await Coupon.findOne({
    couponCode: { $regex: new RegExp(`^${couponCode}$`, "i") },
  }).lean();
  if (existingCoupon) {
    return {
      success: false,
      status: 409,
      type: "duplicate_error",
      message: `Coupon code '${couponCode}' already exists.`,
    };
  }
  // 5. SAVE DATABASE RECORD
  const newCoupon = new Coupon({
    couponCode: couponCode.toUpperCase().trim(),
    discountType,
    discountValue: Number(discountValue),
    minimumPurchaseAmount: minAmt,
    maximumPurchaseAmount: maxAmt,
    startDate: start,
    endDate: end,
  });
  const result = await newCoupon.save();
  // Trigger background utility function
  await pricingExpiryUpdate();
  return {
    success: true,
    status: 201,
    type: "success",
    message: "Coupon created successfully",
    coupon: result,
  };
};





exports.updateCoupon = async (couponId, couponData) => {
  const {
    couponCode,
    discountType,
    discountValue,
    minimumPurchaseAmount,
    maximumPurchaseAmount,
    startDate,
    endDate,
  } = couponData;
  // 1. INPUT VALIDATION
  if (
    !couponCode ||
    !discountType ||
    !discountValue ||
    !startDate ||
    !endDate
  ) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message:
        "Missing required fields: couponCode, discountType, discountValue, startDate, and endDate are required.",
    };
  }
  // 2. LOGICAL NUMERIC VALIDATION
  const minAmt = Number(minimumPurchaseAmount) || 0;
  const maxAmt = Number(maximumPurchaseAmount) || 0;
  if (maxAmt > 0 && minAmt > maxAmt) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message:
        "Maximum purchase amount must be greater than or equal to minimum purchase amount.",
    };
  }
  if (Number(discountValue) <= 0) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message: "Discount value must be greater than 0.",
    };
  }
  // 3. DATE VALIDATION
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message: "Invalid date format provided.",
    };
  }
  if (start >= end) {
    return {
      success: false,
      status: 400,
      type: "validation_error",
      message: "End date must be after the start date.",
    };
  }
  // 4. DUPLICATE CHECK (Excluding current coupon)
  const existingCoupon = await Coupon.findOne({
    couponCode: { $regex: new RegExp(`^${couponCode}$`, "i") },
    _id: { $ne: couponId },
  }).lean();
  if (existingCoupon) {
    return {
      success: false,
      status: 409,
      type: "duplicate_error",
      message: `Coupon code '${couponCode}' already exists on another coupon.`,
    };
  }
  // 5. FETCH AND UPDATE DATABASE RECORD
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return {
      success: false,
      status: 404,
      type: "not_found_error",
      message: "Coupon not found.",
    };
  }
  // Assign normalized properties
  coupon.couponCode = couponCode.toUpperCase().trim();
  coupon.discountType = discountType;
  coupon.discountValue = Number(discountValue);
  coupon.minimumPurchaseAmount = minAmt;
  coupon.maximumPurchaseAmount = maxAmt;
  coupon.startDate = start;
  coupon.endDate = end;
  if (end >= new Date()) {
    coupon.isActive = true;
  }
  const result = await coupon.save();
  // Trigger background utility function
  await pricingExpiryUpdate();
  return {
    success: true,
    status: 200,
    type: "success",
    message: "Coupon updated successfully",
    coupon: result,
  };
};





exports.deleteCoupon = async (couponId) => {
  const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
  await pricingExpiryUpdate();
  if (!deletedCoupon) {
    return { success: false, status: 404, message: "Coupon not found" };
  }
  return { success: true, status: 200, message: "Coupon deleted successfully" };
};




exports.applyCouponToCart = async (userId, couponId) => {
  const coupon = await Coupon.findById(couponId).lean();
  if (!coupon || !coupon.isActive || new Date(coupon.endDate) < new Date()) {
    return { success: false, status: 200, message: "Coupon is not valid" };
  }
  if (coupon.minimumPurchaseAmount > coupon.maximumPurchaseAmount) {
    return { success: false, status: 200, message: "Coupon is not valid" };
  }
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, status: 404, message: "Cart not found" };
  }
  if (cart.totalAmount < coupon.minimumPurchaseAmount) {
    return {
      success: false,
      status: 200,
      message: `Minimum purchase of ₹${coupon.minimumPurchaseAmount} required`,
    };
  }
  if (
    coupon.maximumPurchaseAmount > 0 &&
    cart.totalAmount > coupon.maximumPurchaseAmount
  ) {
    return {
      success: false,
      status: 200,
      message: `Maximum purchase limit ₹${coupon.maximumPurchaseAmount} Exceeded`,
    };
  }
  cart.couponId = coupon._id;
  await cart.save();
  // Immediately recalculate so the user sees the change
  await recalculateCartSummary(userId);
  return { success: true, status: 200 };
};




exports.removeCouponFromCart = async (userId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, status: 404, message: "Cart not found" };
  }
  cart.couponId = null;
  cart.couponDiscount = 0;
  await cart.save();
  return { success: true, status: 200 };
};
