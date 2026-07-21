const Product = require("../models/productSchema");
const Wishlist = require(`../models/wishListSchema`)

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)


//////////////////////////////////////////////////////////////////////////////////////////////


exports.collections = async (req, res) => {
  try {

    let { query, sort, page = 1, limit = 8 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 8;

    const skip = (page - 1) * limit;

    let filter = {};
    let sortOption = { createdAt: -1 };
    let useTextScore = false;

    if (query && query.trim()) {

      const cleanQuery = query.trim();

      const isShortQuery =
        cleanQuery.length <= 3 || cleanQuery.split(" ").length === 1;

      if (isShortQuery) {

        filter = {
          $or: [
            { name: { $regex: cleanQuery, $options: "i" } },
            { description: { $regex: cleanQuery, $options: "i" } },
            { gender: { $regex: cleanQuery, $options: "i" } }
          ]
        };

      } else {

        filter = {
          $text: { $search: cleanQuery }
        };

        sortOption = {
          score: { $meta: "textScore" }
        };

        useTextScore = true;

      }

    }

    switch (sort) {

      case "price-low-high":
        sortOption = { "details.price": 1 };
        break;

      case "price-high-low":
        sortOption = { "details.price": -1 };
        break;

      case "name-a-z":
        sortOption = { name: 1 };
        break;

      case "newest":
        sortOption = { createdAt: -1 };
        break;

    }

    let productQuery = Product.find(filter)
      .select("name description images details gender latestCollection bestSeller createdAt")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    if (useTextScore) {
      productQuery = productQuery.select({
        score: { $meta: "textScore" }
      });
    }

    const userId = res.locals.user?._id || null;

    const [products, totalProducts, wishlist] = await Promise.all([

      productQuery,

      Product.countDocuments(filter),

      userId
        ? Wishlist.findOne({ userId }).lean()
        : null

    ]);

    // =====================================================
    // MARK WISHLISTED PRODUCTS
    // =====================================================

    if (wishlist?.items) {

      const wishlistSet = new Set(
        wishlist.items.map(item => item.productId.toString())
      );

      products.forEach(product => {
        product.isWishlisted = wishlistSet.has(product._id.toString());
      });

    }

    return res.render("user/collections", {
      products,
      query,
      sort,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts
    });

  } catch (error) {

    console.error("collections failed:", error.message);

    return res.status(500).render("error", {
      message: "Unable to load collections"
    });

  }
};