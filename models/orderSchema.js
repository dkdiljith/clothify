import mongoose from 'mongoose';

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
    refundDetails: {
      refundType: { type: String, enum: ["Cancelled", "Returned"] },
      paymentMethod: { type: String, enum: ['razorpay', 'wallet', 'cod'] },
      refundAmount: { type: Number },
      refundAmountStatus: { type: String, enum: ['Refunded', 'No Refund Required'] },
      refundReason: { type: String },
      refundRequestedAt: { type: Date },
      refundedAt: { type: Date }
    },
    amount: { type: Number, default: 0, min: 0 },
  }],
  deliveryAddress: { type: Object },
  deliveryStatus: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'Failed', 'Shipped', 'Completed', 'Cancelled', 'Return Requested', 'Return Rejected', 'Returned']
  },
  paymentMethod: { type: String, required: true, enum: ['razorpay', 'wallet', 'cod'] },
  paymentStatus: { type: String, default: "Pending", enum: ['Failed', 'Completed', 'Pending', 'Refunded'] },
  totalRefundAmount: { type: Number, default: 0 },

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
  checkoutTotal: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });


orderSchema.pre("save", function (next) {
  // 1. Fallback for empty orders
  if (!this.items || this.items.length === 0) {
    this.deliveryStatus = "Pending";
    return next();
  }

  const statuses = this.items.map(item => item.status);
  const uniqueStatuses = [...new Set(statuses)];

  // 2. Exact match check (All items share the exact same status)
  if (uniqueStatuses.length === 1) {
    this.deliveryStatus = uniqueStatuses[0];
  }
  // 3. Mixed status logic
  else {
    // Check if every item is either "Cancelled" or "Returned"
    const allAreTerminal = statuses.every(s => s === "Cancelled" || s === "Returned");

    if (allAreTerminal) {
      // Prioritize "Returned" if the mix contains only these two terminal states
      this.deliveryStatus = "Returned";
    } else {
      // If there is any active item (Shipped, Completed, etc.) mixed with terminal ones, force Pending
      this.deliveryStatus = "Pending";
    }
  }

  next();
});


export default mongoose.model('Order', orderSchema);

