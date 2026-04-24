
const Product = require("../models/productSchema");
const Category = require("../models/categorySchema")
const Offer = require("../models/offerSchema")
const multer = require('multer')
const path = require('path')
const fs = require('fs');







///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads')
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))

    }
})

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }).array('images', 5);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.addProductsRender = async (req, res) => {

    const categories = await Category.find().lean();

    const groupedCategories = categories
        .filter(cat => !cat.parentCategory)
        .map(parent => ({
            ...parent,
            subcategories: categories.filter(sub =>
                sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
            )
        }));
    return res.render('admin/addProducts', {
        admin: true,
        categories: groupedCategories
    });
}

exports.editProductsRender = async (req, res) => {

    const productId = req.params.id;
    const product = await Product.findById(productId).lean()

    const categories = await Category.find().lean();


    const groupedCategories = categories
        .filter(cat => !cat.parentCategory)
        .map(parent => ({
            ...parent,
            subcategories: categories.filter(sub =>
                sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
            )
        }));

    return res.render('admin/editProduct', {
        admin: true,
        product: product,
        categories: groupedCategories,
    });

}



///////////////////////////////////////////////////////////////////////////////////////////////

exports.addProducts = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                console.error("Multer error:", err);
                return res.status(500).json({ success: false, error: err.message });
            }

            const { name, categoryId, description, gender } = req.body;
            let sizeNames = req.body.sizeName || [];
            let sizeQuantities = req.body.sizeQuantity || [];
            let sizePrices = req.body.sizePrice || [];

            if (!Array.isArray(sizeNames)) sizeNames = [sizeNames];
            if (!Array.isArray(sizeQuantities)) sizeQuantities = [sizeQuantities];
            if (!Array.isArray(sizePrices)) sizePrices = [sizePrices];

            const details = sizeNames.map((size, index) => ({
                size,
                quantity: parseInt(sizeQuantities[index]) || 0,
                price: parseInt(sizePrices[index]) || 299
            }));

            const latestCollection = req.body.latestCollection === 'on';
            const bestSeller = req.body.bestSeller === 'on';

            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map((file, index) => ({
                    path: '/uploads/' + file.filename,
                    altText: `${name}-image(${index + 1})`
                }));
            }


            const newProduct = new Product({
                name,
                categoryId,
                details,
                gender,
                description,
                images,
                latestCollection,
                bestSeller,
            });

            await newProduct.save();


            const categories = await Category.find().lean();


            const groupedCategories = categories
                .filter(cat => !cat.parentCategory)
                .map(parent => ({
                    ...parent,
                    subcategories: categories.filter(sub =>
                        sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
                    )
                }));
            return res.render('admin/addProducts', {
                admin: true,
                categories: groupedCategories
            });


        });
    } catch (err) {
        console.error('Error adding product:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};



exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        upload(req, res, async (err) => {
            if (err) {
                console.error("Multer error:", err);
                return res.status(500).json({ success: false, error: err.message });
            }

            const { name, categoryId, description, gender } = req.body;
            let sizeNames = req.body.sizeName || [];
            let sizeQuantities = req.body.sizeQuantity || [];
            let sizePrices = req.body.sizePrice || [];

            if (!Array.isArray(sizeNames)) sizeNames = [sizeNames];
            if (!Array.isArray(sizeQuantities)) sizeQuantities = [sizeQuantities];
            if (!Array.isArray(sizePrices)) sizePrices = [sizePrices];

            const details = sizeNames.map((size, index) => ({
                size,
                quantity: parseInt(sizeQuantities[index]) || 0,
                price: parseInt(sizePrices[index]) || 299
            }));

            const latestCollection = req.body.latestCollection === 'on';
            const bestSeller = req.body.bestSeller === 'on';

            let newImages = [];
            if (req.files && req.files.length > 0) {
                newImages = req.files.map((file, index) => ({
                    path: '/uploads/' + file.filename,
                    altText: `${name}-image(${index + 1})`
                }));
            }

            const removedImageIndexes = req.body.removedImageIndexes || [];
            const indexesToRemove = Array.isArray(removedImageIndexes)
                ? removedImageIndexes.map(Number)
                : [Number(removedImageIndexes)];

            let product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }

            // Remove selected images from DB and disk
            const imagesToRemove = product.images.filter((_, index) =>
                indexesToRemove.includes(index)
            );

            imagesToRemove.forEach((img) => {
                const filePath = path.join(__dirname, '..', 'public', img.path);
                fs.unlink(filePath, (err) => {
                    if (err) console.error("Error deleting file:", err);
                });
            });

            // Filter out deleted images
            product.images = product.images.filter((_, index) => !indexesToRemove.includes(index));

            // Append new images (if any)
            if (newImages.length > 0) {
                product.images.push(...newImages);
            }

            // Update all other fields
            product.name = name;
            product.categoryId = categoryId;
            product.description = description;
            product.gender = gender;
            product.details = details;
            product.latestCollection = latestCollection;
            product.bestSeller = bestSeller;

            await product.save();
            return res.redirect('/admin/products');
        });
    } catch (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};





