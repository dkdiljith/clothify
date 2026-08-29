import Coupon from '../models/couponSchema.js';
import Cart from '../models/cartSchema.js';

//update cart
import recalculateCartSummary from '../utils/recalculateCartSummary.js';

//update offer & coupon & products
import { pricingExpiryUpdate } from '../utils/pricingExpiry.js';

//MESSAGE_CONSTANTS
import COUPON_MESSAGES from '../constants/coupon.js';
import CART_MESSAGES from '../constants/cart.js';
import STATUS_CODES from '../constants/status-codes.js';

/////////////////////////////////////////////////////////////////////////////////////////////////



export const getCouponsWithPagination = async (
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
export const getCouponById = async (couponId) => {
  const coupon = await Coupon.findById(couponId).lean();
  return coupon;
};
export const createNewCoupon = async (couponData) => {
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
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message:
        COUPON_MESSAGES.VALIDATION,
    };
  }
  // 2. LOGICAL NUMERIC VALIDATION
  const minAmt = Number(minimumPurchaseAmount) || 0;
  const maxAmt = Number(maximumPurchaseAmount) || 0;
  if (maxAmt > 0 && minAmt > maxAmt) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message:
        COUPON_MESSAGES.MAXIMUM_VALIDATION,
    };
  }
  if (Number(discountValue) <= 0) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message: COUPON_MESSAGES.DISCOUNT_VALIDATION,
    };
  }
  // 3. DATE VALIDATION
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message: COUPON_MESSAGES.STARTDATE_VALIDATION,
    };
  }
  if (start >= end) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message:COUPON_MESSAGES.ENDDATE_VALIDATION ,
    };
  }
  // 4. DUPLICATE CHECK
  const existingCoupon = await Coupon.findOne({
    couponCode: { $regex: new RegExp(`^${couponCode}$`, "i") },
  }).lean();
  if (existingCoupon) {
    return {
      success: false,
      status: STATUS_CODES.CONFLICT,
      type: "duplicate_error",
      message: COUPON_MESSAGES.COUPON_EXIST(couponCode),
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
    status: STATUS_CODES.CREATED,
    type: "success",
    message: COUPON_MESSAGES.CREATED,
    coupon: result,
  };
};





export const updateCoupon = async (couponId, couponData) => {
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
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message:
        COUPON_MESSAGES.VALIDATION,
    };
  }
  // 2. LOGICAL NUMERIC VALIDATION
  const minAmt = Number(minimumPurchaseAmount) || 0;
  const maxAmt = Number(maximumPurchaseAmount) || 0;
  if (maxAmt > 0 && minAmt > maxAmt) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message:
        COUPON_MESSAGES.MAXIMUM_VALIDATION,
    };
  }
  if (Number(discountValue) <= 0) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message:COUPON_MESSAGES.DISCOUNT_VALIDATION,
    };
  }
  // 3. DATE VALIDATION
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message: COUPON_MESSAGES.STARTDATE_VALIDATION,
    };
  }
  if (start >= end) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      type: "validation_error",
      message: COUPON_MESSAGES.ENDDATE_VALIDATION,
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
      status: STATUS_CODES.CONFLICT,
      type: "duplicate_error",
      message: COUPON_MESSAGES.COUPON_EXIST(couponCode),
    };
  }
  // 5. FETCH AND UPDATE DATABASE RECORD
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return {
      success: false,
      status: STATUS_CODES.NOT_FOUND,
      type: "not_found_error",
      message:COUPON_MESSAGES.NOT_FOUND,
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
    status: STATUS_CODES.OK,
    type: "success",
    message: COUPON_MESSAGES.UPDATED,
    coupon: result,
  };
};





export const deleteCoupon = async (couponId) => {
  const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
  await pricingExpiryUpdate();
  if (!deletedCoupon) {
    return { success: false, status: STATUS_CODES.NOT_FOUND, message:COUPON_MESSAGES.NOT_FOUND };
  }
  return { success: true, status: STATUS_CODES.OK, message: COUPON_MESSAGES.DELETED};
};




export const applyCouponToCart = async (userId, couponId) => {
  const coupon = await Coupon.findById(couponId).lean();
  if (!coupon || !coupon.isActive || new Date(coupon.endDate) < new Date()) {
    return { success: false, status: STATUS_CODES.BAD_REQUEST, message: COUPON_MESSAGES.INVALID };
  }
  if (coupon.minimumPurchaseAmount > coupon.maximumPurchaseAmount) {
    return { success: false, status: STATUS_CODES.BAD_REQUEST, message: COUPON_MESSAGES.INVALID };
  }
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, status: STATUS_CODES.NOT_FOUND, message: CART_MESSAGES.CART_NOT_FOUND };
  }
  if (cart.totalAmount < coupon.minimumPurchaseAmount) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      message: COUPON_MESSAGES.MIN_PURCHASE_REQUIRED(coupon.minimumPurchaseAmount) ,
    };
  }
  if (
    coupon.maximumPurchaseAmount > 0 &&
    cart.totalAmount > coupon.maximumPurchaseAmount
  ) {
    return {
      success: false,
      status: STATUS_CODES.BAD_REQUEST,
      message:COUPON_MESSAGES.MAX_PURCHASE_REQUIRED(coupon.maximumPurchaseAmount) ,
    };
  }
  cart.couponId = coupon._id;
  await cart.save();
  // Immediately recalculate so the user sees the change
  await recalculateCartSummary(userId);
  return { success: true, status: STATUS_CODES.OK };
};




export const removeCouponFromCart = async (userId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return { success: false, status: STATUS_CODES.NOT_FOUND, message: CART_MESSAGES.CART_NOT_FOUND };
  }
  cart.couponId = null;
  cart.couponDiscount = 0;
  await cart.save();
  return { success: true, status: STATUS_CODES.OK};
};
