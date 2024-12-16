import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  entityType: {
    type: String,
    enum: ['property', 'vehicle'],
    required: true,
  },
  entityId: mongoose.Schema.Types.ObjectId, // Reference to the property or vehicle ID
});

export default mongoose.model('Notification', notificationSchema);
