import Cart from '../models/cartSchema.js';



// const TAX_RATE = 0.06;  //6% tax
//   const SHIPPING_THRESHOLD = 2000;
//   const FLAT_SHIPPING_FEE = 80;



async function recalculateCartSummary(userId) {
  const cart = await Cart.findOne({ userId })
    .populate('items.productId')
    .populate('couponId');

  if (!cart || !cart.items.length) {
    return { subtotal: 0, shippingFee: 0, tax: 0, couponDiscount: 0, offerDiscount: 0, totalAmount: 0 };
  }

  let subtotal = 0;
  let offerDiscount = 0;
  let offerAmount = 0;

  cart.items.forEach(item => {
    // Ensure productId and details exist
    const details = item.productId?.details;
    const index = item.variationIndex || 0;
    const variation = details ? details[index] : null;

    if (!variation) {
      return; // Skip this item to avoid NaN
    }

    // Fallback to 0 for any missing prices
    const price = Number(variation.price) || 0;
    const qty = Number(item.quantity) || 0;
    const offerPrice = Number(variation.offerPrice) || 0;

    const basePrice = price * qty;
    const sellingPrice = (offerPrice > 0 && offerPrice < price)
      ? offerPrice * qty
      : basePrice;

    subtotal += basePrice;
    offerAmount += sellingPrice;
    offerDiscount += (basePrice - sellingPrice);
  });

  let couponDiscount = 0;
  if (cart.couponId) {
    const coupon = cart.couponId;
    const discValue = Number(coupon.discountValue) || 0;

    // --- SAFETY CHECKS ---
    const isSubtotalTooLow = subtotal < coupon.minimumPurchaseAmount;
    const isDiscountTooHigh = coupon.discountType === 'price' && discValue > subtotal;

    if (isSubtotalTooLow || isDiscountTooHigh) {
      cart.couponId = null;
      cart.couponDiscount = 0;

    } else {
      if (coupon.discountType === 'price') {
        couponDiscount = discValue;
      } else {
        couponDiscount = offerAmount * (discValue / 100);
      }

      // Safety cap to prevent negative totals
      couponDiscount = Math.min(couponDiscount, offerAmount);
      offerAmount -= couponDiscount;
    }
  }


  const TAX_RATE = 0.06;  //6% tax
  const SHIPPING_THRESHOLD = 2000;
  const FLAT_SHIPPING_FEE = 80;

  const tax = Math.round(offerAmount * TAX_RATE) || 0;
  const shippingFee = (offerAmount + tax >= SHIPPING_THRESHOLD) ? 0 : FLAT_SHIPPING_FEE;
  const totalAmount = Math.round(offerAmount + tax + shippingFee) || 0;

  // 3. Final validation before saving
  cart.subtotal = subtotal || 0;
  cart.shippingFee = shippingFee || 0;
  cart.tax = tax || 0;
  cart.couponDiscount = Math.round(couponDiscount) || 0;
  cart.offerDiscount = offerDiscount || 0;
  cart.totalAmount = totalAmount || 0;

  await cart.save();
  return cart.toObject();
}


export default recalculateCartSummary