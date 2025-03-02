import Order from '../models/Order.js';
import User from '../models/User.js';
import Coupon from '../models/coupon.js';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import axios from 'axios'; // Make sure axios is imported

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
    console.log(`\nError in ${filename}/verifyToken`);
    console.log(error);
    if (error.name === 'TokenExpiredError') {
      console.error("Token expired:", error);
      return res.status(401).json({ error: 'Token expired.' });
    }
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
      orderDate: { $gte: startDate, $lte: endDate }, status: "Confirmed"
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
    const { address, items, amount, itemTotal, shippingCharge, salesTax, couponCode, payment, customization } = req.body;
    const userId = req.user.id;
    console.log("items in backend are: ", items);
    console.log("payment method:", payment?.method);

    // Create the new order object with all relevant data
    const newOrder = new Order({
      userId,
      items,
      address,
      totalAmount: amount,
      itemTotal,
      shippingCharge,
      salesTax,
      status: 'Pending',
      payment: {
        method: payment?.method || 'razorpay',
        status: false,
      },
      customization
    });

    // If coupon was applied, save the coupon information
    if (couponCode) {
      // Find the coupon to get details
      const coupon = await Coupon.findOne({ code: couponCode });
      if (coupon) {
        newOrder.coupon = {
          code: couponCode,
          discountAmount: req.body.couponDiscount || 0,
          discountType: coupon.discountType
        };

        // Increment coupon usage count
        coupon.usageCount += 1;
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
          coupon.isActive = false;
        }
        await coupon.save();
      }
    }

    await newOrder.save();
    
    // Handle payment method-specific logic
    if (newOrder.payment.method === 'cod') {
      // For COD, we don't need to create a Razorpay order
      return res.status(201).json({
        success: true,
        newOrderId: newOrder._id
      });
    } else {
      // Create Razorpay order for online payments
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

      return res.status(201).json({
        success: true,
        newOrderId: newOrder._id,
        orderId: order.id,
        amount: amount,
        key: process.env.RAZORPAY_KEY_ID,
      });
    }
  } catch (error) {
    console.log(`\nError in ${filename}/placeOrder`);
    console.log(error);
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Verify Payment
export const verifyPayment = async (req, res) => {
  try {
    const { success, orderId } = req.body;
    
    // First, find the order regardless of success parameter
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Determine what to do based on payment method and success value
    if (success) {
      // For all successful order placements
      if (order.payment.method === 'razorpay') {
        // For Razorpay, mark payment as completed
        order.payment.status = true;
      }
      // Note: For COD, payment status remains false
      
      // For all orders with success=true, confirm the order
      order.status = 'Confirmed';
      await order.save();

      // Find the user and empty their cart for all confirmed orders
      const user = await User.findById(order.userId);
      if (user) {
        user.cart = [];
        await user.save();
      }

      // Log coupon usage if applicable
      if (order.coupon && order.coupon.code) {
        console.log(`Coupon ${order.coupon.code} was used in order ${orderId}`);
      }

      return res.status(200).json({ 
        success: true, 
        message: order.payment.method === 'razorpay' 
          ? 'Payment verified successfully' 
          : 'Order placed successfully with COD',
        orderDetails: {
          orderId: order._id,
          status: order.status,
          totalAmount: order.totalAmount,
          paymentMethod: order.payment.method
        }
      });
    } else {
      // This handles cases where success=false (payment failed, etc.)
      res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed' 
      });
    }
  } catch (error) {
    console.log(`\nError in ${filename}/verifyPayment`);
    console.log(error);
    console.error("Error verifying payment:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message 
    });
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


