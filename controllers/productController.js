
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
const adminPaginationFactory = require(`../utils/pagination`);

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'public', 'images' , 'productImages')
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
                console.error("Multer Error:", err);
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            try {
                let { name, categoryId, description, gender } = req.body;

                let sizeNames =
                    req.body.sizeName || [];

                let sizeQuantities =
                    req.body.sizeQuantity || [];

                let sizePrices =
                    req.body.sizePrice || [];


                // Convert to arrays 
                if (!Array.isArray(sizeNames)) {
                    sizeNames = [sizeNames];
                }
                if (!Array.isArray(sizeQuantities)) {
                    sizeQuantities = [sizeQuantities];
                }
                if (!Array.isArray(sizePrices)) {
                    sizePrices = [sizePrices];
                }

                // Trim values
                name = name?.trim();
                description = description?.trim();

                // Basic Validation
                const validNameRegex = /^[a-zA-Z0-9\s\-&()]+$/;
                const categoryExists = await Category.findById(categoryId);
                const validGenders = ["Men", "Women", "Unisex"];


                if (!name) {
                    return res.status(400).json({
                        success: false,
                        error: "Product name is required."
                    });
                }
                if (name.length < 3 || name.length > 100) {
                    return res.status(400).json({
                        success: false,
                        error: "Product name must be between 3 and 100 characters."
                    });
                }
                if (!validNameRegex.test(name)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid product name."
                    });
                }
                if (!categoryId) {
                    return res.status(400).json({
                        success: false,
                        error: "Category is required."
                    });
                }
                if (!categoryExists) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid category selected."
                    });
                }
                if (!validGenders.includes(gender)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid gender selected."
                    });
                }
                if (!description) {
                    return res.status(400).json({
                        success: false,
                        error: "Description is required."
                    });
                }
                if (description.length < 20) {
                    return res.status(400).json({
                        success: false,
                        error: "Description should contain at least 20 characters."
                    });
                }
                if (description.length > 1000) {
                    return res.status(400).json({
                        success: false,
                        error: "Description is too long."
                    });
                }

                // Duplicate Product Check
                const existingProduct = await Product.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
                if (existingProduct) {
                    return res.status(400).json({
                        success: false,
                        error: "Product already exists."
                    });
                }

                // Validate Sizes
                const uniqueSizes = new Set(sizeNames);
                const details = [];

                if (
                    !sizeNames.length ||
                    !sizeQuantities.length ||
                    !sizePrices.length
                ) {
                    return res.status(400).json({
                        success: false,
                        error: "Size details are required."
                    });
                }


                if (
                    uniqueSizes.size !==
                    sizeNames.length
                ) {
                    return res.status(400).json({
                        success: false,
                        error: "Duplicate sizes are not allowed."
                    });
                }


                for (let i = 0; i < sizeNames.length; i++) {

                    const size = sizeNames[i]?.trim();
                    const quantity = Number(sizeQuantities[i]);
                    const price = Number(sizePrices[i]);

                    if (!size) {
                        return res.status(400).json({
                            success: false,
                            error: "Invalid size."
                        });
                    }

                    if (
                        !Number.isInteger(quantity) ||
                        quantity < 1
                    ) {
                        return res.status(400).json({
                            success: false,
                            error: "Quantity must be at least 1."
                        });
                    }

                    if (
                        !Number.isInteger(price) ||
                        price < 200
                    ) {
                        return res.status(400).json({
                            success: false,
                            error: "Price must be at least ₹200."
                        });
                    }

                    details.push({ size, quantity, price });
                }


                // Image Validation
                const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

                if (
                    !req.files ||
                    !req.files.length
                ) {
                    return res.status(400).json({
                        success: false,
                        error: "At least one image is required."
                    });
                }

                if (req.files.length > 5) {
                    return res.status(400).json({
                        success: false,
                        error: "Maximum 5 images allowed."
                    });
                }


                for (const file of req.files) {

                    if (
                        !allowedMimeTypes.includes(
                            file.mimetype
                        )
                    ) {
                        return res.status(400).json({
                            success: false,
                            error: "Invalid image format."
                        });
                    }

                    if (
                        file.size >
                        10 * 1024 * 1024
                    ) {
                        return res.status(400).json({
                            success: false,
                            error: "Each image must be below 10MB."
                        });
                    }
                }


                // Checkbox Values
                const latestCollection = req.body.latestCollection === "true";
                const bestSeller = req.body.bestSeller === "true";

                // Image Mapping
                const images = req.files.map(
                    (file, index) => ({
                        path:
                            "/images/productImages/" +
                            file.filename,

                        altText:
                            `${name}-image(${index + 1})`
                    })
                );


                // Create Product

                const newProduct =
                    new Product({
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

                // Reload Categories
                const categories = await Category.find().lean();
                const groupedCategories =
                    categories
                        .filter(
                            (cat) =>
                                !cat.parentCategory
                        )
                        .map((parent) => ({
                            ...parent,
                            subcategories:
                                categories.filter(
                                    (sub) =>
                                        sub.parentCategory &&
                                        sub.parentCategory.toString() ===
                                        parent._id.toString()
                                )
                        }));

                return res.render("admin/addProducts", {
                    admin: true,
                    categories: groupedCategories
                }
                );

            } catch (error) {
                console.error("Add Product Error:", error);
                return res.status(500).json({
                    success: false,
                    error: "Something went wrong while adding the product."
                });
            }
        });

    } catch (err) {
        console.error("Outer Add Product Error:", err);
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};







