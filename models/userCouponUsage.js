import mongoose from 'mongoose';

const userCouponUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true
  },
  usageCount: {
    type: Number,
    default: 1,
    min: 1
  }
}, { timestamps: true });

// Create a compound index for userId and couponId to ensure uniqueness and efficient queries
userCouponUsageSchema.index({ userId: 1, couponId: 1 }, { unique: true });

const UserCouponUsage = mongoose.model('userCouponUsage', userCouponUsageSchema);

export default UserCouponUsage;