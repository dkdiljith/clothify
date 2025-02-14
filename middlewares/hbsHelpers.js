

///////////////////////////////////HBS HELPERS////////////////////////////////////////////////////////

module.exports = {
  ifCond: function (v1, operator, v2, options) {
    switch (operator) {
      case '==':
        return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case '===':
        return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case '!=':
        return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case '!==':
        return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case '<':
        return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case '<=':
        return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case '>':
        return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case '>=':
        return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  },
  getParentCategoryName: function (parentCategory) {
    if (parentCategory) {
      return parentCategory.name;
    } else {
      return "-";
    }
  },
  getSubcategories: function (subcategories) {
    return subcategories.length > 0 ? subcategories.map(sub => sub.name).join(", ") : "-";
  },
  getCategoryName: function (categoryId, categories) {
    if (!categoryId || !categories) return ""; // Handle missing data

    const category = categories.find(cat => cat._id.toString() === categoryId.toString());
    return category ? category.name : ""; // Return name or empty string if not found
  },
  eq: function (a, b) {
    if (!a || !b) return ""; // Return an empty string if either value is undefined or null
    return a.toString() === b.toString() ? "selected" : "";
  }
};