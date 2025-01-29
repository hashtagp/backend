import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  address: { type: Object, required: true },
  orderDate: { type: Date, default: Date.now },
  estimatedDate: { 
    type: Date, 
    default: function() {
      return new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 3 days from now
    }
  },
  shippedDate: { 
    type: Date, 
  },
  deliveredDate: { 
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
  totalAmount: { type: Number, required: true },
  status: { type: String, required: true, default: 'Pending' }, // New field
  payment: {
    method: { type: String, required: true },
    status: { type: Boolean, required: true, default: false },
  }, // New field
});

const Order = mongoose.model('Order', OrderSchema);

export default Order;