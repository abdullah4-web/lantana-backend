import express from "express";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import userRouter from './routes/userRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import LocationRouter from './routes/LocationRouter.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.json());

// Connect to the database
mongoose.connect(process.env.MONGODB_URI || "your_database_uri", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to the database");
});




// API Routes
// Basic route
app.get('/', (req, res) => {
  res.send('API is Working. Continue Your Spirits of the application.');
});
// Use the custom middleware for routes that should be accessible only from your frontend
app.use('/api/properties', propertyRoutes);
app.use('/api', LocationRouter);

// Routes that should be accessible without any origin restriction
app.use('/api/users', userRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});



// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
