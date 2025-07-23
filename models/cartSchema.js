const mongoose = require('mongoose');

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
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    }], // Close the array definition here
    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax:{ type: Number, default: 0 },
    couponId:{type:mongoose.Schema.Types.ObjectId, default:null},
    couponDiscount:{type:Number,default:0},
    offerDiscount:{type:Number,default:0},
    totalAmount: { type: Number, default: 0 }
}, { timestamps: true });

// Middleware to update updatedAt on every save
cartSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;