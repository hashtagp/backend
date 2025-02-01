import Order from '../models/Order.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import dayjs from 'dayjs';

dotenv.config();
const filename = 'orderControllers.js';

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
    const isAdmin = req.headers.admin;
    if (isAdmin && !decoded.isAdmin) {
      console.log("Unauthorized access.");
      return res.status(401).json({ error: 'Unauthorized access.' });
    }
    req.user = decoded;
    console.log("Decoded user:", decoded);
    next();
  } catch (error) {
    console.log(`\nError in ${filename}/verifytoken`);
    console.log(error);
    console.error("Error verifying token:", error);
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Fetch All Orders
export const fetchAllOrders = async (req, res) => {
  try {
    const { date, filter } = req.query;

    // Validate date and filter
    if (!date || !filter) {
      return res.status(400).json({ success:false, message: "Date and filter are required." });
    }

    let startDate, endDate;

    // Determine the date range based on the filter
    switch (filter) {
      case "yearly":
        startDate = dayjs(date).startOf("year").toDate();
        endDate = dayjs(date).endOf("year").toDate();
        break;
      case "monthly":
        startDate = dayjs(date).startOf("month").toDate();
        endDate = dayjs(date).endOf("month").toDate();
        break;
      case "weekly":
        startDate = dayjs(date).startOf("week").toDate();
        endDate = dayjs(date).endOf("week").toDate();
        break;
      case "daily":
      default:
        startDate = dayjs(date).startOf("day").toDate();
        endDate = dayjs(date).endOf("day").toDate();
        break;
    }

    // Fetch orders within the date range
    const orders = await Order.find({
      orderDate: { $gte: startDate, $lte: endDate },
    });

    res.status(200).json({ success:true, orders });
  } catch (error) {
    console.log(`\nError in ${filename}/fetchAllOrders`);
    console.log(error);
    console.error("Error fetching orders:", error);
    res.status(500).json({ success:false, message: "Internal server error." });
  }
};

// Fetch Order by ID
export const fetchOrderById = async (req, res) => {
  try{
  const { orderId } = req.query;
  const order = await Order.findById(orderId);

  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.status(200).json(order);
} catch (error) {
  console.log(`\nError in ${filename}/fetchOrderById`);
  console.log(error);
  res.status(500).json({ error: 'Internal Server Error' });
}
};

// Add Item to Cart
export const addItemToCart = async (req, res) => {
  try{
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
}
catch (error) {
  console.log(`\nError in ${filename}/addItemToCart`);
  console.log(error);
  res.status(500).json({ error: 'Internal Server Error' });
}
};

// Create Order
export const createOrder = async (req, res) => {
  try{
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
}
catch (error) {
  console.log(`\nError in ${filename}/createOrder`);
  console.log(error);
  res.status(500).json({ error: 'Internal Server Error' });
}
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
  const { orderId, status, date } = req.body;

  
    const order = await Order.findById(orderId);
    console.log("updating order: ",order);
    console.log("Request by: ",req.user);
    if (!order) {
      return res.status(404).json({ success:false, error: 'Order not found' });
    }
    console.log("order updating");
    order[`${status}Date`] = date;
    await order.save();
    res.status(200).json({ success:true, order });
  } catch (error) {
    console.log(`\nError in ${filename}/updateOrderStatus`);
    console.log(error);
    res.status(400).json({ success:false, error });
  }
};

// Place Order
export const placeOrder = async (req, res) => {
  try {
    const { address, items, amount } = req.body;
    const userId = req.user.id;
    console.log("items in backend are: ", items);

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
    console.log(`\nError in ${filename}/placeOrder`);
    console.log(error);
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
    console.log(`\nError in ${filename}/verifyPayment`);
    console.log(error);
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
    console.log(`\nError in ${filename}/fetchUserOrders`);
    console.log(error);
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};