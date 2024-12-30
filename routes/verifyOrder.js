import express from 'express';
import { verifyPayment } from '../controllers/orderControllers.js';

const verifyOrderRoutes = express.Router();

verifyOrderRoutes.post('/verify', verifyPayment);

export default verifyOrderRoutes;