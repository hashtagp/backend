import express from 'express';
import { verifyToken, fetchAllOrders, fetchOrderById, addItemToCart, createOrder, updateOrderStatus } from '../controllers/orderControllers.js';

const orderRoutes = express.Router();

// Fetch All Orders
orderRoutes.get('/', verifyToken, fetchAllOrders);

// Fetch Order by ID
orderRoutes.get('/track', verifyToken, fetchOrderById);

// Add Item to Cart
orderRoutes.post('/cart', verifyToken, addItemToCart);

// Create Order
orderRoutes.post('/', verifyToken, createOrder);

// Update Order Status
orderRoutes.put('/update', verifyToken, updateOrderStatus);

export default orderRoutes; 