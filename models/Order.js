import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  address: { type: Object, required: true },
  orderDate: { type: Date, default: Date.now },
  estimatedDate: { 
    type: Date, 
    default: function() {
      return new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
    }
  },
  shippedDate: { 
    type: Date, 
  },
  deliveredDate: { 
    type: Date,
  },
  cancelledDate: { 
    type: Date,
  },
  items: [
    {
      itemId: String,
      name: String,
      image: String,
      price: Number,
      quantity: Number,
      gst: Number,
    },
  ],
  // Financial breakdown
  itemTotal: { type: Number, required: true }, // Subtotal before tax/shipping
  shippingCharges: { type: Number, required: true, default: 0 },
  salesTax: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, required: true, default: 'Pending' }, // New field
  payment: {
    method: { type: String, required: true },
    status: { type: Boolean, required: true, default: false },
  }, // New field
  coupon: {
    code: { type: String },
    discountAmount: { type: Number },
    discountType: { type: String, enum: ['percentage', 'fixed'] }
  },
  customization: {
    required: { type: Boolean, default: false },
    details: { type: String }
  }
});

const Order = mongoose.model('Order', OrderSchema);

export default Order;