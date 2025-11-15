# 📱 Setup WebSocket Notification cho Android Mobile

## 🎯 React Native Setup

### 1. Install Dependencies

```bash
npm install socket.io-client
npm install @react-native-async-storage/async-storage
npm install react-native-push-notification  # Optional: Push notification
```

### 2. Tạo Socket Service

Tạo file: `src/services/SocketService.js`

```javascript
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Kết nối WebSocket
  async connect() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No token found');
        return;
      }

      // Đổi URL này theo backend của bạn
      const BACKEND_URL = 'http://YOUR_BACKEND_IP:3000'; // Ví dụ: http://192.168.1.100:3000
      
      this.socket = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.setupListeners();
      console.log('✅ WebSocket connecting...');

    } catch (error) {
      console.error('❌ Socket connection error:', error);
    }
  }

  // Setup event listeners
  setupListeners() {
    if (!this.socket) return;

    // Connected
    this.socket.on('connected', (data) => {
      console.log('✅ WebSocket connected:', data);
      this.emit('socket:connected', data);
      
      // Request unread count
      this.socket.emit('get:unread-count');
    });

    // New notification
    this.socket.on('notification:new', (data) => {
      console.log('🔔 New notification:', data.notification);
      this.emit('notification:new', data.notification);
    });

    // Unread count
    this.socket.on('unread-count', (data) => {
      console.log('📊 Unread count:', data.count);
      this.emit('unread-count', data.count);
    });

    // Marked as read
    this.socket.on('marked:read', (data) => {
      console.log('✅ Marked as read:', data);
      this.emit('marked:read', data);
    });

    // Error
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('socket:error', error);
    });

    // Connect error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      this.emit('socket:connect_error', error);
    });

    // Disconnect
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
      this.emit('socket:disconnected', reason);
    });

    // Reconnecting
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnecting... Attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      this.emit('socket:reconnected', attemptNumber);
    });
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Unsubscribe from events
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // Emit to listeners
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  // Get unread count
  getUnreadCount() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('get:unread-count');
    }
  }

  // Mark as read
  markAsRead(notificationId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark:read', { notificationId });
    }
  }

  // Mark all as read
  markAllAsRead() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('mark:all-read');
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('🔌 Socket disconnected');
    }
  }

  // Check connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Export singleton instance
export default new SocketService();
```

### 3. Setup trong App.js

```javascript
// App.js
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import SocketService from './src/services/SocketService';
import PushNotification from 'react-native-push-notification'; // Optional

function App() {
  useEffect(() => {
    // Kết nối WebSocket khi app start
    SocketService.connect();

    // Lắng nghe notification mới
    const handleNewNotification = (notification) => {
      console.log('🔔 New notification in App:', notification);
      
      // Hiển thị alert
      Alert.alert(
        notification.payload.title,
        notification.payload.message,
        [{ text: 'OK' }]
      );
      
      // Hoặc hiển thị push notification
      showLocalNotification(notification);
    };

    // Lắng nghe unread count
    const handleUnreadCount = (count) => {
      console.log('📊 Unread count:', count);
      // Update badge hoặc UI
    };

    SocketService.on('notification:new', handleNewNotification);
    SocketService.on('unread-count', handleUnreadCount);

    // Cleanup khi unmount
    return () => {
      SocketService.off('notification:new', handleNewNotification);
      SocketService.off('unread-count', handleUnreadCount);
      SocketService.disconnect();
    };
  }, []);

  return (
    // Your app components
  );
}

// Show local notification (Optional)
function showLocalNotification(notification) {
  PushNotification.localNotification({
    channelId: 'default-channel',
    title: notification.payload.title,
    message: notification.payload.message,
    playSound: true,
    soundName: 'default',
  });
}

export default App;
```

### 4. Sử dụng trong Component

```javascript
// screens/NotificationScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import SocketService from '../services/SocketService';
import axios from 'axios';

function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    // Lắng nghe notification mới qua WebSocket
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleUnreadCount = (count) => {
      setUnreadCount(count);
    };

    SocketService.on('notification:new', handleNewNotification);
    SocketService.on('unread-count', handleUnreadCount);

    // Request unread count
    SocketService.getUnreadCount();

    return () => {
      SocketService.off('notification:new', handleNewNotification);
      SocketService.off('unread-count', handleUnreadCount);
    };
  }, []);

  // Load notifications từ API
  const loadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get('http://YOUR_BACKEND_IP:3000/api/v1/notifications/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
    }
  };

  // Mark as read
  const handleMarkAsRead = (notificationId) => {
    SocketService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, readAt: new Date() } : n)
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, !item.readAt && styles.unread]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <Text style={styles.title}>{item.payload.title}</Text>
      <Text style={styles.message}>{item.payload.message}</Text>
      <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={loadNotifications}
      />
    </View>
  );
}

function formatTime(timestamp) {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(timestamp).toLocaleDateString('vi-VN');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0'
  },
  unread: {
    borderLeftColor: '#2196f3',
    backgroundColor: '#e3f2fd'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  time: {
    fontSize: 12,
    color: '#999'
  }
});

export default NotificationScreen;
```

### 5. Cấu hình Network Security (Android)

