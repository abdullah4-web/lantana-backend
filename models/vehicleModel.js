// Import mongoose
import mongoose from 'mongoose';

// Define a Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  registered: {
    type: String,
    required: true,
  },
  mileage: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  for: {
    type: String,
    enum: ['sale', 'rent'],
    required: true,
  },
  type: {
    type: String,
    enum: ['car', 'bus', 'truck', 'van', 'haice' , 'motorcycle' , 'bicycle' , 'sportscar'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  enginecapacity: {
    type: Number,
    required: true,
  },
  fuelType: {
    type: String,
    required: true,
  },
  approved: {
    type: Boolean,
    default: false, // Default value is false
  },
  featured: {
    type: Boolean,
    default: false, // Default value is false
  },
  imageUrls: [String],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
},
updatedAt: {
    type: Date,
    default: Date.now,
},
});

// Create a Vehicle Model
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Export the Vehicle model
export default Vehicle;
