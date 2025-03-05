import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import User from '../models/User.js';
import Product from '../models/Product.js'; // Ensure this import is correct

const cartRoutes = express.Router();
const filename = "cart.js";

// Add item to cart
cartRoutes.post('/add', verifyToken, async (req, res) => {
  const { itemId, quantity } = req.body;
  const userId = req.user.id;
  console.log(`Adding item to cart: userId=${userId}, itemId=${itemId}, quantity=${quantity}`);

  try {
    const user = await User.findById(userId);
    const product = await Product.findById(itemId); // Fetch product details
  
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
  
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
  
    const itemIndex = user.cart.findIndex(item => item.itemId.toString() === itemId);
    console.log("product:", product);
  
    if (itemIndex > -1) {
      user.cart[itemIndex].quantity += quantity;
    } else {
      user.cart.push({ itemId, quantity, price: product.price, gst: product.gst, discount: product.discount }); // Include price and gst
    }
  
    await user.save();
    console.log("Cart after adding item:", user.cart);
    res.status(200).json(user.cart);
  } catch (error) {
    console.log(`\nError in ${filename}/add`);
    console.log(error);
    console.error("Error adding item to cart:", error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Remove item from cart
cartRoutes.post('/remove', verifyToken, async (req, res) => {
  const { itemId } = req.body;
  const userId = req.user.id;
  console.log(`Removing item from cart: userId=${userId}, itemId=${itemId}`);

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const itemIndex = user.cart.findIndex(item => item.itemId.toString() === itemId);

    if (itemIndex > -1) {
      user.cart[itemIndex].quantity -= 1;
      if (user.cart[itemIndex].quantity <= 0) {
        user.cart.splice(itemIndex, 1);
      }
    }

    await user.save();
    console.log("Cart after removing item:", user.cart);
    res.status(200).json(user.cart);
  } catch (error) {
    console.log(`\nError in ${filename}/remove`);
    console.log(error);
    console.error("Error removing item from cart:", error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Get cart data
cartRoutes.post('/get', verifyToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`Fetching cart data for userId=${userId}`);

  try {
    const user = await User.findById(userId).populate('cart.itemId'); // Populate product details

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("Fetched cart data:", user.cart);
    const cartData = user.cart.map(item => ({
      itemId: item.itemId._id,
      name: item.itemId.name,
      price: item.itemId.price,
      quantity: item.quantity,
      image: item.itemId.image, // Assuming the product has an image field
      gst: item.itemId.gst,
    }));

    console.log("Fetched cart data:", cartData);
    res.status(200).json(cartData);
  } catch (error) {
    console.log(`\nError in ${filename}/get`);
    console.log(error);
    console.error("Error fetching cart data:", error);
    res.status(500).json({ error: 'Failed to fetch cart data' });
  }
});

export default cartRoutes;