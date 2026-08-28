import mongoose from 'mongoose';


const activityLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true,
    enum: [
      'product_create', 'product_update', 'product_delete',
      'order_update', 'refund_processed',
      'user_modified', 'user_banned',
      'promotion_created', 'discount_modified',
      'inventory_adjusted', 'content_updated'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['product', 'order', 'user', 'promotion', 'content', 'inventory']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  changes: {
    type: Object,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const activityLogs = mongoose.model('activityLogs',activityLogSchema );
module.exports = activityLogs;