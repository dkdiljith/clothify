
const Product = require("../models/Admin/productSchema");
const multer = require('multer')
const path = require('path')
const fs = require('fs')


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
    res.render(`admin/addProducts`, {admin:true})
}
exports.ordersRender = async(req,res)=>{
    res.render(`admin/orders` ,{admin:true})
}
exports.categoryRender =async(req,res)=>{
    res.render(`admin/category` , {admin:true})
}


///////////////////////////////////////////////////////////////////////////////////////////////

exports.addProducts = async (req, res) => {
    try {
        upload(req, res, async (err) => { // Use the upload middleware
            if (err) {
                console.error("Multer error:", err);
                return res.status(500).json({ success: false, error: err.message }); // Send JSON error response
            }

            const { name, price, piece, category, product_type, description } = req.body; // Correct field name
            const sizes = req.body.size || []; // Access sizes correctly
            const latestCollection = req.body.latestCollection === 'on'; // Correct checkbox handling
            const bestSeller = req.body.bestSeller === 'on'; // Correct checkbox handling

            let imagePath = [];
            if (req.files && req.files.length > 0) {
                imagePath = req.files.map(file => '/uploads/' + file.filename);
            }

            const newProduct = new Product({
                name,
                category,
                price,
                piece,
                product_type, // Use product_type
                size: sizes, // Save sizes (no need to modify)
                description,
                images: imagePath,
                latestCollection,
                bestSeller,
            });

            await newProduct.save();
            res.render(`admin/addProducts` , {admin:true} )
        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ success: false, error: err.message }); // Send JSON error response
    }
};



exports.showProducts =  async (req, res) => {  // Route to display products
    try {
        const products = await Product.find().lean(); // Fetch ALL products from the database

        // Or, if you need to apply some filtering or sorting:
        // const products = await Product.find({ /* your filter criteria */ }).sort({ /* your sort criteria */ });

        res.render('admin/products', { 
            admin: true, // Assuming this is always true for admin pages
            products: products // Pass the products data to the template
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        res.render('admin/products', { 
            admin: true, 
            products: [], // Important: Pass an empty array in case of error
            errorMessage: "Error fetching products. Please try again later." // Optional error message
        });
        // Or, for API routes, you might want:
        // res.status(500).json({ error: "Error fetching products" });
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