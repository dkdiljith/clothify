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
        enum: ['Pending', 'Failed', 'Shipped', 'Completed', 'Cancelled', 'Return Requested', 'Return Rejected', 'Returned']
    },
    paymentMethod: { type: String, required: true, enum: ['razorpay', 'wallet', 'cod'] },
    paymentStatus: { type: String, default: "Pending", enum: ['Failed', 'Completed', 'Pending', 'Refunded'] },

    paymentAttemptsCount: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Attempts cannot be less than 1'],
        max: [6, 'Maximum payment retry limit reached'] // Enforces the max limit at DB level
    },

    paymentRetryExpiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 30 * 60 * 1000)
    },

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
  // 1. DELIVERY STATUS LOGIC (Based on items)
  if (this.items && this.items.length > 0) {
    const statuses = this.items.map(item => item.status);

    const allPending = statuses.every(s => s === 'Pending');
    const allFailed = statuses.every(s => s === 'Failed');
    const allShipped = statuses.every(s => s === 'Shipped');
    const allCompleted = statuses.every(s => s === 'Completed');
    const allCancelled = statuses.every(s => s === 'Cancelled');
    const allReturnRequested = statuses.every(s => s === 'Return Requested');
    const allReturnRejected = statuses.every(s => s === 'Return Rejected');
    const allReturned = statuses.every(s => s === 'Returned');

    if (allPending) {
      this.deliveryStatus = 'Pending';
    } else if (allFailed) {
      this.deliveryStatus = 'Failed';
    } else if (allShipped) {
      this.deliveryStatus = 'Shipped';
    } else if (allCompleted) {
      this.deliveryStatus = 'Completed';
    } else if (allCancelled) {
      this.deliveryStatus = 'Cancelled';
    } else if (allReturnRequested) {
      this.deliveryStatus = 'Return Requested';
    } else if (allReturnRejected) {
      this.deliveryStatus = 'Return Rejected';
    } else if (allReturned) {
      this.deliveryStatus = 'Returned';
    } else {
      this.deliveryStatus = 'Pending';
    }
  } else {
    this.deliveryStatus = 'Pending';
  }

  // 2. PAYMENT STATUS MANDATORY RULES
  if (this.deliveryStatus === 'Completed') {
    this.paymentStatus = 'Completed';
  } else if (this.deliveryStatus === 'Failed') {
    this.paymentStatus = 'Failed';
  } else if (this.deliveryStatus === 'Returned') {
    this.paymentStatus = 'Refunded';
  }
  // In all other cases (Pending, Shipped, Cancelled, etc.), 
  // paymentStatus remains exactly what it was previously set to.

  next();
});





module.exports = mongoose.model('Order', orderSchema);

