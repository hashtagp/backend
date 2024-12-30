import express from 'express';
import { fetchAllProducts, fetchProductById, searchProducts } from '../controllers/productControllers.js';

const productRoutes = express.Router();

// Fetch All Products
productRoutes.get('/allProducts', fetchAllProducts);

// Search Products by Name
productRoutes.get('/search', searchProducts);

// Fetch Product by ID
productRoutes.get('/:productId', fetchProductById);


export default productRoutes;