Tạo file: `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext (HTTP) for development -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">YOUR_BACKEND_IP</domain>
        <domain includeSubdomains="true">192.168.1.100</domain>
        <domain includeSubdomains="true">10.0.2.2</domain> <!-- Android Emulator -->
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

Cập nhật `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

### 6. Cấu hình Push Notification (Optional)

File: `android/app/src/main/java/com/.../MainApplication.java`

```java
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;

// Thêm trong onCreate()
@Override
public void onCreate() {
    super.onCreate();
    
    // Push notification config
    PushNotification.configure(this);
}
```

---

## 🎯 Option 2: Native Android (Java/Kotlin)

### 1. Thêm Dependency

File: `app/build.gradle`

```gradle
dependencies {
    // Socket.io
    implementation 'io.socket:socket.io-client:2.1.0'
    
    // JSON
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

### 2. Tạo SocketManager (Kotlin)

```kotlin
// SocketManager.kt
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject

class SocketManager private constructor() {
    
    private var socket: Socket? = null
    
    companion object {
        @Volatile
        private var instance: SocketManager? = null
        
        fun getInstance(): SocketManager {
            return instance ?: synchronized(this) {
                instance ?: SocketManager().also { instance = it }
            }
        }
    }
    
    fun connect(token: String, backendUrl: String = "http://YOUR_IP:3000") {
        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                transports = arrayOf("websocket", "polling")
                reconnection = true
            }
            
            socket = IO.socket(backendUrl, options)
            
            // Connected
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d("Socket", "✅ Connected")
            }
            
            // Connected event
            socket?.on("connected") { args ->
                val data = args[0] as JSONObject
                Log.d("Socket", "✅ Connected: $data")
            }
            
            // New notification
            socket?.on("notification:new") { args ->
                val data = args[0] as JSONObject
                val notification = data.getJSONObject("notification")
                handleNewNotification(notification)
            }
            
            // Unread count
            socket?.on("unread-count") { args ->
                val data = args[0] as JSONObject
                val count = data.getInt("count")
                handleUnreadCount(count)
            }
            
            socket?.connect()
            
        } catch (e: Exception) {
            Log.e("Socket", "❌ Connection error: ${e.message}")
        }
    }
    
    private fun handleNewNotification(notification: JSONObject) {
        // Hiển thị notification
        val payload = notification.getJSONObject("payload")
        val title = payload.getString("title")
        val message = payload.getString("message")
        
        Log.d("Socket", "🔔 New notification: $title - $message")
        
        // Show Android notification
        showNotification(title, message)
    }
    
    private fun handleUnreadCount(count: Int) {
        Log.d("Socket", "📊 Unread count: $count")
        // Update badge
    }
    
    private fun showNotification(title: String, message: String) {
        // Implement Android notification
    }
    
    fun disconnect() {
        socket?.disconnect()
        socket = null
    }
    
    fun emit(event: String, data: JSONObject? = null) {
        socket?.emit(event, data)
    }
}
```

### 3. Sử dụng trong Activity

```kotlin
// MainActivity.kt
class MainActivity : AppCompatActivity() {
    
    private lateinit var socketManager: SocketManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Get token
        val token = getAuthToken()
        
        // Connect WebSocket
        socketManager = SocketManager.getInstance()
        socketManager.connect(token, "http://192.168.1.100:3000")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        socketManager.disconnect()
    }
    
    private fun getAuthToken(): String {
        val prefs = getSharedPreferences("auth", MODE_PRIVATE)
        return prefs.getString("token", "") ?: ""
    }
}
```

---

## 🌐 Cấu hình Backend URL

### Development:

```javascript
// Trong React Native
const BACKEND_URL = __DEV__ 
  ? 'http://192.168.1.100:3000'  // IP máy tính chạy backend
  : 'https://api.your-domain.com';
```

### Cách lấy IP máy tính:

**Windows:**
```bash
ipconfig
# Tìm IPv4 Address trong Wireless LAN adapter Wi-Fi
# Ví dụ: 192.168.1.100
```

**Mac/Linux:**
```bash
ifconfig
# Tìm inet trong en0 hoặc wlan0
```

---

## 📝 Checklist Setup:

- [ ] Install socket.io-client
- [ ] Tạo SocketService.js
- [ ] Connect trong App.js
- [ ] Lắng nghe notification:new
- [ ] Đổi BACKEND_URL thành IP máy tính
- [ ] Config network_security_config.xml
- [ ] Test trên thiết bị thật hoặc emulator

---

## 🧪 Test:

1. **Chạy backend:**
```bash
cd backend
npm run dev:server
```

2. **Lấy IP máy tính:**
```bash
ipconfig  # Windows
```

3. **Đổi URL trong mobile app:**
```javascript
const BACKEND_URL = 'http://192.168.1.100:3000';
```

4. **Run app:**
```bash
npx react-native run-android
```

5. **Tạo notification từ file test HTML hoặc Postman**

6. **Mobile app sẽ nhận notification ngay!** 🎉

---

## 🚀 Production:

Khi deploy lên production:

```javascript
const BACKEND_URL = 'https://api.your-domain.com';
// Dùng HTTPS, không dùng HTTP
```

---

Bạn đang dùng React Native hay Native Android? Tôi sẽ hỗ trợ chi tiết hơn! 😊

