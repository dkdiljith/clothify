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
        quantity: { type: Number, required: true, min: 0 },
        price: { type: Number, required: true, min: 0 },
        offerId: { type: mongoose.Schema.Types.ObjectId, default: null },
        offerPrice: { type: Number, default: null, min: 0, message: 'Discount price cannot be greater than original price' },
        offerLocked: { type: Boolean, default: false }
    }],
    gender: { type: String, required: true },
    description: { type: String },
    images: [{
        path: String,
        altText: String
    }],
    isActive: { type: Boolean, default: true },
    latestCollection: { type: Boolean, default: false },
    bestSeller: { type: Boolean, default: false },
}, { timestamps: true });


////////////////////////////////////////////////////////////////////////////////////////////////////

// Automatically filter out blocked products for any 'find' operation
productSchema.pre(/^find/, function (next) {
    const options = this.getOptions();

    // 2. Handle Inactive Filter (Hide inactive by default unless showInactive is true)
    if (!options.showInactive) {
        this.find({ isActive: true });
    }

    next();
});




//Search Indexes
productSchema.index({ name: 'text', description: 'text', gender: 'text' });
productSchema.index({ 'details.price': 1 });
productSchema.index({ createdAt: -1 });


const Product = mongoose.model("Product", productSchema);

module.exports = Product;