import express from 'express';
import { fetchUserOrders } from '../controllers/orderControllers.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const myOrdersRoutes = express.Router();

myOrdersRoutes.post('/userorders', verifyToken, fetchUserOrders);

export default myOrdersRoutes;