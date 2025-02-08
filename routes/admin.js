import express from 'express';
import { adminLogin, adminRegister, addBanner, deleteBanner } from '../controllers/adminControllers.js';
import { updateOrderStatus, fetchAllOrders } from '../controllers/orderControllers.js';
import { fetchAllProducts, addProduct, updateProduct, deleteProduct } from '../controllers/productControllers.js';
import { getBanner } from '../controllers/userControllers.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import multer from "multer"
import { get } from 'http';



const storage = multer.memoryStorage(); // ✅ Store files in memory instead of disk
const upload = multer({ storage }); //for vercel



const adminRoutes = express.Router();


adminRoutes.post('/login', adminLogin);
adminRoutes.post('/register', verifyToken, adminRegister);
adminRoutes.put('/orders/update', verifyToken, updateOrderStatus);
adminRoutes.get('/get/banner', getBanner);
adminRoutes.post('/add/banner', verifyToken, upload.single("image"), addBanner);
adminRoutes.get('/orders/all', verifyToken, fetchAllOrders);
adminRoutes.get('/products', verifyToken, fetchAllProducts);
adminRoutes.post('/add', verifyToken, upload.single("image"), addProduct);
adminRoutes.put('/update', verifyToken, updateProduct);
adminRoutes.post('/delete', verifyToken, deleteProduct);
adminRoutes.delete('/delete/banner/:id', verifyToken, deleteBanner);
adminRoutes.get('/verify', verifyToken);

export default adminRoutes;
