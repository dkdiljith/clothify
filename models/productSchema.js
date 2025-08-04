const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    details: [{
        size: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },


        discountPrice: {
            type: Number, default: 0, validate: {
                validator: function (value) {
                    return value <= this.price;
                },
                message: 'Discount price cannot be greater than original price'
            }
        },
        currentOffer: { type: mongoose.Schema.Types.ObjectId, default: null }


    }],
    gender: { type: String, required: true },
    description: { type: String },
    images: [{
        path: String,
        altText: String
    }],
    latestCollection: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
}, { timestamps: true });


////////////////////////////////////////////////////////////////////////////////////////////////////


//Search Indexes
productSchema.index({ name: 'text', description: 'text', gender: 'text' });
productSchema.index({ 'details.price': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ salesCount: -1 });


const Product = mongoose.model("Product", productSchema);

module.exports = Product;