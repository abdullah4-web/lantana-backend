import express from 'express';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Property from '../models/PropertyModel.js';
import { isAuth, isAdmin } from '../utils.js';
import multer from 'multer';
import streamifier from 'streamifier';
import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';


cloudinary.config({ 
  cloud_name: 'du4bjonbf', 
  api_key: '662952589247199', 
  api_secret: 'DrXZkhi3WOLUcVwgkpBdC-UWkmM' 
});

const router = express.Router();

// Set up multer for handling file uploads
const upload = multer(); // Remove the memoryStorage


router.get('/featured', async (req, res) => {
  try {
    // Fetch all properties where 'featured' is true
    const featuredProperties = await Property.find({ approved: true, featured: true }).populate('user', 'name email contactnumber');

    res.status(200).json(featuredProperties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch featured properties' });
  }
});

// Route to add a property as an admin (requires authentication and admin rights)
router.post('/addpropertyasadmin', isAuth, isAdmin, upload.array('images', 10), async (req, res) => {
  try {
    // Check if the authenticated user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to add properties as admin.',
      });
    }

    const {
      title,
      description,
      for: propertyFor,
      category,
      price,
      area,
      location,
      address,
    } = req.body;

    // Upload each image to Cloudinary using upload_stream
    const uploadedImageUrls = [];
    for (const file of req.files) {
      const bufferStream = streamifier.createReadStream(file.buffer); // Create a readable stream from the buffer

      // Use Promisify to wrap the cloudinary uploader in a Promise
      const uploadImage = (stream) =>
        new Promise((resolve, reject) => {
          stream.pipe(
            cloudinary.uploader.upload_stream((error, result) => {
              if (error) {
                console.error(error);
                reject(error);
              } else {
                uploadedImageUrls.push(result.secure_url);
                resolve();
              }
            })
          );
        });

      await uploadImage(bufferStream); // Use await to ensure the image is uploaded before moving on

      // If all images are uploaded, create the property
      if (uploadedImageUrls.length === req.files.length) {
        const property = new Property({
          title,
          description,
          for: propertyFor,
          category,
          price,
          area,
          location,
          address,
          imageUrls: uploadedImageUrls,
          user: req.user._id,
          approved: true, 
          featured: true,// Assuming admin-added properties are approved by default
        });

        // Save the property to the database
        const savedProperty = await property.save();

        res.status(201).json(savedProperty);
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add property' });
  }
});
router.post('/addproperty', isAuth, upload.array('images', 10), async (req, res) => {
  try {
    const {
      title,
      description,
      for: propertyFor,
      category,
      price,
      area,
      location,
      address,
    } = req.body;

    // Check if the authenticated user is an admin
    if (!req.user) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to add properties.',
      });
    }

    // Upload each image to Cloudinary using upload_stream
    const uploadedImageUrls = [];
    for (const file of req.files) {
      const bufferStream = streamifier.createReadStream(file.buffer); // Create a readable stream from the buffer

      // Use Promisify to wrap the cloudinary uploader in a Promise
      const uploadImage = (stream) =>
        new Promise((resolve, reject) => {
          stream.pipe(
            cloudinary.uploader.upload_stream((error, result) => {
              if (error) {
                console.error(error);
                reject(error);
              } else {
                uploadedImageUrls.push(result.secure_url);
                resolve();
              }
            })
          );
        });

      await uploadImage(bufferStream); // Use await to ensure the image is uploaded before moving on
    }

    // If all images are uploaded, create the property
    const property = new Property({
      title,
      description,
      for: propertyFor,
      category,
      price,
      area,
      location,
      address,
      imageUrls: uploadedImageUrls,
      user: req.user._id,
      approved: false,
      featured: false, // Assuming admin-added properties are approved by default
    });

    // Save the property to the database
    const savedProperty = await property.save();

    // Send a notification to the admin
    const notification = new Notification({
      sender: req.user._id, // User who uploaded the property
      receiver: '651451d1ae0281f85e1d4508', // Replace with the actual admin user ID
      message: `${title} waiting for approval Posted by `,
      entityType: 'property', // Set entityType to "property"
      entityId: savedProperty._id, // Reference to the created property _id
    });

    await notification.save();

    res.status(201).json(savedProperty);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add property' });
  }
})
;





router.get('/getallproperties', async (req, res) => {
  try {
    const properties = await Property.find({ approved: true }).populate('user', 'name email contactnumber');
    res.status(200).json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});




router.get('/search', async (req, res) => {
  try {
    const { location, category, priceRange, areaRange, queryText, for: propertyFor } = req.query;

    // Build a query object to filter properties based on the provided criteria
    const query = { approved: true }; // Only approved properties are considered

    if (location) {
      query.location = location;
    }

    if (category) {
      query.category = category;
    }

    if (priceRange && priceRange !== 'All Prices') {
      const [minPrice, maxPrice] = priceRange.split('-');
      query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
    }

    if (areaRange) {
      const [minArea, maxArea] = areaRange.split('-');
      query.area = { $gte: Number(minArea), $lte: Number(maxArea) };
    }

    if (propertyFor && propertyFor !== 'All') {
      query.for = propertyFor;
    }

    // Create an array to hold conditions for $or
    const orConditions = [];

    // Add conditions for title, description, and address
    if (queryText) {
      orConditions.push(
        { title: { $regex: queryText, $options: 'i' } }, // Title search
        { description: { $regex: queryText, $options: 'i' } }, // Description search
        { address: { $regex: queryText, $options: 'i' } } // Address search
      );
    }

    // Use $or operator to match any of the conditions
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }

    // Find properties based on the query criteria
    const properties = await Property.find(query).populate('user', 'name email contactnumber');

    res.status(200).json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to search properties' });
  }
});


