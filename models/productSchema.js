const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    categoryId: {  // Changed to ObjectId and added ref
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",  // This is the key: it tells Mongoose to relate to Category
        required: true // Category is now a required field
    },
    details: [{
        size: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
    }],
    gender:{type:String , required:true },
    description: { type: String },
    images: [{
        path: String,
        altText: String
    }],
    latestCollection: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
}, { timestamps: true });


////////////////////////////////////////////////////////////////////////////////////////////////////

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;