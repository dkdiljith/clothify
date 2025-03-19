const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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

        productName:{type:String , required:true},
        productPrice:{type:String},
        productImg:{type:String },
        productSize:{type:String},

        variationIndex: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        status: { type: String, default: 'Pending' }, 
    }], 

    deliveryAddress:{type:Object},
    paymentMethod:{type:String , required:true},
    paymentStatus:{type:String, default:"Pending"},

    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
