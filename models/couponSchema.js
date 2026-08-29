import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    couponCode: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'price'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minimumPurchaseAmount: { type: Number, required: true, min: 0 },
    maximumPurchaseAmount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // usageCount: { type: Number, default: 0 },
    // maxUsage: { type: Number, min: 0 }, 
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);