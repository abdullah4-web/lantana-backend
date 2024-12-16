// Import required modules and dependencies
import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { isAuth, isAdmin, generateToken } from '../utils.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary with your cloud credentials
cloudinary.config({ 
  cloud_name: 'du4bjonbf', 
  api_key: '662952589247199', 
  api_secret: 'DrXZkhi3WOLUcVwgkpBdC-UWkmM' 
});

const userRouter = express.Router();

// Use CloudinaryStorage to configure multer for image upload
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
});

const upload = multer({ storage });

// Middleware for Cloudinary image upload
const uploadToCloudinary = upload.single('picture');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'omerlantana@gmail.com',
    pass: 'defjgahaxjhhawdb',
  },
});



userRouter.post(
  '/register',
  uploadToCloudinary,
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, contactnumber } = req.body;

    // Ensure that a picture was uploaded
    if (!req.file) {
      return res.status(400).send({ message: 'Please upload a profile picture' });
    }

    const picture = req.file.path;
    const hashedPassword = bcrypt.hashSync(password, 8);

    try {
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        picture: picture,
        contactnumber,
      });

      const user = await newUser.save();

      const mailOptions = {
        from: 'omerlantana@gmail.com',
        to: user.email, // Use the user's email address
        subject: 'Welcome to Our Lantana Marketing Limited',
        html: `
        <!DOCTYPE html>
        <html>
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Our Real Estate Community</title>
            <style>
                /* Reset some default styles */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                }
        
                /* Container styles */
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
        
                /* Header styles */
                .header {
                    background-color:green;
                    text-align: center;
                    padding: 20px 0;
                }
        
                .header h1 {
                    color: #ffffff;
                    margin: 0;
                }
        
                /* Content styles */
                .content {
                    background-color: #ffffff;
                    text-align: center;
                    padding: 20px;
                }
        
                .content img {
                    max-width: 100%;
                    height:auto;
                }
        
                .content h1 {
                    color: #007BFF;
                    margin: 10px 0;
                }
        
                .content p {
                    margin: 10px 0;
                }
        
                .content a {
                    display: inline-block;
                    background-color: green;
                    color: #ffffff;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                }
        
                /* Footer styles */
                .footer {
                    background-color: green;
                    text-align: center;
                    padding: 20px 0;
                }
        
                .footer h1 {
                    color: #ffffff;
                    margin: 0;
                }
            </style>
        </head>
        
        <body>
        
            <div class="container">
                <!-- Header -->
                <div class="header">
                    <h1>Lantana Marketing Limited</h1>
                </div>
        
                <!-- Content -->
                <div class="content">
                    <img src="https://res.cloudinary.com/dtcmf6iqn/image/upload/v1696482432/liwuvfgqwbkgsnrawywr.jpg"
                        alt="Real Estate Logo" width="150">
                    <h1>Welcome to Our Real Estate Community!</h1>
                    <p>Thank you for joining our real estate platform. We're here to help you find your dream property.</p>
                    <p>To get started, explore our listings:</p>
                    <p><a href="https://lantana.cyclic.cloud/" target="_blank">Explore Listings</a></p>
                </div>
        
                <!-- Footer -->
                <div class="footer">
                    <h1>© 2023 Lantana Marketing Limited</h1>
                </div>
            </div>
        
        </body>
        
        </html> 
  `,
};
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending welcome email:', error);
        } else {
          console.log('Welcome email sent:', info.response);
        }
      });

      res.status(201).send({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        picture: user.picture, // Return the secure URL from the database
        contactnumber: user.contactnumber,
        token: generateToken(user),
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).send({ message: 'Error registering user' });
    }
  })
);



userRouter.put(
  '/profile',
  isAuth,
  uploadToCloudinary,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      const updateData = {
        name: req.body.name,
        email: req.body.email,
        contactnumber: req.body.contactnumber,
      };

      if (req.body.password) {
        // If newPassword is provided, update the password
        updateData.password = bcrypt.hashSync(req.body.password, 8);
      }

      if (req.file && req.file.path) {
        // If a new picture was uploaded to Cloudinary, update the picture
        updateData.picture = req.file.path;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      );

      if (updatedUser) {
        res.status(200).send(updatedUser);
      } else {
        res.status(500).send({ message: 'Error updating user profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send({ message: 'Error updating user profile' });
    }
  })
);
userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.params.id });

      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      if (user.isAdmin) {
        return res.status(400).send({ message: 'Cannot delete an admin user' });
      }

      await User.deleteOne({ _id: req.params.id }); 
      res.send({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).send({ message: 'Error deleting user' });
    }
  })
);


