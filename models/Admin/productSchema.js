const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    product_type: { type: String, required: true },
    size: [{
        size: String,
        quantity: Number
    }],
    description: { type: String },
    images: [{
        path: String,
        altText: String 
    }],
    latestCollection: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;