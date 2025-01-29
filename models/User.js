import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  admin: {type: Boolean, default: false},
  cart: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true }, // Include price
      gst: { type: Number, required: true },
    }
  ],
});

const User = mongoose.model('User', UserSchema);

export default User;