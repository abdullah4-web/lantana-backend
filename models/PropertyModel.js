import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    for: {
        type: String,
        enum: ['sale', 'rent'],
        required: true,
    },
    category: {
        type: String,
        enum: ['plot', 'house', 'shop', 'villa', 'office', 'apartment'],
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    area: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    imageUrls: [String], // Store multiple images as an array

    // Reference to the user who added the property
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Create the Property model
const Property = mongoose.model('Property', propertySchema);

export default Property;
