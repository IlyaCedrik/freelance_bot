import User from '../../database/models/User.js';

const authMiddleware = async (ctx, next) => {
  try {
    if (ctx.from) {
      // Update user activity
      await User.updateActivity(ctx.from.id);
    }
    
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return next();
  }
};

export default authMiddleware; 