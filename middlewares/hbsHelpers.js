
const moment = require('moment');

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
    if (!categoryId || !categories) return ""; 

    const category = categories.find(cat => cat._id.toString() === categoryId.toString());
    return category ? category.name : ""; 
  },
  eq: function (a, b) {
    if (!a || !b) return ""; 
    return a.toString() === b.toString() ? "selected" : "";
  },
  formatDate: function (date, format) {
    if (date) { 
        return moment(date).format(format);
    }
    return ''; 
}, getDetail: function(details, index, property) {
  if (details && details[index] && details[index][property]) {
      return details[index][property];
  }
  return null; 
},multiply: function (a, b) {
  if (a === null || a === undefined || b === null || b === undefined) {
      return 0; 
  }
  return a * b;
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
  return a>b;
},
range: function (start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
      result.push(i);
  }
  return result;
},
lt: function (a, b) {
  return a<b;
},
formatDate: function (date) {
  return new Date(date).toLocaleDateString(); // Format the date
},

//userOrderDetails
or: function () {
  const args = Array.prototype.slice.call(arguments, 0, -1);
  return args.some(Boolean);
},
neq:function (a, b) {
  return a!==b;
}

};