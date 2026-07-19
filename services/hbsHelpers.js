
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
  ifEquals: function (arg1, arg2, options) {
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  },
  getSubcategories: function (subcategories) {
    return subcategories.length > 0 ? subcategories.map(sub => sub.name).join(", ") : "-";
  },
  getCategoryName: function (categoryId, categories) {
    if (!categoryId || !categories) return "";

    const category = categories.find(cat => cat._id.toString() === categoryId.toString());
    return category ? category.name : "";
  },
  eq: function (a, b) {
    if (!a || !b) return "";
    return a.toString() === b.toString() ? "selected" : "";
  },

  getDetail: function (details, index, property) {
    if (details && details[index] && details[index][property]) {
      return details[index][property];
    }
    return null;
  },




  lookup: function (productDetails, productId) {
    if (!productDetails || !productId) return null;
    return productDetails.find(p => p._id.toString() === productId.toString());
  },

  multiply: function (a, b) {
    return a * b;
  },

  add: function (a, b) {
    return a + b;
  },

  cartSubtotal: function (items, productDetails) {
    let subtotal = 0;
    if (items && productDetails) {
      items.forEach(item => {
        const product = productDetails.find(p => p._id.toString() === item.productId.toString());
        if (product && product.details && product.details[item.variationIndex]) {
          subtotal += item.quantity * product.details[item.variationIndex].price;
        } else {
          console.error("Product or details not found for item:", item);
        }
      });
    }
    return subtotal;
  },
  //profileOrders
  gt: function (a, b) {
    return a > b;
  },
  range: function (start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  },
  lt: function (a, b) {
    return a < b;
  },
  formatDate: function (date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  },

  //userOrderDetails
  or: function () {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.some(Boolean);
  },
  neq: function (a, b) {
    return a !== b;
  },
  paymentMethod: function (method) {
    switch (method) {
      case "razorpay":
        return "Razorpay";

      case "wallet":
        return "Wallet";

      case "cod":
        return "Cash on Delivery";

      default:
        return method;
    }
  },
  formatPrice: function (value) {
    if (value === undefined || value === null) {
      return "0";
    }
    return Number(value).toLocaleString("en-IN");
  },

  //coupon
  incrementedIndex: function (index) {
    return index + 1; // Increment the index by 1
  },
  formatDateInput: function (date) {
    if (!date) return '';

    // Force date into YYYY-MM-DD format
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Ensure two digits
    const day = String(d.getDate()).padStart(2, '0');         // Ensure two digits

    return `${year}-${month}-${day}`;  // Return in YYYY-MM-DD format
  },

  //productListing
  json: function (context) {
    return JSON.stringify(context);
  },

  //edit offer
  contains: function (array, value) {
    if (!array || !Array.isArray(array)) return false;
    return array.includes(value);
  },

  //wihlist
  isEmpty: function (array) {
    return !array || array.length === 0;
  },

  //cart
  lte: function (a, b) {
    return a <= b;
  },
  //user order
  toLowerCase: function (str) {
    if (str && typeof str === 'string') {
      return str.toLowerCase();
    }
    return ''; // Or handle non-string values as needed
  },
  ifeq: function (a, b, options) {
    if (a === b) {
      return options.fn(this);
    }
    return options.inverse(this);
  },

  //product listing page
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b),


  //Admin 
  subtract: function (a, b) {
    return parseFloat(a) - parseFloat(b);
  },
  replaceSpaceWithHyphen: function (str) {
    return str.replace(/\s+/g, '-');
  },
  hasReturnRequest: function (items) {
    return items.some(item => item.status === 'Return Requested');
  },

  //productCArd
  calculateDiscountPercentage: function (originalPrice, discountPrice) {
    return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  },
  subtractDiscountPrice: function (price, discount) {
    return price - discount;
  },
  //sales report
  shortId: function (objectId) {
    return objectId.toString().substring(18, 24);
  },
  serialNumber: function (a, b) {
    return Number(a) + Number(b) + 1;
  },

  //offer page helper
  capitalize: function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  and: function () {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.every(Boolean);
  },

  //referral page
  initial: function (name) {
    if (!name) return "";
    return name.charAt(0).toUpperCase();
  },

  coinValuePreview: function (coinValue) {
    if (!coinValue) return "100 Coins = ₹0";

    return `100 Coins = ₹${100 * Number(coinValue)}`;
  },
  coinValue: (coins, value) => {
    return (Number(coins) * Number(value)).toFixed(2);
  }
};

