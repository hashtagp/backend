import Product from '../models/Product.js';

// Fetch All Products
export const fetchAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Fetch Product by ID
export const fetchProductById = async (req, res) => {
  const { productId } = req.params;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Search Products by Name
export const searchProducts = async (req, res) => {
  const { query } = req.query;
  try {
    console.log("searching....!!!!")
    const products = await Product.find({ name: { $regex: query, $options: 'i' } });
    res.status(200).json(products);
  } catch (error) {
    console.log("Error in searching ",error)
    res.status(500).json({ error: 'Failed to search products' });
  }
};