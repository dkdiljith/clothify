
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
    res.render('admin/addProducts', {
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

    res.render('admin/editProduct', {
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
            res.render('admin/addProducts', {
                admin: true,
                categories: groupedCategories
            });


        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ success: false, error: err.message });
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

            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map((file, index) => ({
                    path: '/uploads/' + file.filename,
                    altText: `${name}-image(${index + 1})`
                }));
            }

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    name,
                    categoryId,
                    details,
                    gender,
                    description,
                    latestCollection,
                    bestSeller,
                    ...(images.length > 0 && { images })
                },
                { new: true }
            );

            if (!updatedProduct) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }

            res.redirect(`/admin/products`);
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ success: false, error: err.message });
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

        res.render('admin/products', {
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
        res.render('admin/products', {
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

        res.render('user/singleProductPage', {
            product: product,
            relatedProducts: relatedProducts,
            categories: categories,
            offers:offers ,
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).render('error', { message: 'Server error' });
    }
}


exports.deleteProducts = async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.findByIdAndDelete(productId);
        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).send("Error deleting product.");
    }
}





















