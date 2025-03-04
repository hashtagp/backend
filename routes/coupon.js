import express from 'express';
import Coupon from '../models/coupon.js';
import userCouponUsage from '../models/userCouponUsage.js';
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
    const userId = req.user.id; // Get the current user's ID
    
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
    
    // Check user-specific usage limit if set
    if (coupon.userUsageLimit !== null) {
      // Find usage record for this user and coupon
      const userUsage = await userCouponUsage.findOne({ 
        userId: userId,
        couponId: coupon._id
      });
      
      // If user has used this coupon before and reached limit
      if (userUsage && userUsage.usageCount >= coupon.userUsageLimit) {
        return res.status(400).json({ 
          success: false,
          message: `You've reached the maximum usage limit for this coupon`
        });
      }
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
    const userId = req.user.id; // Get the current user's ID

    console.log(`[COUPON APPLY] Starting apply for user ${userId}, code ${code}, order ${orderId}`);
    
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
    
    // Check user-specific usage limit if set
    if (coupon.userUsageLimit !== null) {
      // Find usage record for this user and coupon
      const userUsage = await userCouponUsage.findOne({ 
        userId: userId,
        couponId: coupon._id
      });
      
      // If user has used this coupon before and reached limit
      if (userUsage && userUsage.usageCount >= coupon.userUsageLimit) {
        return res.status(400).json({ 
          success: false,
          message: `You've reached the maximum usage limit for this coupon`
        });
      }
    }
    
    // Increment global usage count
    coupon.usageCount += 1;
    
    // Check if global usage limit is reached
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      coupon.isActive = false; // Deactivate if limit reached
    }
    
    await coupon.save();
    
    // Update or create user-specific usage record
    let userUsage = await userCouponUsage.findOne({
      userId: userId,
      couponId: coupon._id
    });
    console.log(`[COUPON APPLY] Existing usage found: ${Boolean(userUsage)}`);
    if (userUsage) {
      console.log(`[COUPON APPLY] Current usage count: ${userUsage.usageCount}`);
    }

    if (userUsage) {
      // Increment existing usage count
      userUsage.usageCount += 1;
      await userUsage.save();
      console.log(`[COUPON APPLY] Updated usage count: ${userUsage.usageCount}`);
    } else {
      // Create new usage record with count=1
      console.log(`[COUPON APPLY] Creating new usage record for user ${userId} and coupon ${coupon._id}`);
      
      try {
        userUsage = await userCouponUsage.create({
          userId: userId,
          couponId: coupon._id,
          usageCount: 1
        });
        console.log(`[COUPON APPLY] New usage record created with ID: ${userUsage._id}`);
      } catch (createError) {
        console.error(`[COUPON APPLY] Error creating usage record:`, createError);
        throw createError; // Re-throw to be caught by the outer catch
      }
    }
    
    // Log after userUsage is properly defined
    console.log(`User ${userId} has used coupon ${coupon.code} ${userUsage.usageCount} time(s)`);
    
    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
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