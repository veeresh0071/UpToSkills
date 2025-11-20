const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  getUnreadAdminNotificationCount
} = require('../utils/adminNotifications');

// Middleware to ensure user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

/**
 * GET /api/admin/notifications
 * Get all notifications for admin with pagination
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false
    } = req.query;

    const result = await getAdminNotifications({
      adminId: req.user.id,
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

/**
 * GET /api/admin/notifications/unread-count
 * Get count of unread notifications for admin
 */
router.get('/unread-count', verifyToken, requireAdmin, async (req, res) => {
  try {
    const count = await getUnreadAdminNotificationCount(req.user.id);
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification count'
    });
  }
});

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', verifyToken, requireAdmin, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await markAdminNotificationAsRead(notificationId, req.user.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification'
    });
  }
});

/**
 * PATCH /api/admin/notifications/mark-all-read
 * Mark all notifications as read for admin
 */
router.patch('/mark-all-read', verifyToken, requireAdmin, async (req, res) => {
  try {
    const updatedCount = await markAllAdminNotificationsAsRead(req.user.id);
    
    res.json({
      success: true,
      data: { updatedCount },
      message: `${updatedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications'
    });
  }
});

module.exports = router;