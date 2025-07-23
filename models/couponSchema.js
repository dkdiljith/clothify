const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'price'], required: true },
    discountValue: { type: Number, required: true },
    minimumPurchaseAmount: { type: Number , required: true }, 
    endDate: { type: Date, required: true },
    // usageCount: { type: Number, default: 0 },
    // maxUsage: { type: Number, min: 0 }, 
    isActive: { type: Boolean, default: true }, 
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);