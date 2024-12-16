import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import Vehicle from '../models/vehicleModel.js';
import { isAuth , isAdmin} from '../utils.js';
import multer from 'multer';
import streamifier from 'streamifier';
import Notification from '../models/notificationModel.js'; // Import your Notification model
import User from '../models/userModel.js';

cloudinary.config({ 
  cloud_name: 'du4bjonbf', 
  api_key: '662952589247199', 
  api_secret: 'DrXZkhi3WOLUcVwgkpBdC-UWkmM' 
});

const router = express.Router();

// Set up multer for handling file uploads
const upload = multer();
router.get('/featured', async (req, res) => {
  try {
    const featuredVehicles = await Vehicle.find({ approved: true, featured: true })
      .populate('owner', 'name email contactnumber');

    res.status(200).json(featuredVehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch featured vehicles' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { queryText, location, make, model, priceRange, type ,for: vehicleFor } = req.query;

  
    const query = {};

    if (queryText) {
      const textSearchRegex = { $regex: queryText, $options: 'i' };
      query.$or = [
        { make: textSearchRegex },
        { model: textSearchRegex },
        { location: textSearchRegex },
        
      ];
    }

    if (location) {
      query.city = { $regex: location, $options: 'i' };
    }

    if (make) {
      query.make = { $regex: make, $options: 'i' };
    }

    if (model) {
      query.model = { $regex: model, $options: 'i' };
    }

    if (priceRange && priceRange !== 'All Prices') {
      const [minPrice, maxPrice] = priceRange.split('-');
      query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
    }

    if (type) {
      query.type = { $regex: type, $options: 'i' };
    }

    if (vehicleFor && vehicleFor !== 'All') {
      query.for = vehicleFor;
    }

    // Find vehicles based on the query criteria
    const vehicles = await Vehicle.find(query);

    res.status(200).json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to search vehicles', error: error.message }); // Include the error message in the response
  }
});

router.post('/addvehicleasadmin', isAuth, isAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const {
      make,
      model,
      year,
      type,
      city,
      registered,
      mileage,
      price,
      for: vehicleFor,
      description,
      enginecapacity,
      fuelType,
    } = req.body;

    // Check if the authenticated user is authorized to add a vehicle
    if (!req.user.isAdmin)  {
      return res.status(403).json({
        message: 'Access denied. You are not Admin and unauthorixed to add vehicles.',
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

    // If all images are uploaded, create the vehicle
    const vehicle = new Vehicle({
      make,
      model,
      year,
      type,
      city,
      registered,
      mileage,
      price,
      for: vehicleFor,
      description,
      enginecapacity,
      fuelType,
      imageUrls: uploadedImageUrls,
      owner: req.user._id,
      approved: true,
      featured: true, // Assuming vehicles are not approved by default
    });

    // Save the vehicle to the database
    const savedVehicle = await vehicle.save();

    res.status(201).json(savedVehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add vehicle' });
  }
});


// Route to add a vehicle
router.post('/addvehicleasuser', isAuth, upload.array('images', 10), async (req, res) => {
  try {
    const {
      make,
      model,
      year,
      type,
      city,
      registered,
      mileage,
      price,
      for: vehicleFor,
      description,
      enginecapacity,
      fuelType,
    } = req.body;

    // Check if the authenticated user is authorized to add a vehicle
    if (!req.user) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to add vehicles.',
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

    // If all images are uploaded, create the vehicle
    const vehicle = new Vehicle({
      make,
      model,
      year,
      type,
      city,
      registered,
      mileage,
      price,
      for: vehicleFor,
      description,
      enginecapacity,
      fuelType,
      imageUrls: uploadedImageUrls,
      owner: req.user._id,
      approved: false,
      featured: false, // Assuming vehicles are not approved by default
    });

    // Save the vehicle to the database
    const savedVehicle = await vehicle.save();

    
    const notification = new Notification({
      sender: req.user._id, // User who uploaded the vehicle
      receiver: '651451d1ae0281f85e1d4508', // Replace with the actual admin user ID
      message: `${make} ${model} waiting for approval Posted by `,
      entityType: 'vehicle', // Set entityType to "vehicle"
      entityId: savedVehicle._id, // Reference to the created vehicle _id
    });

    await notification.save();

    res.status(201).json(savedVehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add vehicle' });
  }
});


// Route to get all approved vehicles
router.get('/getallapprovedvehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ approved: true })
      .populate('owner', 'name email contactnumber'); // Assuming owner field holds user reference

    res.status(200).json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch approved vehicles' });
  }
});


// Define a route to get details of a single vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    // Find the vehicle by ID and populate the owner field with user details
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('owner', 'name email contactnumber picture');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.status(200).json(vehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch vehicle details' });
  }
});
// Define a route to get all vehicles added by the authenticated user
router.get('/uservehicles/:userId', isAuth, async (req, res) => {
  try {
    // Ensure that the user is authenticated
    if (!req.user) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to access this resource.',
      });
    }

    // Find all vehicles where the owner's ID matches the authenticated user's ID
    const userVehicles = await Vehicle.find({ owner: req.user._id });

    // Check if userVehicles array is empty
    if (userVehicles.length === 0) {
      return res.status(404).json({ message: 'No vehicles found for this user' });
    }

    res.status(200).json(userVehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch user vehicles' });
  }
});
   
