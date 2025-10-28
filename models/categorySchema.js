const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
      type: String,
      required: true,
      unique: true,
      trim: true
  },
  parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
  },
  offerId:{type:mongoose.Schema.Types.ObjectId, default:null}
} , { timestamps: true });

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
