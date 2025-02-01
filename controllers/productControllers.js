import Product from '../models/Product.js';
import fs from "fs" // importing file system
import { v2 as cloudinary } from 'cloudinary';

const filename = "productControllers.js";

// Fetch All Products
export const fetchAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({success:true, products });
  } catch (error) {
    console.log(`\nError in ${filename}/fetchAllProducts`);
    console.log(error);
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
    console.log(`\nError in ${filename}/fetchProductById`);
    console.log(error);
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
    console.log(`\nError in ${filename}/searchProducts`);
    console.log(error);
    console.log("Error in searching ",error)
    res.status(500).json({ error: 'Failed to search products' });
  }
};

// Add Product
export const addProduct = async (req, res) => {
  try{
  const { name, price, description, image, category, discount } = req.body;

  // let image_filename = `${req.file.filename}`;

  const uploadResult = await cloudinary.uploader
  .upload(
      req.file.path, {
          public_id: `${req.file.filename}`,
      }
  )
  .catch((error) => {
      console.log(error);
  });

  const newProduct = new Product({ name, price, description, image: uploadResult.secure_url, category, discount:price*(discount/100) });
  try {
    await newProduct.save();
    res.status(201).json({ success:true, newProduct});
  } catch (error) {
    res.status(400).json({ success:false, error: 'Failed to add product' });
  }
}
catch (error) {
  console.log(`\nError in ${filename}/addProduct`);
  console.log(error);
  res.status(500).json({ error: 'Failed to add product' });
}
};

// Update Product by ID
export const updateProduct = async (req, res) => {
  const { productId } = req.params;
  const { name, price, description, image, category, discount } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success:false, error: 'Product not found' });
    }
    product.name = name;
    product.price = price;
    product.description = description;
    product.image = image;
    product.category = category;
    product.discount = discount;
    await product.save();
    res.status(200).json({ success:true, product });
  } catch (error) {
    console.log(`\nError in ${filename}/updateProduct`);
    console.log(error);
    res.status(500).json({ success:false, error: 'Failed to update product' });
  }
};

// Delete Product by ID 
export const deleteProduct = async (req, res) => {
  const { id } = req.body;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success:false, error: 'Product not found' });
    }
    Product.findByIdAndDelete(id);
    res.status(200).json({ success:true, message: 'Product deleted successfully' });
  }
  catch (error) {
    console.log(`\nError in ${filename}/deleteProduct`);
    console.log(error);
    res.status(500).json({ success:false, error: 'Failed to delete product' });
  }
};