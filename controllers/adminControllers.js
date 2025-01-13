import Admin from '../models/Admin.js';
import Banner from '../models/Banner.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../routes/auth.js';
import fs from "fs" // importing file system
import { v2 as cloudinary } from 'cloudinary';

let refreshTokens = [];


// Admin Login
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);

  const admin = await Admin.findOne({ username });
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });

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
      console.log(error);
      res.status(400).json({ success:false, error });
    }
};


// Add Banner
export const addBanner = async (req, res) => {
    const { name, image } = req.body;
    try {

      const existingBanner = await Banner.findOne();

      if (existingBanner) {
        // Step 2: Delete the old image from Cloudinary
        const oldImagePublicId = existingBanner.image.split('/').pop().split('.').slice(0, -1).join('.'); // Extract the public ID from the URL
        console.log(oldImagePublicId);

        await cloudinary.uploader.destroy(oldImagePublicId, { resource_type: 'image' })
        .then((result) => {
          console.log("Cloudinary image deleted:", result);
        })
        .catch((error) => {
          console.log('Error deleting image from Cloudinary:', error);
        });
      }

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
    
      await Banner.deleteMany();
      await Banner.create(banner);
      res.status(201).json({ success: true, message: 'Banner added successfully' });
    } catch (error) {
      console.log(error);
      res.status(400).json({ success: false, error });
    }
};



