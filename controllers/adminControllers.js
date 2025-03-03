import User from "../models/User.js";
import Banner from '../models/Banner.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../routes/auth.js';
import fs from "fs" // importing file system
import { v2 as cloudinary } from 'cloudinary';

let refreshTokens = [];
const filename = "adminControllers.js";

// Admin Login
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);
try{
  const admin = await User.findOne({ username });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

    if(!admin.admin){
      return res.status(403).json({success: false, error: "Access forbidden"});
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const accessToken = generateAccessToken(admin._id, true);
    const refreshToken = generateRefreshToken(admin._id, true);

    // Send the refresh token as an HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
    });

    res.status(200).json({ success: true, accessToken });
  }
  catch (error) {
    console.log(`\nError in ${filename}/adminLogin`);
    console.log(error);
    res.status(400).json({ success: false, error });
  }
};

// Admin Register
export const adminRegister = async (req, res) => {
    const { username, email, password } = req.body;
    console.log(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const newUser = new User({ username, email, password: hashedPassword });
    try {
      await newUser.save();
  
      const accessToken = generateAccessToken(newUser._id);
      const refreshToken = generateRefreshToken(newUser._id);
  
      refreshTokens.push(refreshToken);
  
      // Send the refresh token as an HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure in production
      });
  
      res.status(201).json({ success:true, accessToken });
    } catch (error) {
      console.log(`\nError in ${filename}/adminRegister`);
      console.log(error);
      res.status(400).json({ success:false, error });
    }
};


// Add Banner
export const addBanner = async (req, res) => {
    const { name, image } = req.body;
    try {

      const uploadResult = await cloudinary.uploader
      .upload(
          req.file.path, {
              public_id: `${req.file.filename}`,
          }
      )
      .catch((error) => {
          console.log(error);
      }); 
    const banner = { name, image: uploadResult.secure_url };
    
      await Banner.create(banner);
      res.status(201).json({ success: true, message: 'Banner added successfully' });
    } catch (error) {
      console.log(`\nError in ${filename}/addBanner`);
      console.log(error);
      res.status(400).json({ success: false, error });
    }
};

// Delete Banner
export const deleteBanner = async (req, res) => {
    const { id } = req.params;
    try {
      const banner = await Banner.findById(id);
      if (!banner) return res.status(404).json({ success: false, error: 'Banner not found' });

      // await cloudinary.uploader.destroy(banner.image.split("/").pop().split(".")[0]);
      await Banner.findByIdAndDelete(id);
      res.status(200).json({ success: true, message: 'Banner deleted successfully' });
    }
    catch (error) {
      console.log(`\nError in ${filename}/deleteBanner`);
      console.log(error);
      res.status(400).json({ success: false, error });
    }
}

// Promote a user to admin
export const promoteAdmin = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if user is already an admin
    if (user.admin) {
      return res.status(400).json({ 
        success: false, 
        message: 'User is already an admin' 
      });
    }
    
    // Update user to admin status
    user.admin = true;
    await user.save();
    
    console.log(`User ${user.username} (${user.email}) promoted to admin`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'User successfully promoted to admin',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.log(`\nError in ${filename}/promoteAdmin`);
    console.log(error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while promoting user',
      error: error.message
    });
  }
};

