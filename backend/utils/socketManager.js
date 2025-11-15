const jwt = require('jsonwebtoken');

class SocketManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // Map userId -> Set of socket IDs
  }

  /**
   * Initialize Socket.io with HTTP server
   */
  initialize(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ Socket.io initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        
        console.log(`🔐 User authenticated: ${socket.userEmail} (${socket.userId})`);
        next();
      } catch (error) {
        console.error('Socket authentication error:', error.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      
      // Add socket to user's socket set
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);

      console.log(`🔌 Client connected: ${socket.id} (User: ${userId})`);
      console.log(`📊 Total connections: ${this.io.engine.clientsCount}`);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to notification server',
        socketId: socket.id,
        userId: userId
      });

      // Handle client requesting their unread count
      socket.on('get:unread-count', async () => {
        try {
          const Notification = require('../models/notification.model');
          const count = await Notification.countUnread(userId);
          socket.emit('unread-count', { count });
        } catch (error) {
          console.error('Error getting unread count:', error);
          socket.emit('error', { message: 'Failed to get unread count' });
        }
      });

      // Handle marking notification as read
      socket.on('mark:read', async (data) => {
        try {
          const Notification = require('../models/notification.model');
          await Notification.markAsRead(data.notificationId);
          
          // Send updated unread count
          const count = await Notification.countUnread(userId);
          socket.emit('unread-count', { count });
          
          socket.emit('marked:read', { 
            notificationId: data.notificationId,
            success: true 
          });
        } catch (error) {
          console.error('Error marking as read:', error);
          socket.emit('error', { message: 'Failed to mark as read' });
        }
      });

      // Handle marking all as read
      socket.on('mark:all-read', async () => {
        try {
          const Notification = require('../models/notification.model');
          const count = await Notification.markAllAsReadByUser(userId);
          
          socket.emit('marked:all-read', { 
            count,
            success: true 
          });
          
          // Send updated unread count (should be 0)
          socket.emit('unread-count', { count: 0 });
        } catch (error) {
          console.error('Error marking all as read:', error);
          socket.emit('error', { message: 'Failed to mark all as read' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        // Remove socket from user's socket set
        if (this.userSockets.has(userId)) {
          this.userSockets.get(userId).delete(socket.id);
          if (this.userSockets.get(userId).size === 0) {
            this.userSockets.delete(userId);
          }
        }
        
        console.log(`🔌 Client disconnected: ${socket.id} (User: ${userId})`);
        console.log(`📊 Total connections: ${this.io.engine.clientsCount}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Emit notification to a specific user
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      console.error('Socket.io not initialized');
      return false;
    }

    this.io.to(`user:${userId}`).emit(event, data);
    console.log(`📤 Emitted '${event}' to user ${userId}:`, data);
    return true;
  }

  /**
   * Emit notification to multiple users
   */
  emitToUsers(userIds, event, data) {
    if (!this.io) {
      console.error('Socket.io not initialized');
      return false;
    }

    userIds.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
    return true;
  }

  /**
   * Emit to all connected clients
   */
  emitToAll(event, data) {
    if (!this.io) {
      console.error('Socket.io not initialized');
      return false;
    }

    this.io.emit(event, data);
    console.log(`📤 Broadcast '${event}' to all users`);
    return true;
  }

  /**
   * Send new notification to user in real-time
   */
  sendNotification(userId, notification) {
    console.log("========================================");
    console.log("📤 [socketManager] sendNotification called");
    console.log("📤 [socketManager] userId:", userId);
    console.log("📤 [socketManager] userId type:", typeof userId);
    console.log("📤 [socketManager] notification:", notification);
    console.log("========================================");
    
    return this.emitToUser(userId, 'notification:new', {
      notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send unread count update to user
   */
  sendUnreadCount(userId, count) {
    console.log("========================================");
    console.log("📊 [socketManager] sendUnreadCount called");
    console.log("📊 [socketManager] userId:", userId);
    console.log("📊 [socketManager] userId type:", typeof userId);
    console.log("📊 [socketManager] count:", count);
    console.log("========================================");
    
    return this.emitToUser(userId, 'unread-count', { count });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get number of connections for a user
   */
  getUserConnectionCount(userId) {
    return this.userSockets.has(userId) ? this.userSockets.get(userId).size : 0;
  }

  /**
   * Get total number of connected clients
   */
  getTotalConnections() {
    return this.io ? this.io.engine.clientsCount : 0;
  }

  /**
   * Get Socket.io instance
   */
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketManager();