// Route to get details of a single property by ID
// Fetch details of a single property by ID
router.get('/:id', async (req, res) => {
  try {
    

    const property = await Property.findById(req.params.id).populate('user', 'name email contactnumber picture');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch property details' });
  }
});

// Route to get all properties added by a specific user
router.get('/userproperties/:userId', isAuth, async (req, res) => {
  try {
    // Find all properties where the user ID matches the requested user's ID
    const properties = await Property.find({ user: req.params.userId });

    res.status(200).json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch user properties' });
  }
});
//Route to delete property by user
router.delete('/deleteproperty/:id', isAuth, async (req, res) => {
  try {
    // Use findByIdAndRemove to delete the property by ID
    const deletedProperty = await Property.findByIdAndRemove(req.params.id);

    if (!deletedProperty) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if the authenticated user is the owner of the deleted property
    if (deletedProperty.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not the owner of this property.' });
    }

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
});
router.put('/editpropertybyadmin/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { approved } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to edit this property.' });
    }

    // Update the 'approved' field based on the client's request
    property.approved = approved === 'Yes';

    // Save the updated property
    await property.save();

    // Send a notification to the user when the property is approved
    if (approved === 'Yes') {
      const user = await User.findById(property.user);

      if (user) {
        // Create a notification
        const notification = new Notification({
          sender: req.user._id, // Replace with the actual admin's user ID
          receiver: user._id,
          message: `Your property "${property.title}" has been approved By Admin.`,
          entityType: 'property', // Set entityType to "property"
          entityId: property._id, // Reference to the created property _id
        });

        // Save the notification
        await notification.save();
      }
    }

    // Fetch the updated list of properties
    const updatedProperties = await Property.find();

    res.status(200).json({ message: 'Property updated successfully', properties: updatedProperties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update property' });
  }
});


router.put('/editproperty/:id', isAuth,  async (req, res) => {
  try {
    const {
      title,
      description,
      for: propertyFor,
      category,
      price,
      area,
      location,
      address,
    } = req.body;

    // Access the uploaded images from req.files, if available


    // Find the property by ID
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if the authenticated user is the owner of the property
    if (property.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. You are not the owner of this property.' });
    }

    // Update the property fields
    property.title = title;
    property.description = description;
    property.for = propertyFor;
    property.category = category;
    property.price = price;
    property.area = area;
    property.location = location;
    property.address = address;

  

    // Save the updated property
    await property.save();

    res.status(200).json({ message: 'Property updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update property' });
  }
});
router.put('/editpropertybyadmin/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { approved } = req.body;
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to edit this property.' });
    }

    // Update the 'approved' field based on the client's request
    property.approved = approved === 'Yes'; // Convert 'Yes' to true, 'No' to false

    // Save the updated property
    await property.save();

    // Fetch the updated list of properties
    const updatedProperties = await Property.find();

    res.status(200).json({ message: 'Property updated successfully', properties: updatedProperties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update property' });
  }
});

router.get('/admin/getallproperties', isAuth, isAdmin, async (req, res) => {
  try {
    // Check if the authenticated user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to view all properties as admin.',
      });
    }

    // Fetch all properties from the database
    const properties = await Property.find().populate('user', 'name email contactnumber');

    res.status(200).json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch all properties' });
  }
});

// Route to get a single property by ID for admin
router.get('/admin/getpropertybyid/:id', isAuth, isAdmin, async (req, res) => {
  try {
    // Check if the authenticated user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to view a property by ID as admin.',
      });
    }

    // Find the property by ID
    const property = await Property.findById(req.params.id).populate('user', 'name email contactnumber');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch property by ID' });
  }
});

// Get a property by ID for regular users
router.get('/user/getpropertybyid/:id', isAuth, async (req, res) => {
  try {
    const propertyId = req.params.id;
    const userId = req.user._id;

    // Find the property by ID
    const property = await Property.findById(propertyId).populate('user', 'name email contactnumber');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if the property belongs to the authenticated user
    if (property.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Access denied. You are not the owner of this property." });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch property by ID' });
  }
});

router.delete('/admin/deleteproperty/:id', isAuth, isAdmin, async (req, res) => {
  try {
    // Find the property by ID
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if the authenticated user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to delete properties as admin.' });
    }

    // Delete the property
    await Property.findByIdAndRemove(req.params.id);

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
});



export default router;
