import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  discount: { type: Number, default: function() { return (this.price * 0.25) - 2; } },
  bundlesSold: { type: Number, default: function() { return Math.floor(this.name.length + this.description.length / 2); } },
  gst: { type: Number, default: function() { return this.category.endsWith('plant') ? this.price * 0.05 : this.price * 0.18; } },
});

const Product = mongoose.model('Product', ProductSchema);

export default Product;