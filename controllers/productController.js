
const Product = require("../models/productSchema");
const Category = require("../models/categorySchema")
const multer = require('multer')
const path = require('path')
const fs = require('fs');
const { adminIsLoggedIn } = require("../middlewares/SessionHandling");







///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const storage = multer.diskStorage({
  destination:(req,file,cb)=>{
    const uploadPath = path.join(__dirname,'..','public','uploads')
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null,uploadPath)
  },
  filename:(req,file,cb)=>{
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))

  }
})

const upload = multer({ storage: storage }).array('images', 5);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.addProductsRender = async(req,res)=>{
    // Fetch all categories from MongoDB
    const categories = await Category.find().lean();

    // Group categories: Find parent categories & map their subcategories
    const groupedCategories = categories
        .filter(cat => !cat.parentCategory) // Get only parent categories
        .map(parent => ({
            ...parent,
            subcategories: categories.filter(sub => 
                sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
            ) // Find matching subcategories
        }));
        res.render('admin/addProducts', { 
            admin: true, // Assuming this is always true for admin pages
            categories: groupedCategories // Pass the products data to the template
        });
}

exports.editProductsRender = async(req,res)=>{

    const productId = req.params.id;
  
    const product = await Product.findById(productId).lean()
    const categoryId = product.categoryId
    const categories = await Category.findById(categoryId).lean();



     // Fetch all categories from MongoDB
     const category = await Category.find().lean();

     // Group categories: Find parent categories & map their subcategories
     const groupedCategories = category
         .filter(cat => !cat.parentCategory) // Get only parent categories
         .map(parent => ({
             ...parent,
             subcategories: category.filter(sub => 
                 sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
             ) // Find matching subcategories
         }));



        res.render('admin/editProduct', { 
            admin: true, // Assuming this is always true for admin pages
            product:product,
            category: categories,
            categories: groupedCategories
        });
}


exports.ordersRender = async(req,res)=>{
    res.render(`admin/orders` ,{admin:true})
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

            // 🔹 Convert single values to arrays if needed
            if (!Array.isArray(sizeNames)) sizeNames = [sizeNames];
            if (!Array.isArray(sizeQuantities)) sizeQuantities = [sizeQuantities];
            if (!Array.isArray(sizePrices)) sizePrices = [sizePrices];

            // ✅ Ensure details array is formatted correctly
            const details = sizeNames.map((size, index) => ({
                size,
                quantity: parseInt(sizeQuantities[index]) || 0, // Convert to number
                price: parseInt(sizePrices[index]) || 299  // Convert to number
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
                categoryId,  // ✅ Fixed: Now correctly uses categoryId
                details,     // ✅ Fixed: Now correctly stores sizes, quantities, and prices
                gender,
                description,
                images,
                latestCollection,
                bestSeller,
            });

            await newProduct.save();
            res.render(`admin/addProducts`, { admin: true });
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

            // 🔹 Convert single values to arrays if needed
            if (!Array.isArray(sizeNames)) sizeNames = [sizeNames];
            if (!Array.isArray(sizeQuantities)) sizeQuantities = [sizeQuantities];
            if (!Array.isArray(sizePrices)) sizePrices = [sizePrices];

            // ✅ Ensure details array is formatted correctly
            const details = sizeNames.map((size, index) => ({
                size,
                quantity: parseInt(sizeQuantities[index]) || 0, // Convert to number
                price: parseInt(sizePrices[index]) || 299  // Convert to number
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

            // 🔥 **Find & Update the Existing Product**
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
                    ...(images.length > 0 && { images }) // Update images only if new ones are uploaded
                },
                { new: true } // ✅ Returns the updated product
            );

            if (!updatedProduct) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }

            res.redirect(`/admin/addProducts`); // ✅ Redirect back to edit page
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};






exports.showProducts =  async (req, res) => {  // Route to display products
    try {
        const products = await Product.find().lean(); // Fetch ALL products from the database
        const category = await Category.find().lean()

        res.render('admin/products', { 
            admin: true, // Assuming this is always true for admin pages
            products: products,
            categories:category
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.render('admin/products', { 
            admin: true, 
            products: [], // Important: Pass an empty array in case of error
            errorMessage: "Error fetching products. Please try again later." // Optional error message
        });
    }
}


exports.singleProductPage =  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id).lean()
      const categoryId = product.categoryId
      const categories = await Category.findById(categoryId).lean();
  
      if (!product) {
        return res.status(404).render('error', { message: 'Product not found' });
      }
  
      // Fetch related products
      const relatedProducts = await Product.find({
        categoryId: product.categoryId,
        _id: { $ne: product._id }, // Exclude current product
      }).limit(4).lean()
  
      res.render('user/singleProductPage', {
        product:product,
        relatedProducts:relatedProducts,
        categories:categories,
        isAdminLogin: true
      });
    } catch (err) {
      console.error('Error fetching product:', err);
      res.status(500).render('error', { message: 'Server error' });
    }
  }


exports.deleteProducts =  async (req, res) => { // Use csrfProtection here too
    try {
        const productId = req.params.id;
        await Product.findByIdAndDelete(productId);
        res.redirect('/admin/products'); // Redirect after successful deletion
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).send("Error deleting product."); // Or better error handling
    }
}