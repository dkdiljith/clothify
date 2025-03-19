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