import express from 'express';
import { verifyToken, fetchAllOrders, fetchOrderById, addItemToCart, createOrder, updateOrderStatus, calculateShippingCharge } from '../controllers/orderControllers.js';

const orderRoutes = express.Router();

// Fetch All Orders
orderRoutes.get('/', verifyToken, fetchAllOrders);

//calculate shipping charge
orderRoutes.post('/shippingCharge', verifyToken, calculateShippingCharge);

// Fetch Order by ID
orderRoutes.get('/track', verifyToken, fetchOrderById);

// Add Item to Cart
orderRoutes.post('/cart', verifyToken, addItemToCart);

// Create Order
orderRoutes.post('/', verifyToken, createOrder);

// Update Order Status
orderRoutes.put('/update', verifyToken, updateOrderStatus);

export default orderRoutes; 