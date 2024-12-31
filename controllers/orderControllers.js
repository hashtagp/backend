import Order from '../models/Order.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

// Middleware to verify JWT
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log("Token received:", token);

  if (!token) {
    console.log("No token provided.");
    return res.status(403).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("Decoded user:", decoded);
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Fetch All Orders
export const fetchAllOrders = async (req, res) => {
  const orders = await Order.find({ userId: req.userId });
  res.status(200).json(orders);
};

// Fetch Order by ID
export const fetchOrderById = async (req, res) => {
  const { orderId } = req.query;
  const order = await Order.findById(orderId);

  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.status(200).json(order);
};

// Add Item to Cart
export const addItemToCart = async (req, res) => {
  const { itemId, quantity } = req.body;

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existingItem = user.cart.find(item => item.itemId === itemId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    user.cart.push({ itemId, quantity });
  }

  await user.save();
  res.status(200).json(user.cart);
};

// Create Order
export const createOrder = async (req, res) => {
  const { items, totalAmount, payment } = req.body;

  const newOrder = new Order({
    userId: req.userId,
    items,
    totalAmount,
    payment,
    status: 'Pending',
  });

  try {
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ error });
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order || order.userId !== req.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ error });
  }
};

// Place Order
export const placeOrder = async (req, res) => {
  try {
    const { address, items, amount } = req.body;
    const userId = req.user.id;
    console.log("items in backend are: ", items);

    console.log("r key", process.env.RAZORPAY_KEY_ID);
    console.log("r secret", process.env.RAZORPAY_KEY_SECRET);

    const newOrder = new Order({
      userId,
      items,
      address,
      totalAmount: amount,
      status: 'Pending',
      payment: {
        method: 'Razorpay',
        status: false,
      },
    });

    await newOrder.save();

    // Create Razorpay order
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: newOrder._id.toString(),
    };

    const order = await instance.orders.create(options);

    res.status(201).json({
      success: true,
      newOrderId: newOrder._id,
      orderId: order.id,
      amount: options.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const { success, orderId } = req.body;

    if (success) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      order.payment.status = true;
      order.status = 'Confirmed';
      await order.save();

      // Find the user and empty their cart
      const user = await User.findById(order.userId);
      if (user) {
        user.cart = [];
        await user.save();
      }

      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Fetch User Orders
export const fetchUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId });

    res.status(200).json({ data: orders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};