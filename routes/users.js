import express from 'express';
import { fetchUserById, updateUser, deleteUser } from '../controllers/userControllers.js';
import { verifyToken } from '../controllers/orderControllers.js';

const userRoutes = express.Router();

// Fetch User by ID
userRoutes.get('/profile', verifyToken, fetchUserById);

// Update User
userRoutes.put('/:userId', verifyToken, updateUser);

// Delete User
userRoutes.delete('/:userId', verifyToken, deleteUser);

export default userRoutes;