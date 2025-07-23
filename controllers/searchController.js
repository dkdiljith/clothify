const mongoose = require(`mongoose`)

const Product = require("../models/productSchema");
const Order = require(`../models/orderSchema`)
const User = require(`../models/userSchema`)
const Category = require(`../models/categorySchema`)
const Coupon = require(`../models/couponSchema`)
const Offer = require(`../models/offerSchema`)
const Activity_Log = require(`../models/activity-log`)




exports.collections = async (req, res) => {
  try {
    const { query, sort, page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;
    let productsQuery;

    // Base query
    if (query) {
      productsQuery = Product.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { gender: { $regex: query, $options: 'i' } }
        ],
      });
    } else {
      productsQuery = Product.find({});
    }

    // Apply sorting directly in the query for better performance
    switch (sort) {
      case 'price-low-high':
        productsQuery.sort({ 'details.0.price': 1 });
        break;
      case 'price-high-low':
        productsQuery.sort({ 'details.0.price': -1 });
        break;
      case 'name-a-z':
        productsQuery.sort({ name: 1 });
        break;
      case 'newest':
        productsQuery.sort({ createdAt: -1 });
        break;
      default:
        productsQuery.sort({ createdAt: -1 }); // Default sorting
    }

    // Get total count for pagination
    const total = await Product.countDocuments(productsQuery._conditions);

    // Apply pagination
    productsQuery.skip(skip).limit(parseInt(limit));

    const products = await productsQuery.lean();

    if (!products || products.length === 0) {
      return res.render('user/collections', {
        products: [],
        query,
        sort,
        message: 'No products found. Try different search criteria.'
      });
    }

    res.render('user/collections', {
      products,
      query,
      sort,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalProducts: total
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).render('error', {
      message: 'Server error occurred while fetching products'
    });
  }
};







exports.products = async (req, res) => {
  try {

    const query = req.query.query || '';

    // Build search query
    let searchQuery
    if (query) {
      searchQuery = Product.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { gender: { $regex: query, $options: 'i' } }
        ],
      });
    } else {
      searchQuery = Product.find({});
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // 5 products per page
    const skip = (page - 1) * limit;

    // Get total count of products
    const totalProducts = await Product.countDocuments(searchQuery._conditions);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get paginated products (newest first)
    searchQuery.skip(skip).limit(parseInt(limit));
    const products = await searchQuery.lean();
    const categories = await Category.find().lean();

    res.render('admin/products', {
      admin: true,
      products: products,
      categories: categories,
      query: query,
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
      query: query,
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





exports.orders = async (req, res) => {
  try {

    const query = req.query.query || '';

    // Build search query
    let searchQuery 
    if (query) {
      const mongooseQuery = new mongoose.Types.ObjectId(query)
      searchQuery = await Order.find({_id:mongooseQuery})
    } else {
      searchQuery = Order.find({});
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5; //limiti 5
    const skip = (page - 1) * limit;

    // Get total count of products
    const totalProducts = await Order.countDocuments(searchQuery._conditions);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get paginated products (newest first)
    searchQuery.skip(skip).limit(parseInt(limit));
    const orders = await searchQuery.lean();

    res.render('admin/orders', {
      order: orders,
      admin: true,
      query,
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
    console.error("Error fetching orders:", error);
    res.render('admin/orders', {
      order: [],
      admin: true,
      query,
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      errorMessage: "Error fetching orders. Please try again later."
    });
  }
};







exports.users = async (req, res) => {
  try {

    //search
    const query = req.query.query || '';

    // Build search query
    let searchQuery
    if (query) {
      searchQuery = User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ],
      });
    } else {
      searchQuery = User.find({});
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // 5 users per page
    const skip = (page - 1) * limit;

    // Get total count of users
    const totalUsers = await Order.countDocuments(searchQuery._conditions);
    const totalPages = Math.ceil(totalUsers / limit);

    // Get paginated products (newest first)
    searchQuery.skip(skip).limit(parseInt(limit));
    const users = await searchQuery.lean()

    res.render('admin/usersList', {
      admin: true,
      user: users,
      query,
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
    console.error("Error fetching users:", error);
    res.render('admin/usersList', {
      admin: true,
      user: [],
      query,
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      errorMessage: "Error fetching users. Please try again later."
    });
  }
};










exports.coupons = async (req, res) => {
  try {
    
    const query = req.query.query || '';

    // Build search query
    let searchQuery
    if (query) {
      searchQuery = Coupon.find({
        $or: [
          { couponCode: { $regex: query, $options: 'i' } },
          { discountType: { $regex: query, $options: 'i' } },
          { isActive: { $regex: query, $options: 'i' } }
        ],
      });
    } else {
      searchQuery = Coupon.find({});
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // 5 products per page
    const skip = (page - 1) * limit;

    // Get total count of products
    const totalProducts = await Coupon.countDocuments(searchQuery._conditions);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get paginated products (newest first)
    searchQuery.skip(skip).limit(parseInt(limit));
    const coupons = await searchQuery.lean();

    res.render('admin/coupon', {
      coupon: coupons,
      admin: true,
      query,
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
    console.error("Error fetching coupons:", error);
    res.render('admin/coupon', {
      coupon: [],
      admin: true,
      query,
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      errorMessage: "Error fetching coupons. Please try again later."
    });
  }
};











exports.offers = async (req, res) => {
  const offer = await Offer.find().lean()
  const product = await Product.find().lean()

  if (offer) {
    for (let i = 0; i < offer.length / 2; i++) {
      let temp = offer[i]
      offer[i] = offer[offer.length - 1 - i]
      offer[offer.length - 1 - i] = temp
    }
  }

  const categories = await Category.find().lean()
  const groupedCategories = categories
    .filter(cat => !cat.parentCategory)
    .map(parent => ({
      ...parent,
      subcategories: categories.filter(sub =>
        sub.parentCategory && sub.parentCategory.toString() === parent._id.toString()
      )
    }));

  console.log(groupedCategories, "this si sgroup categoris")

  res.render(`admin/offer`, { offer, product, categories: groupedCategories, admin: true })
}


