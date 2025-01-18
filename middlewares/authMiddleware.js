import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log("Token received:", token);

  if (!token) {
    console.log("No token provided.");
    return res.status(403).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const isAdmin = req.originalUrl.includes('/admin') ? true : false;
    if (isAdmin) {
      if (!decoded.isAdmin) {
        console.log("Unauthorized access.");
        return res.status(401).json({ error: 'Unauthorized access.' });
      }
    }
    
    req.user = decoded;
    console.log("Decoded user:", decoded);
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(400).json({ error: 'Invalid token.' });
  }
};