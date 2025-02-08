import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { v2 as cloudinary } from 'cloudinary';

import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import verifyOrderRoutes from './routes/verifyOrder.js'; // Import verify order routes
import myOrdersRoutes from './routes/myOrders.js'; // Import my orders routes
import placeOrderRoutes from './routes/placeOrder.js'; // Import place order routes
import adminRoutes from './routes/admin.js'; // Import admin routes
import cors from 'cors';

dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const app = express();
app.use(express.json());
app.use(cookieParser()); // To handle cookies

// CORS configuration
//testing for cors origin: ['http://localhost:5173','http://localhost:5174']
const corsOptions = {
  origin: ["http://13.60.168.229","http://localhost:5173"], // Update with your frontend URL
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204ssh
};
app.use(cors(corsOptions));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.log("\nError connecting to Database");
    console.log(err);
  });

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', verifyOrderRoutes); // Use verify order routes
app.use('/api/order', myOrdersRoutes); // Use my orders routes
app.use('/api/order', placeOrderRoutes); // Use place order routes
app.use('/api/admin', adminRoutes); // Use admin routes

app.get('/',(req,res)=>{
  res.send("API working!!!")
})

// Start the Server
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});