// Calculate Shipping Charge - using free alternatives
export const calculateShippingCharge = async (req, res) => {
  try {
    console.log(`\n[${filename}/calculateShippingCharge] Starting shipping calculation`);
    const { address } = req.body;
    console.log(`[${filename}/calculateShippingCharge] Address received:`, JSON.stringify(address));

    // List of valid Bangalore pincodes
    const bangalorePincodes = [
      '560001', '560002', '560003', '560004', '560005', '560006', '560007', '560008', '560009',
      '560010', '560011', '560012', '560013', '560014', '560015', '560016', '560017', '560018',
      '560019', '560020', '560021', '560022', '560023', '560024', '560025', '560026', '560027',
      '560028', '560029', '560030', '560032', '560033', '560034', '560035', '560036', '560037',
      '560038', '560039', '560040', '560041', '560042', '560043', '560045', '560046', '560047',
      '560048', '560049', '560050', '560051', '560052', '560053', '560054', '560055', '560056',
      '560057', '560058', '560059', '560060', '560061', '560062', '560063', '560064', '560065',
      '560066', '560067', '560068', '560069', '560070', '560071', '560072', '560073', '560074',
      '560075', '560076', '560077', '560078', '560079', '560080', '560081', '560082', '560083',
      '560084', '560085', '560086', '560087', '560088', '560089', '560090', '560091', '560092',
      '560093', '560094', '560095', '560096', '560097', '560098', '560099', '560100', '560102'
    ];

    // Check if postal code is a valid Bangalore pincode
    if (!bangalorePincodes.includes(address.postalCode)) {
      console.log(`[${filename}/calculateShippingCharge] ERROR: Invalid Bangalore pincode: ${address.postalCode}`);
      return res.status(400).json({
        success: false,
        message: 'We currently only deliver to Bangalore area'
      });
    }
    
    console.log(`[${filename}/calculateShippingCharge] Valid Bangalore pincode: ${address.postalCode}`);

    // Store location coordinates (you should store these in your environment variables)
    const STORE_LOCATION = {
      lat: process.env.STORE_LAT, // Default to Bangalore center
      lng: process.env.STORE_LNG 
    };
    console.log(`[${filename}/calculateShippingCharge] Store location:`, STORE_LOCATION);

    // Format the complete address
    const fullAddress = `${address.street}, ${address.city}, ${address.state}, ${address.postalCode}, India`;
    console.log(`[${filename}/calculateShippingCharge] Formatted address: "${fullAddress}"`);
    
    // Get Mapbox access token from environment variables
    const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
    if (!MAPBOX_TOKEN) {
      console.log(`[${filename}/calculateShippingCharge] ERROR: Mapbox token not configured`);
      return res.status(500).json({
        success: false,
        message: 'Shipping calculation service not properly configured'
      });
    }
    
    // Step 1: Geocode the user's address using Mapbox Geocoding API
    console.log(`[${filename}/calculateShippingCharge] Calling Mapbox geocoding API...`);
    const geocodeURL = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    console.log(`[${filename}/calculateShippingCharge] Geocode URL: ${geocodeURL}`);
    
    const geocodeResponse = await axios.get(geocodeURL);
    
    console.log(`[${filename}/calculateShippingCharge] Geocoding response status: ${geocodeResponse.status}`);
    console.log(`[${filename}/calculateShippingCharge] Geocoding features count: ${geocodeResponse.data?.features?.length || 0}`);
    
    if (!geocodeResponse.data || !geocodeResponse.data.features || geocodeResponse.data.features.length === 0) {
      console.log(`[${filename}/calculateShippingCharge] ERROR: Could not geocode address`);
      return res.status(400).json({
        success: false,
        message: 'Could not find coordinates for the address'
      });
    }
    
    // Mapbox returns coordinates as [longitude, latitude]
    const coordinates = geocodeResponse.data.features[0].center;
    const userLocation = {
      lng: coordinates[0],
      lat: coordinates[1]
    };
    console.log(`[${filename}/calculateShippingCharge] User coordinates:`, userLocation);
    
    // Step 2: Calculate distance using Mapbox Directions API
    console.log(`[${filename}/calculateShippingCharge] Calling Mapbox directions API...`);
    
    // Format: {longitude},{latitude};{longitude},{latitude}
    const coordinatesString = `${STORE_LOCATION.lng},${STORE_LOCATION.lat};${userLocation.lng},${userLocation.lat}`;
    const directionsURL = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?access_token=${MAPBOX_TOKEN}&overview=false`;
    
    console.log(`[${filename}/calculateShippingCharge] Directions URL: ${directionsURL}`);
    
    const directionsResponse = await axios.get(directionsURL);
    
    console.log(`[${filename}/calculateShippingCharge] Directions response status: ${directionsResponse.status}`);
    console.log(`[${filename}/calculateShippingCharge] Directions code: ${directionsResponse.data?.code}`);
    
    if (!directionsResponse.data || !directionsResponse.data.routes || directionsResponse.data.routes.length === 0) {
      console.log(`[${filename}/calculateShippingCharge] ERROR: Could not calculate route distance`);
      return res.status(400).json({
        success: false,
        message: 'Could not calculate distance'
      });
    }
    
    // Get distance in kilometers (Mapbox returns distance in meters)
    const distanceInMeters = directionsResponse.data.routes[0].distance;
    const distanceInKm = distanceInMeters / 1000;
    console.log(`[${filename}/calculateShippingCharge] Distance: ${distanceInMeters}m (${distanceInKm.toFixed(2)}km)`);
    
    // Get duration in minutes (Mapbox returns duration in seconds)
    const durationInSeconds = directionsResponse.data.routes[0].duration;
    const durationInMinutes = Math.ceil(durationInSeconds / 60);
    
    // Calculate shipping charge based on tiered pricing
    let ratePerKm;
    
    if (distanceInKm < 5) {
      ratePerKm = 2; // ₹2 per km for < 5km
    } else if (distanceInKm < 10) {
      ratePerKm = 4; // ₹4 per km for 5-10km
    } else if (distanceInKm < 20) {
      ratePerKm = 5; // ₹5 per km for 10-20km
    } else if (distanceInKm < 25) {
      ratePerKm = 6; // ₹6 per km for 20-25km
    } else if (distanceInKm < 30) {
      ratePerKm = 7; // ₹7 per km for 25-30km
    } else if (distanceInKm < 35) {
      ratePerKm = 8; // ₹8 per km for 30-35km
    } else if (distanceInKm < 40) {
      ratePerKm = 9; // ₹9 per km for 35-40km
    } else if (distanceInKm < 50) {
      ratePerKm = 10; // ₹10 per km for 40-50km
    } else {
      ratePerKm = 15; // ₹15 per km for >= 50km
    }
    
    const shippingCharge = Math.ceil(distanceInKm * ratePerKm);
    console.log(`[${filename}/calculateShippingCharge] Tiered shipping calculation: ${distanceInKm.toFixed(2)} km × ₹${ratePerKm} = ₹${shippingCharge}`);
    
    // Apply minimum charge if needed
    const minimumCharge = 40; // Minimum shipping charge
    const finalCharge = Math.max(shippingCharge, minimumCharge);
    console.log(`[${filename}/calculateShippingCharge] Final shipping charge: ₹${finalCharge} (after minimum charge application)`);
    
    // Get the tier name for better user feedback
    let distanceTier;
    if (distanceInKm < 5) distanceTier = "Short Distance";
    else if (distanceInKm < 10) distanceTier = "Local Distance";
    else if (distanceInKm < 20) distanceTier = "Medium Distance";
    else if (distanceInKm < 30) distanceTier = "Long Distance";
    else if (distanceInKm < 50) distanceTier = "Extended Distance";
    else distanceTier = "Remote Area";
    
    console.log(`[${filename}/calculateShippingCharge] Shipping calculation successful`);
    return res.status(200).json({
      success: true,
      shippingCharge: finalCharge,
      distance: distanceInKm,
      ratePerKm: ratePerKm,
      distanceTier: distanceTier,
      details: {
        fromAddress: 'Store Location',
        toAddress: address,
        distanceText: `${distanceInKm.toFixed(2)} km`,
        durationText: `${durationInMinutes} mins`
      }
    });
    
  } catch (error) {
    console.log(`\nError in ${filename}/calculateShippingCharge`);
    console.log(`Error message: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    if (error.response) {
      console.log(`Error response status: ${error.response.status}`);
      console.log(`Error response data:`, error.response.data);
    }
    console.error("Error calculating shipping:", error);
    res.status(500).json({
      success: false,
      message: 'Error calculating shipping charge',
      error: error.message
    });
  }
};