exports.updateProduct = async (req, res) => {

    try {

        const productId = req.params.id;

        upload(req, res, async (err) => {

            if (err) {

                console.error(
                    "Multer Error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            try {

                let {
                    name,
                    categoryId,
                    description,
                    gender
                } = req.body;

                let sizeNames =
                    req.body.sizeName || [];

                let sizeQuantities =
                    req.body.sizeQuantity || [];

                let sizePrices =
                    req.body.sizePrice || [];

                // ================================
                // Convert arrays safely
                // ================================

                if (!Array.isArray(sizeNames)) {
                    sizeNames = [sizeNames];
                }

                if (!Array.isArray(sizeQuantities)) {
                    sizeQuantities = [sizeQuantities];
                }

                if (!Array.isArray(sizePrices)) {
                    sizePrices = [sizePrices];
                }

                // ================================
                // Find Product
                // ================================

                const product =
                    await Product.findById(productId);

                if (!product) {

                    return res.status(404).json({
                        success: false,
                        error: "Product not found."
                    });
                }

                // ================================
                // Trim Values
                // ================================

                name = name?.trim();

                description =
                    description?.trim();

                // ================================
                // Product Name Validation
                // ================================

                if (!name) {

                    return res.status(400).json({
                        success: false,
                        error: "Product name is required."
                    });
                }

                if (
                    name.length < 3 ||
                    name.length > 100
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Product name must be between 3 and 100 characters."
                    });
                }

                const validNameRegex =
                    /^[a-zA-Z0-9\s\-&()']+$/;

                if (
                    !validNameRegex.test(name)
                ) {

                    return res.status(400).json({
                        success: false,
                        error: "Invalid product name."
                    });
                }

                // ================================
                // Duplicate Product Validation
                // ================================

                const existingProduct =
                    await Product.findOne({
                        _id: {
                            $ne: productId
                        },

                        name: {
                            $regex:
                                new RegExp(
                                    `^${name}$`,
                                    "i"
                                )
                        }
                    });

                if (existingProduct) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Another product with this name already exists."
                    });
                }

                // ================================
                // Category Validation
                // ================================

                if (!categoryId) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Category is required."
                    });
                }

                const categoryExists =
                    await Category.findById(
                        categoryId
                    );

                if (!categoryExists) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Invalid category selected."
                    });
                }

                // ================================
                // Gender Validation
                // ================================

                const validGenders = [
                    "Men",
                    "Women",
                    "Unisex"
                ];

                if (
                    !validGenders.includes(
                        gender
                    )
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Invalid gender selected."
                    });
                }

                // ================================
                // Description Validation
                // ================================

                if (!description) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Description is required."
                    });
                }

                if (
                    description.length < 20
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Description should contain at least 20 characters."
                    });
                }

                if (
                    description.length > 1000
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Description is too long."
                    });
                }

                // ================================
                // Size Validation
                // ================================

                if (
                    !sizeNames.length ||
                    !sizeQuantities.length ||
                    !sizePrices.length
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Size details are required."
                    });
                }

                const uniqueSizes =
                    new Set(sizeNames);

                if (
                    uniqueSizes.size !==
                    sizeNames.length
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "Duplicate sizes are not allowed."
                    });
                }

                const details = [];

                for (
                    let i = 0;
                    i < sizeNames.length;
                    i++
                ) {

                    const size =
                        sizeNames[i]?.trim();

                    const quantity =
                        Number(
                            sizeQuantities[i]
                        );

                    const price =
                        Number(
                            sizePrices[i]
                        );

                    if (!size) {

                        return res.status(400).json({
                            success: false,
                            error:
                                "Invalid size."
                        });
                    }

                    if (
                        !Number.isInteger(
                            quantity
                        ) ||
                        quantity < 1
                    ) {

                        return res.status(400).json({
                            success: false,
                            error:
                                "Quantity must be at least 1."
                        });
                    }

                    if (
                        !Number.isInteger(
                            price
                        ) ||
                        price < 200
                    ) {

                        return res.status(400).json({
                            success: false,
                            error:
                                "Price must be at least ₹200."
                        });
                    }

                    details.push({
                        size,
                        quantity,
                        price
                    });
                }

                // ================================
                // Existing Image Removal
                // ================================

                let deletedImages = [];

                try {

                    deletedImages =
                        JSON.parse(
                            req.body.deletedImages || "[]"
                        );

                    if (
                        !Array.isArray(
                            deletedImages
                        )
                    ) {
                        deletedImages = [];
                    }

                } catch {

                    deletedImages = [];
                }

                const imagesToDelete =
                    product.images.filter(
                        (image) =>
                            deletedImages.includes(
                                image._id.toString()
                            )
                    );

                for (
                    const image of imagesToDelete
                ) {

                    const filePath =
                        path.join(
                            __dirname,
                            "..",
                            "public",
                            image.path
                        );

                    fs.unlink(
                        filePath,
                        (err) => {

                            if (err) {

                                console.error(
                                    "Image Delete Error:",
                                    err
                                );
                            }
                        }
                    );
                }

                product.images =
                    product.images.filter(
                        (image) =>
                            !deletedImages.includes(
                                image._id.toString()
                            )
                    );

                // ================================
                // New Image Validation
                // ================================

                const allowedMimeTypes = [
                    "image/jpeg",
                    "image/jpg",
                    "image/png",
                    "image/webp"
                ];

                if (
                    req.files &&
                    req.files.length
                ) {

                    for (
                        const file of req.files
                    ) {

                        if (
                            !allowedMimeTypes.includes(
                                file.mimetype
                            )
                        ) {

                            return res.status(400).json({
                                success: false,
                                error:
                                    "Invalid image format."
                            });
                        }

                        if (
                            file.size >
                            10 * 1024 * 1024
                        ) {

                            return res.status(400).json({
                                success: false,
                                error:
                                    "Each image must be below 10MB."
                            });
                        }
                    }

                    const totalImages =
                        product.images.length +
                        req.files.length;

                    if (
                        totalImages > 5
                    ) {

                        return res.status(400).json({
                            success: false,
                            error:
                                "Maximum 5 images allowed."
                        });
                    }

                    const newImages =
                        req.files.map(
                            (
                                file,
                                index
                            ) => ({

                                path:
                                    "/images/productImages/" +
                                    file.filename,

                                altText:
                                    `${name}-image(${index + 1})`
                            })
                        );

                    product.images.push(
                        ...newImages
                    );
                }

                // ================================
                // Ensure At Least One Image
                // ================================

                if (
                    !product.images.length
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            "At least one image is required."
                    });
                }

                // ================================
                // Checkbox Values
                // ================================

                const latestCollection =
                    req.body.latestCollection === "true";

                const bestSeller =
                    req.body.bestSeller === "true";

                // ================================
                // Update Product
                // ================================

                product.name = name;

                product.categoryId =
                    categoryId;

                product.description =
                    description;

                product.gender =
                    gender;

                product.details =
                    details;

                product.latestCollection =
                    latestCollection;

                product.bestSeller =
                    bestSeller;

                await product.save();

                await pricingExpiryUpdate();

                return res.redirect(
                    "/admin/products"
                );

            } catch (error) {

                console.error(
                    "Update Product Error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Something went wrong while updating the product."
                });
            }
        });

    } catch (err) {

        console.error(
            "Outer Update Product Error:",
            err
        );

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
};











