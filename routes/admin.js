import express from 'express';
import { adminLogin, adminRegister } from '../controllers/adminControllers.js';
import { updateOrderStatus, fetchAllOrders } from '../controllers/orderControllers.js';
import { fetchAllProducts, addProduct, updateProduct, deleteProduct } from '../controllers/productControllers.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import multer from "multer"

const storage = multer.diskStorage({
    destination:"uploads",
    filename: (req,file,cb)=>{
        return cb(null,`${Date.now()}${file.originalname}`)
    }
})

const upload = multer({storage:storage})

const adminRoutes = express.Router();


adminRoutes.post('/login', adminLogin);
adminRoutes.post('/register', verifyToken, adminRegister);
adminRoutes.put('/orders/update', verifyToken, updateOrderStatus);
adminRoutes.get('/orders/all', verifyToken, fetchAllOrders);
adminRoutes.get('/products', verifyToken, fetchAllProducts);
adminRoutes.post('/add', upload.single("image"), verifyToken, addProduct);
adminRoutes.put('/update', verifyToken, updateProduct);
adminRoutes.delete('/delete', verifyToken, deleteProduct);

export default adminRoutes;
