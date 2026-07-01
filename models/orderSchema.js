const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: { type: String, required: true },
        productPrice: { type: String },
        productImg: { type: String },
        productSize: { type: String },
        variationIndex: {
            type: Number,
            required: true,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        status: {
            type: String,
            default: 'Pending',
            enum: ['Pending', 'Failed', 'Shipped', 'Completed', 'Cancelled', 'Return Requested', 'Return Rejected', 'Returned']
        },
        completionDate: { type: Date },
        cancellationReason: [
            {
                reason: { type: String },
                cancelledAt: { type: Date, default: Date.now }
            }
        ],
        returnReason: [{
            itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
            reason: { type: String, required: true }
        }],
    }],
    deliveryAddress: { type: Object },
    deliveryStatus: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Completed', 'Cancelled', 'Returned']
    },
    paymentMethod: { type: String, required: true, enum: ['razorpay', 'wallet', 'cod'] },
    paymentStatus: { type: String, default: "Pending", enum: ['Failed', 'Completed', 'Pending', 'Refunded'] },

    subtotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    couponId: { type: mongoose.Schema.Types.ObjectId, default: null },
    couponDiscount: { type: Number, default: 0, min: 0 },
    offerDiscount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

// PRE-SAVE HOOK LOGIC
orderSchema.pre('save', function (next) {
    if (this.items && this.items.length > 0) {
        // Check if every single item shares the same target status
        const allComplete = this.items.every(item => item.status === 'Completed');
        const allCancelled = this.items.every(item => item.status === 'Cancelled');
        const allReturned = this.items.every(item => item.status === 'Returned');

        if (allComplete) {
            this.deliveryStatus = 'Completed';
        } else if (allCancelled) {
            this.deliveryStatus = 'Cancelled';
        } else if (allReturned) {
            this.deliveryStatus = 'Returned';
        } else {
            this.deliveryStatus = 'Pending';
        }
    } else {
        this.deliveryStatus = 'Pending';
    }
    next();
});




module.exports = mongoose.model('Order', orderSchema);

