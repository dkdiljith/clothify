const Cart = require('../models/cartSchema');
const { verifyProductVariation } = require('../utils/productHelper');
const { cartRender } = require(`../controllers/cartController`);

async function validateCartCheckout(req, res, next) {
  try {
    const userId = res.locals.user._id;
    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return next();
    }

    for (const item of cart.items) {
      const check = await verifyProductVariation(item.productId, item.variationIndex);

      // 1. Check if product or variation doesn't exist / is inactive
      if (!check.isValid) {
        // FIX: Use $elemMatch so the positional operator ($) targets the correct item array index
        await Cart.updateOne(
          { 
            userId, 
            items: { 
              $elemMatch: { productId: item.productId, variationIndex: item.variationIndex } 
            } 
          },
          { $set: { "items.$.isAvailable": false } }
        );

        res.locals.message = "item is not available, remove the item to proceed";
        return await cartRender(req, res);
      }

      // 2. Check if requested quantity exceeds available stock
      const productStock = check.variation.quantity;
      if (productStock < item.quantity) {
        if (productStock <= 0) {
          // FIX: Use $elemMatch here too
          await Cart.updateOne(
            { 
              userId, 
              items: { 
                $elemMatch: { productId: item.productId, variationIndex: item.variationIndex } 
              } 
            },
            { $set: { "items.$.isAvailable": false } }
          );
          
          res.locals.message = "item is not available, remove the item to proceed";
          return await cartRender(req, res);
        }

        // If stock is low but > 0, cap it and trigger the stock warning view
        // FIX: Use $elemMatch here too
        await Cart.updateOne(
          { 
            userId, 
            items: { 
              $elemMatch: { productId: item.productId, variationIndex: item.variationIndex } 
              } 
          },
          { $set: { "items.$.quantity": productStock, "items.$.isAvailable": true } }
        );
        
        res.locals.message = `Only ${productStock} units available in stock`;
        return await cartRender(req, res);
      }

      // 3. Reset to true if item was previously unavailable but is now back in stock
      if (item.isAvailable === false) {
        // FIX: Use $elemMatch here too
        await Cart.updateOne(
          { 
            userId, 
            items: { 
              $elemMatch: { productId: item.productId, variationIndex: item.variationIndex } 
            } 
          },
          { $set: { "items.$.isAvailable": true } }
        );
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = validateCartCheckout;