userRouter.post(
  '/forgot-password',
  expressAsyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Generate a random 6-digit OTP
    const otp = crypto.randomBytes(3).toString('hex');

    // Set OTP and expiration time in the user document
    user.otp = otp;
    user.otpExpiration = Date.now() + 720 * 60 * 1000; // OTP expires in 12 hours
    await user.save();

    // Send OTP to the user's email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: 'omerlantana@gmail.com',
          pass: 'fkxn hlir jukw mpkn'
      }
  });

  const mailOptions = {
  from: 'omerlantana@gmail.com',
  to: email,
  subject: 'Password Reset OTP',
  html: `
    <html>
      <head>
      </head>
      <body>
      <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">ZH Travel and Tours</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Thank you for choosing Your Lantana Marketing Pvt Ltd Use the following OTP to complete your Sign Up procedures. OTP is valid for 2 hours</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${otp}</h2>
    <p style="font-size:0.9em;">Regards,<br />Your Brand</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>Lantana Marketing Pvt Ltd</p>
      <p>Doha Centre, Islamabad</p>
      <p>Pakistan</p>
    </div>
  </div>
</div>
      </body>
    </html>
  `,
};

    await transporter.sendMail(mailOptions);

    res.send({ message: 'OTP sent successfully' });
  })
);



userRouter.post(
  '/verify-otp',
  expressAsyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(400).send({ message: 'Incorrect OTP. Please try again.' });
    }

    if (user.otpExpiration < Date.now()) {
      return res.status(400).send({ message: 'OTP has expired. Please request a new OTP.' });
    }

    // If all checks pass, OTP is valid
    res.send({ message: 'OTP verification successful', email: user.email });
  })
);


// Password reset route
userRouter.post(
  '/reset-password',
  expressAsyncHandler(async (req, res) => {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }

    // Reset the password without OTP verification
    user.password = bcrypt.hashSync(newPassword, 8);
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    res.send({ message: 'Password reset successfully' });
  })
);
userRouter.get(
  '/allusers',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({});
    res.send(users);
  })
);
userRouter.put(
  '/toggle-admin/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      // Check if the admin sent 'yes' or 'no' from the frontend
      const action = req.body.action; // Assuming the frontend sends 'action' as 'yes' or 'no'

      if (action === 'yes') {
        // Make the user an admin
        if (user.isAdmin) {
          return res.status(400).send({ message: 'User is already an admin' });
        }
        user.isAdmin = true;
      } else if (action === 'no') {
        // Remove admin privileges from the user
        if (!user.isAdmin) {
          return res.status(400).send({ message: 'User is not an admin' });
        }
        user.isAdmin = false;
      } else {
        return res.status(400).send({ message: 'Invalid action. Use "yes" or "no"' });
      }

      const updatedUser = await user.save();

      res.status(200).send(updatedUser);
    } catch (error) {
      console.error('Error toggling user admin status:', error);
      res.status(500).send({ message: 'Error toggling user admin status' });
    }
  })
);
userRouter.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

userRouter.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to the home page or send a response
    res.redirect('/');
  }
);

// Modify login route to handle both traditional login and OAuth login
userRouter.post(
  '/login',
  expressAsyncHandler(async (req, res) => {
    const { email, password, googleId } = req.body;

    // Check if the request includes a Google ID
    if (googleId) {
      const user = await User.findOne({ googleId });

      if (user) {
        return res.send({
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          contactnumber: user.contactnumber,
          picture: user.picture,
          token: generateToken(user),
        });
      }
    }

    // Handle traditional login as before
    const user = await User.findOne({ email });

    if (user && bcrypt.compareSync(password, user.password)) {
      res.send({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        contactnumber: user.contactnumber,
        picture: user.picture,
        token: generateToken(user),
      });
    } else {
      res.status(401).send({ message: 'Invalid email or password' });
    }
  })
);



export default userRouter;