exports.showProducts = async (req, res) => {
    try {
        // 1. Get params from URL (e.g., /admin/products?page=1&query=shirt)
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const query = req.query.query || '';

        // 2. Build the search filter
        let filter = {};
        if (query) {
            filter = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            };
        }

        // 3. Execute queries with 'showInactive' flag so admin sees everything
        const [totalDocuments, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .setOptions({ showInactive: true })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const totalPages = Math.ceil(totalDocuments / limit);

        // 4. Render the page with data and pagination helpers
        return res.render('admin/products', {
            products,
            query,
            pagination: {
                page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                serialNumberStart: skip
            }
        });

    } catch (error) {
        console.error('Error in showProducts:', error);
        return res.status(500).render('error', { message: 'Failed to load products' });
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







exports.blockProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId).setOptions({ showInactive: true });

        if (!product) {
            return res.json({
                success: true,
                message: 'Product not found',
            });
        }

        const existingActive = await Product.findOne({ name: product.name, isActive: true }).lean()

        if (!product.isActive && existingActive) {
            return res.json({
                success: false,
                message: "Cannot activate. An active product with this name already exists.",
            });
        }

        product.isActive = !product.isActive;
        await product.save();

        return res.json({
            success: true,
            message: 'success',
        });

    } catch (error) {
        res.redirect('back');
    }
};


exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId).setOptions({ showInactive: true });

        if (!product) {
            return res.json({
                success: true,
                message: 'Product not found',
            });
        }

        const existingActive = await Product.findOne({ name: product.name, isActive: true }).lean()

        if (!product.isActive && existingActive) {
            return res.json({
                success: false,
                message: "Cannot Restore. An active product with this name already exists.",
            });
        }

        product.isDeleted = !product.isDeleted;
        await product.save();

        return res.json({
            success: true,
            message: 'success',
        });

    } catch (error) {
        res.redirect('back');
    }
};


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////APPLY OFFER FUNCTIONS//////////////////////


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












