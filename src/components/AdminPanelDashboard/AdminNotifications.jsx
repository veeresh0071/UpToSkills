import React, { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Utility function to format time ago
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

export default function AdminNotifications({ isDarkMode }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch notifications - get admin ID from database (admin ID is 1)
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch notifications for admin role and recipient_id = 1
      const response = await fetch(`${API_BASE}/api/notifications?role=admin&recipientId=1&limit=50`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Fetched notifications:', result); // Debug log
        
        // Map the notifications to ensure consistent field names
        const mappedNotifications = (result.data || []).map(notif => ({
          ...notif,
          created_at: notif.createdAt || notif.created_at,
          notification_type: notif.type || notif.notification_type,
          is_read: notif.isRead !== undefined ? notif.isRead : notif.is_read
        }));
        
        setNotifications(mappedNotifications);
      } else {
        console.error('Failed to fetch notifications:', response.status);
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read - update both local state and database
  const markAsRead = async (notificationId) => {
    // Optimistically update UI first
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true, isRead: true } : notif
      )
    );

    // Update in database
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'admin', recipientId: 1 })
      });

      if (!response.ok) {
        console.error('Failed to mark notification as read');
        // Revert on failure
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      fetchNotifications();
    }
  };

  // Sync dark mode globally
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDarkMode]);

  // Fetch notifications on mount and auto-refresh every 10 seconds
  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <main className={`p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading notifications...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Admin Notifications</h2>
          {unreadCount > 0 && (
            <p className={`text-sm mt-1 ${
              isDarkMode ? "text-blue-400" : "text-blue-600"
            }`}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className={`text-center py-12 ${
          isDarkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          <p>No notifications yet</p>
          <p className="text-sm mt-2">New user registrations will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;
            
            return (
              <div
                key={notification.id}
                onMouseEnter={() => setHoveredId(notification.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (isUnread) {
                    markAsRead(notification.id);
                  }
                }}
                className={`flex justify-between items-start p-4 rounded-xl border transition-all duration-200 shadow-sm cursor-pointer
                  ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 text-gray-100"
                      : "bg-white border-gray-200 text-gray-900"
                  }
                  ${hoveredId === notification.id ? "shadow-lg" : ""}
                  ${isUnread ? (isDarkMode ? "border-blue-500" : "border-blue-300") : ""}
                `}
              >
                {/* Left Section */}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-base ${
                      isUnread ? "font-bold" : "font-medium"
                    }`}>
                      {notification.title}
                    </h3>
                    {isUnread && (
                      <div className={`w-2 h-2 rounded-full ${
                        isDarkMode ? "bg-blue-400" : "bg-blue-500"
                      }`} />
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {notification.message}
                  </p>
                  {notification.metadata && notification.metadata.newUserEmail && (
                    <div className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 inline-block">
                      <strong>Email:</strong> {notification.metadata.newUserEmail}
                    </div>
                  )}
                </div>

                {/* Right Section - Time */}
                <div className="flex flex-col items-end ml-4">
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {formatTimeAgo(notification.createdAt || notification.created_at)}
                  </span>
                  {notification.notification_type === 'registration' && (
                    <span className={`text-xs mt-1 px-2 py-1 rounded ${
                      isDarkMode ? "bg-green-800 text-green-200" : "bg-green-100 text-green-800"
                    }`}>
                      Registration
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
