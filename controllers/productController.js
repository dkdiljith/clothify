
const Product = require("../models/productSchema");
const Category = require("../models/categorySchema")
const Offer = require("../models/offerSchema")
const multer = require('multer')
const path = require('path')
const fs = require('fs');

//update offer & coupon & products
const pricingExpiry = require("../services/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate

//pagination
const adminPaginationFactory = require(`../services/pagination`);

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

const upload = multer({ storage: storage }).array('images', 5);
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
            await pricingExpiryUpdate();


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
            await pricingExpiryUpdate();
            return res.redirect('/admin/products');
        });
    } catch (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};





// Show Products
exports.showProducts = async (req, res) => {
   try {

        const page = parseInt(req.query.page) || 1;

        const query = req.query.query || '';



        // Pagination + Search handled by factory
        const result = await adminPaginationFactory({
            page,
            limit: 5,
            query,
            type: 'product'
        });



        // Extra Product Business Logic
        const [categories, offers] = await Promise.all([

            Category.find({}, {
                _id: 1,
                name: 1
            }).lean(),

            Offer.find({}, {
                _id: 1,
                offerCode: 1
            }).lean()
        ]);



        // Offer Mapping
        const offerMap = {};

        offers.forEach(item => {

            offerMap[item._id.toString()] = item.offerCode;
        });



        // Product Transformation
        const updatedProducts = result.products.map(item => {

            const firstDetail = item.details?.[0];

            return {

                ...item,

                currentOfferCode: firstDetail?.offerId
                    ? offerMap[firstDetail.offerId.toString()] || ''
                    : ''
            };
        });



        return res.render('admin/products', {

            admin: true,

            products: updatedProducts,

            categories,

            query: result.query,

            pagination: result.pagination
        });



    } catch (error) {

        console.error("Error fetching products:", error);



        return res.render('admin/products', {

            admin: true,

            products: [],

            categories: [],

            query: '',

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
//////////APPLY OFFER FUNCTIONS//////////////////////

//Manuel Apply Offer Render Function
// Manual Apply Offer Render Function
exports.applyOfferJson = async (req, res) => {
    try {
        const { productId } = req.params;
        const now = new Date();

        const product = await Product.findById(productId).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const offers = await Offer.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },

            $or: [
                {
                    offerType: "product",
                    targetIds: productId
                },
                {
                    offerType: "subcategory",
                    targetIds: product.categoryId
                }
            ]
        }).lean();

        return res.json({
            success: true,
            offers,
            product
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



// Manuel Apply Offer Function
exports.applyOffer = async (req, res) => {
    try {
        const { productId } = req.params;
        const { offerId } = req.body;

        const now = new Date();

        const product = await Product.findById(productId);
        const offer = await Offer.findById(offerId).lean();

        // validations
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: "Offer not found."
            });
        }

        if (!offer.isActive || offer.startDate > now || offer.endDate < now) {
            return res.status(400).json({
                success: false,
                message: "This offer is not active."
            });
        }

        let targetMatch = false;

        // product offer validation
        if (offer.offerType === "product") {
            targetMatch = offer.targetIds.some(
                id => id.toString() === productId
            );
        }

        // subcategory offer validation
        if (offer.offerType === "subcategory") {
            targetMatch = offer.targetIds.some(
                id => id.toString() === product.categoryId.toString()
            );
        }

        if (!targetMatch) {
            return res.status(400).json({
                success: false,
                message: "This offer is not applicable for this product."
            });
        }

        let appliedCount = 0;

        product.details.forEach(detail => {
            const originalPrice = detail.price;

            // clear old values first
            detail.offerId = null;
            detail.offerPrice = 0;
            detail.offerLocked = false;

            let newPrice = originalPrice;

            if (offer.discountType === "percentage") {
                newPrice =
                    originalPrice -
                    (originalPrice * offer.discountValue) / 100;
            } else {
                newPrice =
                    originalPrice - offer.discountValue;
            }

            // invalid discount rules
            if (newPrice <= 0) return;
            if (newPrice < originalPrice * 0.20) return;

            newPrice = Math.round(newPrice);

            detail.offerId = offer._id;
            detail.offerPrice = newPrice;
            detail.offerLocked = true;

            appliedCount++;
        });

        await product.save();
        await pricingExpiryUpdate();

        if (appliedCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Offer could not be applied to any product variant."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Offer applied successfully with manual override."
        });

    } catch (error) {
        console.log("applyOffer failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};



// Product Auto Pricing 
exports.autoPricing = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        product.details.forEach(detail => {
            detail.offerId = null;
            detail.offerPrice = 0;
            detail.offerLocked = false;
        });

        await product.save();
        await pricingExpiryUpdate();

        return res.status(200).json({
            success: true,
            message: "Automatic pricing enabled successfully."
        });

    } catch (error) {
        console.log("product autoPricing failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};












