import express from 'express';
import { placeOrder } from '../controllers/orderControllers.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const placeOrderRoutes = express.Router();

placeOrderRoutes.post('/place', verifyToken, placeOrder);

export default placeOrderRoutes;