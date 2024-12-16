import express from 'express';
import Notification from '../models/notificationModel.js';
import { isAdmin, isAuth } from '../utils.js';
const router = express.Router();


// List all notifications for admin
router.get('/admin', isAuth, isAdmin, async (req, res) => {
  try {
    const userId = req.user._id;
    if (req.user.isAdmin) {
      const notifications = await Notification.find({ receiver: userId })
      .populate({path :'sender',select: '-password' })
      .populate ({path :'receiver',select: '-password' }) .populate('entityType entityId');
      res.status(200).json(notifications);
    } else {
      res.status(403).json({ error: 'Access denied. Only admins can view all notifications.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}); 
// List all notifications for the authenticated user
router.get('/user', isAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    if (req.user) {
      const notifications = await Notification.find({ receiver: userId })
        .populate({
          path: 'sender',
          select: 'name', // Include only the name field from sender
        })
        .populate({
          path: 'receiver',
          select: '-password', // Exclude the password field from receiver
        })
        .populate('entityType entityId'); // Exclude other fields from the notification documents

      res.status(200).json(notifications);
    } else {
      res.status(403).json({ error: 'Access denied. Only admins can view all notifications.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
 
// Create a new notification


router.post('/createnotification',isAuth, isAdmin ,async (req, res) => {
  try {
    const { sender, receiver, message, propertyId } = req.body;
    const notification = new Notification({
      sender,
      receiver,
      message,
      propertyId,
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Notification creation failed' });
  }
});

// List all notifications
router.get('/allnotifications',isAuth, isAdmin ,async (req, res) => {
  try {
    const notifications = await Notification.find().populate('sender receiver propertyId');
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});



// Mark a notification as read by admin
router.put('/admin/markasread/:notificationId', isAuth, isAdmin, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Check if the notification exists
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark the notification as read in the database
    notification.isRead    = 'true'; // Note the use of 'read' as a string
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});
// Mark a notification as read by a regular user
router.put('/user/markasread/:notificationId', isAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Check if the notification exists
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check if the notification belongs to the authenticated user
    if (notification.receiver.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied. This notification does not belong to you.' });
    }

    // Mark the notification as read in the database
    notification.isRead    = 'true'; // Note the use of 'read' as a string
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}); 


// Delete a notification by admin
router.delete('/admin/delete/:notificationId', isAuth, isAdmin, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Check if the notification exists
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Delete the notification from the database
    await Notification.deleteOne({ _id: notificationId }); // Use deleteOne instead of remove

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});



// Delete a notification by regular user
router.delete('/user/delete/:notificationId', isAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Check if the notification exists
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Check if the notification belongs to the authenticated user
    if (notification.receiver.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Access denied. This notification does not belong to you.' });
    }

    // Delete the notification from the database
    await Notification.deleteOne({ _id: notificationId }); 

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});


export default router;
