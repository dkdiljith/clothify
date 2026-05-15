const Category = require(`../models/categorySchema`)
const Offer = require(`../models/offerSchema`)
const Product = require(`../models/productSchema`)

//update offer & coupon & products
const pricingExpiry = require("../services/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

///////////////////////////////////////////////////////////////////////////////////////

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

  } catch (error) {
    console.error("Error fetching categories:", error);
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
    const parentId = req.params.id;

    const parentCategory = await Category.findById(parentId).lean();

    if (!parentCategory) {
        return res.status(404).send("Parent category not found");
    }

    const subcategories = await Category.find({
        parentCategory: parentCategory._id
    }).lean();

    const offers = await Offer.find(
        {},
        { _id: 1, offerCode: 1 }
    ).lean();

    const offerMap = {};

    offers.forEach(item => {
        offerMap[item._id.toString()] = item.offerCode;
    });

    const productCounts = await Product.aggregate([
        {
            $match: {
                categoryId: { $in: subcategories.map(item => item._id) }
            }
        },
        {
            $group: {
                _id: "$categoryId",
                count: { $sum: 1 }
            }
        }
    ]);

    const countMap = {};

    productCounts.forEach(item => {
        countMap[item._id.toString()] = item.count;
    });

    const updatedSubcategories = subcategories.map(item => ({
        ...item,
        productCount: countMap[item._id.toString()] || 0,
        offerCode: item.offerId
            ? offerMap[item.offerId.toString()] || ""
            : ""
    }));

    return res.render("admin/editCategory", {
        admin: true,
        parentCategory,
        subcategories: updatedSubcategories
    });
};


// create new Category
exports.addCategory = async (req, res) => {
  const { name, parentCategory } = req.body;

  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    return res.status(400).json({ message: "Category already exists!" });
  }

  const newCategory = new Category({ name, parentCategory: parentCategory || null });
  await newCategory.save();

  return res.redirect('back');
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
      return res.status(200).json({ message: "Category and subcategories deleted successfully." });

    } else {

      await Category.findByIdAndDelete(req.params.id)
      return res.status(200).json({ message: "Subcategory deleted successfully." });
    }

  } catch (error) {
    console.error("❌ Error deleting category:", error);
    return res.status(500).json({ message: "Internal Server Error" });
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

    return res.status(200).json({ message: "Category updated successfully" });

  } catch (err) {
    console.error("❌ Error updating category:", err);
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
    const now = new Date();

    const category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found."
      });
    }

    const offers = await Offer.find({
      offerType: "subcategory",
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      targetIds: id
    }).lean();

    return res.status(200).json({
      success: true,
      category,
      offers
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Apply Category Manual
exports.applyOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { offerId } = req.body;
    const now = new Date();

    const category = await Category.findById(id);
    const offer = await Offer.findById(offerId).lean();
    const products = await Product.find({ categoryId: id });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found."
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

    if (offer.offerType !== "subcategory") {
      return res.status(400).json({
        success: false,
        message: "This offer is not a subcategory offer."
      });
    }

    const targetMatch = offer.targetIds.some(item => item.toString() === id);

    if (!targetMatch) {
      return res.status(400).json({
        success: false,
        message: "This offer does not belong to this subcategory."
      });
    }

    let appliedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      product.details.forEach(detail => {
        const originalPrice = detail.price;

        detail.offerId = null;
        detail.offerPrice = 0;
        detail.offerLocked = false;

        let newPrice = originalPrice;

        if (offer.discountType === "percentage") {
          newPrice = originalPrice - (originalPrice * offer.discountValue) / 100;
        } else {
          newPrice = originalPrice - offer.discountValue;
        }

        if (newPrice <= 0) return;
        if (newPrice < originalPrice * 0.20) return;

        newPrice = Math.round(newPrice);

        detail.offerId = offer._id;
        detail.offerPrice = newPrice;
        detail.offerLocked = true;

        appliedCount++;
      });

      await product.save();
    }

    category.offerId = null
    category.offerLocked = false

    category.offerId = offer._id;
    category.offerLocked = true;

    await category.save();
    await pricingExpiryUpdate();

    return res.status(200).json({
      success: true,
      message: "Manual category offer applied successfully."
    });

  } catch (error) {
    console.log("category applyOffer failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};


// Remove Category Manual 
exports.autoPricing = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    const products = await Product.find({ categoryId: id });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found."
      });
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      product.details.forEach(detail => {
        detail.offerId = null;
        detail.offerPrice = 0;
        detail.offerLocked = false;
      });

      await product.save();
    }

    category.offerId = null;
    category.offerLocked = false;

    await category.save();
    await pricingExpiryUpdate();

    return res.status(200).json({
      success: true,
      message: "Automatic pricing enabled successfully."
    });

  } catch (error) {
    console.log("category autoPricing failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};