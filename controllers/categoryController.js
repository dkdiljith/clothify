const Category = require(`../models/categorySchema`)


//show admin/category
exports.showCategories = async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 3; // 3 parent categories per page

        // Get all categories
        const categories = await Category.find().lean();
        
        // Group categories (parent with subcategories)
        const allGroupedCategories = categories
            .filter(cat => !cat.parentCategory)
            .map(parent => ({
                ...parent,
                subcategories: categories.filter(sub =>
                    sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
                )
            }));

        // Calculate pagination
        const totalParentCategories = allGroupedCategories.length;
        const totalPages = Math.ceil(totalParentCategories / limit);
        
        // Get paginated parent categories
        const startIndex = (page - 1) * limit;
        const paginatedGroupedCategories = allGroupedCategories.slice(startIndex, startIndex + limit);

        res.render("admin/category", {
            admin: true,
            categories: paginatedGroupedCategories,
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
        console.error("Error fetching categories:", error);
        res.render("admin/category", {
            admin: true,
            categories: [],
            pagination: {
                page: 1,
                limit: 3,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            },
            errorMessage: "Error fetching categories. Please try again later."
        });
    }
};


//show edit category
exports.editCategoryRender = async (req, res) => {
  const parentId = req.params.id;

  const parentCategory = await Category.findById(parentId).lean()
  let subcategories
  if (!parentCategory) {
    return res.status(404).send("Parent category not found");
  } else {
    subcategories = await Category.find({ parentCategory: parentCategory._id }).lean()
  }

  res.render('admin/editCategory', {
    admin: true,
    parentCategory,
    subcategories
  });
}



// create new Category
exports.addCategory = async (req, res) => {
  const { name, parentCategory } = req.body;

  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    return res.status(400).json({ message: "Category already exists!" });
  }

  const newCategory = new Category({ name, parentCategory: parentCategory || null });
  await newCategory.save();

  res.redirect('back');
}




// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found!" });
    }

    if (category.parentCategory == null) {

      // Find subcategories
      const subcategories = await Category.find({ parentCategory: category._id });

      // Collect IDs to delete
      const deleteCategories = [category._id, ...subcategories.map(sub => sub._id)];

      // Delete all categories
      await Promise.all(deleteCategories.map(id => Category.findByIdAndDelete(id)));
      res.status(200).json({ message: "Category and subcategories deleted successfully." });

    } else {

      await Category.findByIdAndDelete(req.params.id)
      res.status(200).json({ message: "Subcategory deleted successfully." });
    }

  } catch (error) {
    console.error("❌ Error deleting category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



// edit category
exports.editCategory = async (req, res) => {
  try {
    const { name, newSubcategory } = req.body;
    const categoryId = req.params.id;

    // 1. Update name if provided
    if (name) {
      await Category.findByIdAndUpdate(categoryId, {
        name: name.trim(),
        updatedAt: new Date()
      });
    }

    // 2. Add new subcategory if provided
    if (newSubcategory && newSubcategory.trim().length > 0) {

      const existingCategory = await Category.findOne({ name: newSubcategory });
      if (existingCategory) {
        return res.status(400).json({ message: "This Category exist." });
      }

      await Category.create({
        name: newSubcategory.trim(),
        parentCategory: categoryId,
      });
    }

    res.status(200).json({ message: "Category updated successfully" });

  } catch (err) {
    console.error("❌ Error updating category:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