exports.showProducts = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 5; // 5 products per page

        // Get total count of products
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        // Get paginated products (newest first)
        const products = await Product.find()
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const categories = await Category.find().lean();

        return res.render('admin/products', {
            admin: true,
            products: products,
            categories: categories,
            pagination: {
                page,
                limit,
                totalPages,
                nextPage: page + 1,
                prevPage: page - 1,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        return res.render('admin/products', {
            admin: true,
            products: [],
            categories: [],
            pagination: {
                page: 1,
                limit: 5,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            },
            errorMessage: "Error fetching products. Please try again later."
        });
    }
};


exports.singleProductPage = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean()
        const categoryId = product.categoryId
        const categories = await Category.findById(categoryId).lean();

        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        const relatedProducts = await Product.find({
            categoryId: product.categoryId,
            _id: { $ne: product._id },
        }).limit(4).lean()

        const offers = await Offer.find().lean()

        return res.render('user/singleProductPage', {
            product: product,
            relatedProducts: relatedProducts,
            categories: categories,
            offers: offers,
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        return res.status(500).render('error', { message: 'Server error' });
    }
}


exports.deleteProducts = async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.findByIdAndDelete(productId);
        return res.redirect('/admin/products');
    } catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).send("Error deleting product.");
    }
}




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////APPLY OFFER FUNCTIONS/////////////////////

//Apply Offer Render Function
exports.applyOfferJson = async (req, res) => {
    try {
        const offers = await Offer.find({ offerType: 'product' });
        const product = await Product.findById(req.params.productId)
        return res.json({ offers, product });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

//Apply Offer Function
exports.applyOffer = async (req, res) => {
    try {
        const { productId } = req.params;
        const { offerId } = req.body;

        const product = await Product.findById(productId);
        const offer = await Offer.findById(offerId).lean();

        // validations
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found." });
        }
        if (offer.offerType === 'subcategory') {
            return res.status(400).json({ success: false, message: "This offer is for subcategories, not products." });
        }
        if (offer.discountType === 'percentage' && offer.discountValue >= 100) {
            return res.status(400).json({ success: false, message: "Percentage discount must be less than 100." });
        }

        //offerPrice calculating
        product.details.forEach(detail => {
            let calculatedOfferPrice = null;
            const originalPrice = detail.price;

            if (offer.discountType === 'percentage') {
                calculatedOfferPrice = originalPrice - ((originalPrice * offer.discountValue) / 100);
            } else if (offer.discountType === 'price') {
                calculatedOfferPrice = originalPrice - offer.discountValue;
            }

            if (calculatedOfferPrice !== null && calculatedOfferPrice < originalPrice && calculatedOfferPrice > 0) {
                //rounding price
                detail.offerPrice = Math.round((calculatedOfferPrice * 100) / 100);
                detail.offerId = offerId;
            } else {
                detail.offerPrice = null;
                detail.offerId = null;
                console.log(`Offer was not applicable for detail with price ${originalPrice}`);
            }
        });
        await product.save();
        return res.status(201).json({
            success: true,
            type: "success",
            message: "Offer applied successfully!"
        });

    } catch (err) {
        console.error("An Error Occurred while applying offer:", err);
        return res.status(500).json({
            success: false,
            type: "error",
            message: "An internal server error occurred."
        });
    }
};



















