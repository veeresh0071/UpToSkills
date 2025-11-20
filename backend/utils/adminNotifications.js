const pool = require('../config/database');
const { pushNotification } = require('./notificationService');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Get all admin users
 */
async function getAllAdmins() {
  try {
    const result = await pool.query('SELECT id, email FROM admins');
    return result.rows;
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
}

/**
 * Create notification for admin when a new user registers
 * @param {string} userRole - The role of the registered user (student, mentor, company)
 * @param {string} userName - The name of the registered user
 * @param {string} userEmail - The email of the registered user
 * @param {object} io - Socket.IO instance for real-time notifications
 */
async function notifyAdminOfNewRegistration({ userRole, userName, userEmail, io }) {
  try {
    const admins = await getAllAdmins();
    
    if (admins.length === 0) {
      console.warn('No admin users found to notify');
      return;
    }

    const title = `New ${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Registered`;
    const message = `${userName} has registered as ${userRole}`;

    // Create notifications for each admin
    const notificationPromises = admins.map(admin => 
      pushNotification({
        role: 'admin',
        recipientRole: 'admin', 
        recipientId: admin.id,
        type: 'registration',
        title,
        message,
        metadata: {
          newUserRole: userRole,
          newUserName: userName,
          newUserEmail: userEmail,
          timestamp: new Date().toISOString()
        },
        io
      })
    );

    await Promise.all(notificationPromises);

    // Send email notifications if configured
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
      await sendEmailNotificationToAdmins({
        admins,
        userRole,
        userName,
        userEmail,
        title,
        message
      });
    }

    console.log(`✅ Notified ${admins.length} admin(s) of new ${userRole} registration: ${userName}`);
  } catch (error) {
    console.error('Error notifying admins of new registration:', error);
  }
}

/**
 * Send email notification to all admins
 */
async function sendEmailNotificationToAdmins({ admins, userRole, userName, userEmail, title, message }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email credentials not configured. Skipping email notifications.');
    return;
  }

  try {
    const emailPromises = admins.map(admin => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: admin.email,
        subject: `UpToSkills - ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
              <p style="font-size: 16px; color: #555; margin-bottom: 15px;">
                ${message}
              </p>
              <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
                <h4 style="color: #333; margin-bottom: 10px;">Registration Details:</h4>
                <ul style="color: #666; padding-left: 20px;">
                  <li><strong>Name:</strong> ${userName}</li>
                  <li><strong>Email:</strong> ${userEmail}</li>
                  <li><strong>Role:</strong> ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</li>
                  <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              <p style="font-size: 14px; color: #777; margin-top: 20px;">
                You can manage this user through the UpToSkills admin dashboard.
              </p>
            </div>
          </div>
        `
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(`✅ Email notifications sent to ${admins.length} admin(s)`);
  } catch (error) {
    console.error('Error sending email notifications:', error);
  }
}

/**
 * Get admin notifications with pagination
 */
async function getAdminNotifications({ adminId, limit = 50, offset = 0, unreadOnly = false }) {
  try {
    let whereClause = 'role = $1 AND recipient_id = $2';
    const params = ['admin', adminId];
    
    if (unreadOnly) {
      whereClause += ' AND is_read = false';
    }
    
    params.push(limit, offset);
    
    const query = `
      SELECT 
        id,
        role,
        recipient_role,
        recipient_id,
        notification_type,
        title,
        message,
        link,
        metadata,
        is_read,
        created_at
      FROM notifications 
      WHERE ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM notifications 
      WHERE ${whereClause.replace('LIMIT $3 OFFSET $4', '')}
    `;
    
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    return {
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      hasMore: (offset + limit) < parseInt(countResult.rows[0].total)
    };
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    return {
      notifications: [],
      total: 0,
      hasMore: false
    };
  }
}

/**
 * Mark admin notification as read
 */
async function markAdminNotificationAsRead(notificationId, adminId) {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2 AND role = $3 RETURNING *',
      [notificationId, adminId, 'admin']
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
}

/**
 * Mark all admin notifications as read
 */
async function markAllAdminNotificationsAsRead(adminId) {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND role = $2 AND is_read = false RETURNING id',
      [adminId, 'admin']
    );
    
    return result.rowCount;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return 0;
  }
}

/**
 * Get count of unread admin notifications
 */
async function getUnreadAdminNotificationCount(adminId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND role = $2 AND is_read = false',
      [adminId, 'admin']
    );
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

module.exports = {
  notifyAdminOfNewRegistration,
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  getUnreadAdminNotificationCount,
  getAllAdmins
};