// Define a route to delete a vehicle by ID
router.delete('/deletevehicle/:id', isAuth, async (req, res) => {
  try {
    // Ensure that the user is authenticated
    if (!req.user) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to delete this vehicle.',
      });
    }

    // Find the vehicle by ID
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if the authenticated user is the owner of the vehicle
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only delete your own vehicles.',
      });
    }

    // Delete the vehicle from the database
    await Vehicle.findByIdAndRemove(req.params.id);

    res.status(204).json(); // No content response
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
});

// Define a route to update a user's uploaded vehicle by ID
router.put('/updatevehicle/:id', isAuth, async (req, res) => {
  try {
    // Ensure that the user is authenticated
    if (!req.user) {
      return res.status(403).json({
        message: 'Access denied. You are not authorized to update this vehicle.',
      });
    }

    // Find the vehicle by ID
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if the authenticated user is the owner of the vehicle
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only update your own vehicles.',
      });
    }

    // Extract the updated vehicle data from the request body
    const {
      make,
      model,
      year,
      type,
      city,
      registered,
      mileage,
      price,
      for: vehicleFor,
      description,
      enginecapacity,
      fuelType,
    } = req.body;

    // Update the vehicle properties
    vehicle.make = make;
    vehicle.model = model;
    vehicle.year = year;
    vehicle.type = type;
    vehicle.city = city;
    vehicle.registered = registered;
    vehicle.mileage = mileage;
    vehicle.price = price;
    vehicle.for = vehicleFor;
    vehicle.description = description;
    vehicle.enginecapacity = enginecapacity;
    vehicle.fuelType = fuelType;

    // Save the updated vehicle
    const updatedVehicle = await vehicle.save();

    res.status(200).json(updatedVehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update vehicle' });
  }
});

router.get('/admin/getallvehicles', isAuth, isAdmin, async (req, res) => {
  try {
    // Check if the authenticated user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: 'Access denied. You are not an admin.',
      });
    }

    // Find all vehicles, including unapproved ones
    const vehicles = await Vehicle.find()
      .populate('owner', 'name email contactnumber');

    res.status(200).json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

router.put('/editvehiclebyadmin/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const { approved } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to edit this property.' });
    }

    // Update the 'approved' field based on the client's request
    vehicle.approved = approved === 'Yes'; // Convert 'Yes' to true, 'No' to false

    // Save the updated vehicle
    await vehicle.save();

     // Send a notification to the user when the property is approved
     if (approved === 'Yes') {
      const user = await User.findById(vehicle.owner);

      if (user) {
        // Create a notification
        const notification = new Notification({
          sender: req.user._id, // Replace with the actual admin's user ID
          receiver: user._id,
          message: `Your Vehicle "${vehicle.make}" has been approved By Mr.`,
          entityType: 'vehicle', // Set entityType to "property"
          entityId: vehicle._id, // Reference to the created property _id
        });

        // Save the notification
        await notification.save();
      }
    }

    // Fetch the updated list of properties
    const updatedVehicles = await Vehicle.find();

    res.status(200).json({ message: 'Vehicle updated successfully', vehicles: updatedVehicles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update Vehicle' });
  }
});
router.delete('/deletevehiclebyadmin/:id', isAuth, isAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not authorized to edit this property.' });
    }
    // Delete the vehicle
    await Vehicle.findByIdAndRemove(req.params.id);

    // Fetch the updated list of vehicles
    const updatedVehicles = await Vehicle.find();

    res.status(200).json({ message: 'Vehicle deleted successfully', vehicles: updatedVehicles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete Vehicle' });
  }
});



export default router;
