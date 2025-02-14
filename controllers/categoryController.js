const mongoose = require("mongoose")
const Category = require(`../models/categorySchema`)
const Product = require('../models/productSchema')










  //SHOW CATEGORIES IN CATEGORY PAGE
  exports.showCategories = async (req, res) => {
 
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

    res.render("admin/category", {
        admin: true,
        categories: groupedCategories, // Pass structured categories
    });

};



// ✅ Create a New Category
exports.addCategory =  async (req, res) => {

      const { name, parentCategory } = req.body;
  
      // Check if the category already exists
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ message: "Category already exists!" });
      }
  
      const newCategory = new Category({ name, parentCategory: parentCategory || null });
      await newCategory.save();

        res.redirect('/admin/category');
 
  }



// ✅ Update a Category
  exports.updateCategory =async (req, res) => {

      const { name, parentCategory } = req.body;
      const updatedCategory = await Category.findById(
        req.params.id,
        { name, parentCategory: parentCategory || null },
        { new: true }
      );
  
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found!" });
      }

      res.redirect('/admin/category');

  }


  // ✅ Delete a Category
  exports.deleteCategory = async (req, res) => {

      const deletedCategory = await Category.findByIdAndDelete(req.params.id);
  
      if (!deletedCategory) {
        return res.status(404).json({ message: "Category not found!" });
      }

      res.redirect('/admin/category');

  }


exports.editCategory = async(req,res)=>{
    const parentId = req.params.id;

    async function getSubcategoriesByParentId(parentId) {
 
            const mongoose = require('mongoose');
            const objectIdParentId = new mongoose.Types.ObjectId(parentId);
    
            const subcategories = await Category.aggregate([
                { $match: { parentCategory: objectIdParentId } },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'parentCategory',
                        foreignField: '_id',
                        as: 'parentCategoryDetails'
                    }
                },
                { $unwind: "$parentCategoryDetails" },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        parentCategory: "$parentCategoryDetails",
                    }
                }
            ]);
            return subcategories;

    }
  
    
            const subcategories = await getSubcategoriesByParentId(parentId);
            const parentCategory = await Category.findById(parentId).lean()
    
            if (!parentCategory) {
                return res.status(404).send("Parent category not found");
            }
    
            res.render('admin/editCategory', { // Render a different template
                admin:true,
                parentCategory: parentCategory,
                subcategories: subcategories
            });
    


}