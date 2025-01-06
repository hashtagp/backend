import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../routes/auth.js';

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

