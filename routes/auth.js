import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fetchUserById, updateUser, deleteUser } from '../controllers/userControllers.js';

const authRoutes = express.Router();

dotenv.config();

// Generate Tokens
export const generateAccessToken = (userId, isAdmin=false) => {
  return jwt.sign({ id: userId, isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const generateRefreshToken = (userId, isAdmin=false) => {
  return jwt.sign({ id: userId, isAdmin }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '720h' });
};

// In-memory storage for refresh tokens (use a database in production)
let refreshTokens = [];

// Register User
authRoutes.post('/register', async (req, res) => {
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

    res.status(201).json({ accessToken });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error });
  }
});

// Login User
authRoutes.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  refreshTokens.push(refreshToken);

  // Send the refresh token as an HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure in production
  });

  res.status(200).json({ accessToken });
});

// Refresh Access Token
authRoutes.post('/token', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });
  if (!refreshTokens.includes(refreshToken)) return res.status(403).json({ error: 'Invalid refresh token' });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid refresh token' });

    const accessToken = generateAccessToken(user.id);
    res.status(200).json({ accessToken });
  });
});

// Logout User
authRoutes.post('/logout', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  refreshTokens = refreshTokens.filter(token => token !== refreshToken);
  res.clearCookie('refreshToken');
  res.status(200).send('Logged out');
});

// Fetch User by ID
authRoutes.get('/:userId', fetchUserById);

// Update User
authRoutes.put('/:userId', updateUser);

// Delete User
authRoutes.delete('/:userId', deleteUser);

export default authRoutes;