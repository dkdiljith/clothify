import mongoose from 'mongoose';


const cartSchema = new mongoose.Schema({
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
        isAvailable: { type: Boolean, default: true }
    }], // Close the array definition here
    subtotal: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponDiscount: { type: Number, default: 0, min: 0 },
    offerDiscount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });


const Cart = mongoose.model('Cart', cartSchema);
export default Cart;