import express from 'express';
import { fetchUserById, updateUser, deleteUser, getBanner, submitInquiry } from '../controllers/userControllers.js';
import { verifyToken } from '../controllers/orderControllers.js';

const userRoutes = express.Router();

// Fetch User by ID
userRoutes.get('/profile', verifyToken, fetchUserById);

//send inquiry email
userRoutes.post('/inquiry',submitInquiry);

// Update User
userRoutes.put('/:userId', verifyToken, updateUser);

// Delete User
userRoutes.delete('/:userId', verifyToken, deleteUser);

//get banner
userRoutes.get('/get/banner', getBanner);

export default userRoutes;