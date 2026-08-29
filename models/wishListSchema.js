import mongoose from 'mongoose';

const wishListSchema = new mongoose.Schema({
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
        }
    }],
}, { timestamps: true });


// Middleware to update updatedAt on every save
wishListSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});


const Cart = mongoose.model('WishList', wishListSchema);
export default Cart;