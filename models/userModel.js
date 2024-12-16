import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true,},
    email: { type: String, required: true,  },
    password: { type: String }, 
    contactnumber: { type: String },
    isAdmin: { type: Boolean, default: false, required: true },
    picture: { type: String, trim: true },
    otp: { type: String, trim: true },
    otpExpiration: { type: Date },
    googleId: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Create and export the User model
const User = mongoose.model('User', userSchema);
export default User;
