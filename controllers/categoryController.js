const categoryService = require('../services/categoryService');



//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)
///////////////////////////////////////////////////////////////////////////////////////



exports.showCategories = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 3; // 3 parent categories per page
    // Get all categories using the service layer
    const categories = await categoryService.getAllCategories();
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
    return res.render("admin/category", {
      admin: true,
      categories: paginatedGroupedCategories,
      pagination: {
        page,
        limit,
        totalPages,
        nextPage: page + 1,
        prevPage: page - 1,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        serialNumberStart: (page - 1) * limit
      }
    });
  } catch {
    return res.render("admin/category", {
      admin: true,
      categories: [],
      pagination: {
        page: 1,
        limit: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        serialNumberStart: 0
      },
      errorMessage: "Error fetching categories. Please try again later."
    });
  }
};




//show edit category
exports.editCategoryRender = async (req, res) => {
  try {
    const parentId = req.params.id;
    const result = await categoryService.getCategoryEditData(parentId);
    if (!result.success) {
      return res.status(result.status).send(result.message);
    }
    return res.render("admin/editCategory", {
      admin: true,
      parentCategory: result.data.parentCategory,
      subcategories: result.data.subcategories
    });
  } catch {
    return res.status(500).send("Internal Server Error");
  }
};




// create new Category
exports.addCategory = async (req, res) => {
  try {
    const { name, parentCategory } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required!" });
    }
    const result = await categoryService.createCategory(name, parentCategory);
    return res.status(result.status).json({ message: result.message });
  } catch {
    return res.status(500).json({ message: `Internal Server Error` });
  }
};




exports.deleteCategory = async (req, res) => {
  try {
    const result = await categoryService.removeCategory(req.params.id);
    if (!result.success) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(result.status).json({ message: result.message });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};




// edit category
exports.editCategory = async (req, res) => {
  try {
    const { name, newSubcategory } = req.body;
    const categoryId = req.params.id;
    const result = await categoryService.updateCategory(categoryId, name, newSubcategory);
    if (!result.success) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(result.status).json({ message: result.message });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////APPLY OFFER FUNCTIONS//////////////////////
// Apply Offer Render Function
exports.applyOfferJson = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryService.getOfferRenderData(id);
    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }
    return res.status(200).json({
      success: true,
      category: result.data.category,
      offers: result.data.offers
    });
  } catch {
    return res.status(500).json({
      success: false,
    });
  }
};




// Apply Category Manual
exports.applyOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { offerId } = req.body;
    const result = await categoryService.applyCategoryOffer(id, offerId);
    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};




exports.autoPricing = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryService.resetCategoryPricing(id);
    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};