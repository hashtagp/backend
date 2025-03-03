import express from 'express';
import Coupon from '../models/coupon.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; // Updated path

const couponRoutes = express.Router();

// Create a custom admin middleware using your existing pattern
const verifyAdminAccess = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Create a new coupon (admin only)
couponRoutes.post('/create/admin', verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const newCoupon = new Coupon(req.body);
    newCoupon.code = newCoupon.code.toUpperCase();
    newCoupon.createdBy = req.user.id;
    
    const savedCoupon = await newCoupon.save();
    res.status(201).json(savedCoupon);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get all coupons (admin only)
couponRoutes.get('/admin/all', verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Validate a coupon code
couponRoutes.post('/validate', verifyToken, async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false,
        message: 'Coupon code is required' 
      });
    }
    
    if (!orderAmount && orderAmount !== 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Order amount is required' 
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }
    
    if (!coupon.isValid()) {
      return res.status(400).json({ 
        success: false,
        message: 'Coupon is expired or inactive' 
      });
    }
    
    if (orderAmount < coupon.minPurchase) {
      return res.status(400).json({ 
        success: false,
        message: `Minimum purchase amount of ₹${coupon.minPurchase} required` 
      });
    }
    
    // Calculate discount
    let discountAmount = 0;
    
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
      
      // Apply max discount if specified
      if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // Fixed amount discount
      discountAmount = coupon.discountValue;
      
      // Don't allow discount greater than order amount
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount;
      }
    }
    
    res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount,
        finalAmount: orderAmount - discountAmount
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Apply coupon to an order (increment usage count)
couponRoutes.post('/apply', verifyToken, async (req, res) => {
  try {
    const { code, orderId } = req.body;
    
    if (!code || !orderId) {
      return res.status(400).json({ 
        success: false,
        message: 'Coupon code and order ID are required' 
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }
    
    if (!coupon.isValid()) {
      return res.status(400).json({ 
        success: false,
        message: 'Coupon is expired or inactive' 
      });
    }
    
    // Increment usage count
    coupon.usageCount += 1;
    
    // Check if usage limit is reached after this use
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      coupon.isActive = false; // Deactivate if limit reached
    }
    
    await coupon.save();
    
    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get a specific coupon
couponRoutes.get('/admin/:id', verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }
    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Update a coupon
couponRoutes.put('/update/admin/:id', verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }
    
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!updatedCoupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }
    
    res.status(200).json(updatedCoupon);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Delete a coupon
couponRoutes.delete('/delete/admin/:id', verifyToken, verifyAdminAccess, async (req, res) => {
  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!deletedCoupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Coupon not found' 
      });
    }
    res.status(200).json({ 
      success: true,
      message: 'Coupon deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

export default couponRoutes;