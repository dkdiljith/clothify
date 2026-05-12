const mongoose = require(`mongoose`)
const Product = require("../models/productSchema");

//MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)


//////////////////////////////////////////////////////////////////////////////////////////////


exports.collections = async (req, res) => {
  try {
    let { query, sort, page = 1, limit = 12 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;

    const skip = (page - 1) * limit;

    let filter = {};
    let sortOption = { createdAt: -1 };
    let useTextScore = false;

    if (query && query.trim()) {
      const cleanQuery = query.trim();

      const isShortQuery =
        cleanQuery.length <= 3 || cleanQuery.split(" ").length === 1;

      if (isShortQuery) {
        // partial typing mode
        filter = {
          $or: [
            { name: { $regex: cleanQuery, $options: "i" } },
            { description: { $regex: cleanQuery, $options: "i" } },
            { gender: { $regex: cleanQuery, $options: "i" } }
          ]
        };
      } else {
        // full phrase mode
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

    const [products, totalProducts] = await Promise.all([
      productQuery,
      Product.countDocuments(filter)
    ]);

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

