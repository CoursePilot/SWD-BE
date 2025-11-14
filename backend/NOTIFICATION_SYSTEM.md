# Hệ Thống Thông Báo (Notification System)

## Tổng Quan

Hệ thống thông báo tự động gửi notifications cho users khi:
1. **Center tạo khóa học mới** → Thông báo cho tất cả followers của center
2. **Khóa học sắp khai giảng** → Thông báo cho tất cả followers của khóa học đó

## 1. Thông Báo Khi Center Tạo Khóa Học Mới

### Trigger Point
- File: `backend/controllers/course.controller.js`
- Function: `createCourse()`
- Event: Sau khi tạo course thành công

### Logic Flow
```
1. Center tạo course mới
2. Lấy danh sách user_ids đang follow center đó
   - Query: SELECT DISTINCT user_id FROM follows WHERE center_id = ?
3. Tạo notification cho mỗi follower
   - Type: 'system'
   - Title: "Khóa học mới từ trung tâm bạn theo dõi"
   - Message: "Trung tâm [Name] vừa tạo khóa học mới: [Title]"
4. Payload chứa: courseId, centerId, title, summary, image, modality, price
```

### Implementation
```javascript
// Trong course.controller.js - createCourse()
const followerIds = await Follow.getUserIdsByCenter(centerId);

if (followerIds.length > 0) {
  const notificationPromises = followerIds.map(userId => {
    return Notification.create({
      userId,
      type: 'system',
      title: 'Khóa học mới từ trung tâm bạn theo dõi',
      message: `Trung tâm "${center.name}" vừa tạo khóa học mới: "${title}"`,
      payload: JSON.stringify({...})
    });
  });
  await Promise.all(notificationPromises);
}
```

## 2. Thông Báo Khi Khóa Học Sắp Khai Giảng

### Cron Job Setup
- File: `backend/services/scheduleNotificationCron.js`
- Trigger: Chạy tự động mỗi 6 giờ
- Thời gian thông báo: Trước 24 giờ khi khóa học khai giảng

### Logic Flow
```
1. Cron job chạy mỗi 6 giờ
2. Query tìm schedules:
   - status = 'open'
   - start_date > NOW()
   - start_date <= NOW() + 24 hours
   - Chưa gửi notification trong 24h qua
3. Với mỗi schedule tìm được:
   - Lấy danh sách followers của course
   - Tạo notification cho mỗi follower
4. Notification type: 'reminder'
```

### Query Logic
```sql
SELECT s.*, c.*, center.*
FROM schedules s
INNER JOIN courses c ON s.course_id = c.id
INNER JOIN centers center ON c.center_id = center.id
WHERE s.status = 'open'
  AND c.is_deleted = 0
  AND s.start_date > NOW()
  AND s.start_date <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.type = 'reminder'
      AND JSON_EXTRACT(n.payload, '$.scheduleId') = s.id
      AND n.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
  )
```

### Implementation
```javascript
// scheduleNotificationCron.js
async function checkAndNotifyUpcomingSchedules(hoursAhead = 24) {
  const upcomingSchedules = await getUpcomingSchedules(hoursAhead);
  
  for (const schedule of upcomingSchedules) {
    const followers = await getCoursFollowers(schedule.courseId);
    
    await Promise.all(followers.map(userId => {
      return Notification.create({
        userId,
        type: 'reminder',
        title: 'Khóa học sắp khai giảng!',
        message: `Khóa học "${courseTitle}" sẽ khai giảng vào ${startDate} tại ${location}`,
        payload: JSON.stringify({...})
      });
    }));
  }
}
```

### Cron Job Configuration
```javascript
// Trong subscriptionCron.js
setInterval(async () => {
  await scheduleNotificationCron.checkAndNotifyUpcomingSchedules(24);
}, 6 * 60 * 60 * 1000); // Chạy mỗi 6 giờ
```

## 3. API Manual Trigger

### Endpoint: Gửi thông báo schedule thủ công
```
POST /api/v1/schedules/:scheduleId/notify
```

**Body:**
```json
{
  "hoursBefore": 24
}
```

**Response:**
```json
{
  "message": "Gửi thông báo thành công",
  "scheduleId": "uuid",
  "courseTitle": "Khóa học IELTS 7.0+",
  "notificationsSent": 25
}
```

**Use Cases:**
- Test notification system
- Gửi thông báo khẩn cấp cho followers
- Retry nếu cron job fail

## 4. Notification Types

### System Notification (Khóa học mới)
```json
{
  "type": "system",
  "title": "Khóa học mới từ trung tâm bạn theo dõi",
  "message": "Trung tâm \"ABC\" vừa tạo khóa học mới: \"IELTS Master\"",
  "payload": {
    "courseId": "uuid",
    "centerId": "uuid",
    "centerName": "ABC Center",
    "courseTitle": "IELTS Master",
    "courseSummary": "...",
    "courseImage": "https://...",
    "modality": "online",
    "priceMin": 1000000,
    "priceMax": 2000000
  }
}
```

### Reminder Notification (Sắp khai giảng)
```json
{
  "type": "reminder",
  "title": "Khóa học sắp khai giảng!",
  "message": "Khóa học \"IELTS Master\" sẽ khai giảng vào Thứ Hai, 15 tháng 1, 2025 lúc 19:00 tại Phòng 301",
  "payload": {
    "scheduleId": "uuid",
    "courseId": "uuid",
    "centerId": "uuid",
    "centerName": "ABC Center",
    "courseTitle": "IELTS Master",
    "courseSummary": "...",
    "courseImage": "https://...",
    "startDate": "2025-01-15T19:00:00",
    "location": "Phòng 301",
    "notificationType": "course_starting_soon"
  }
}
```

## 5. Follow System

### Follow Center
```
POST /api/v1/follows/center
Body: { "userId": "uuid", "centerId": "uuid" }
```

### Follow Course
```
POST /api/v1/follows
Body: { "userId": "uuid", "courseId": "uuid" }
```

### Database Schema
```sql
follows (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  course_id VARCHAR(36) NULL,     -- NULL nếu follow center
  center_id VARCHAR(36) NULL,     -- NULL nếu follow course
  created_at TIMESTAMP,
  CHECK (
    (course_id IS NOT NULL AND center_id IS NULL) OR 
    (course_id IS NULL AND center_id IS NOT NULL)
  )
)
```

## 6. Configuration

### Cron Job Intervals
- **Schedule Notifications**: Mỗi 6 giờ
- **Notification Window**: 24 giờ trước khi khai giảng
- **Deduplication**: Không gửi lại nếu đã gửi trong 24h qua

### Environment Variables
Không cần config đặc biệt, sử dụng DB connection có sẵn.

## 7. Monitoring & Logs

### Console Logs
```
🕐 Subscription cron jobs initialized
  - Daily expiry check: 24h interval
  - Hourly quota check: 1h interval
  - Schedule notifications: 6h interval (24h before start)

=== Checking Upcoming Schedules ===
Looking for schedules starting in the next 24 hours...
📅 Tìm thấy 3 lịch khai giảng sắp tới
✅ Đã gửi 25 thông báo cho khóa học: IELTS Master
✅ Schedule notification check completed
```

## 8. Error Handling

### Non-blocking Errors
- Lỗi gửi notification KHÔNG làm fail request tạo course
- Lỗi trong cron job được log nhưng không crash server

```javascript
try {
  await sendNotifications();
} catch (notifError) {
  console.error("Lỗi khi gửi thông báo:", notifError);
  // Continue execution
}
```

## 9. Testing

### Test Center Follow Notification
```bash
# 1. User follow center
POST /api/v1/follows/center
{ "userId": "user-1", "centerId": "center-1" }

# 2. Center tạo course mới
POST /api/v1/courses
{ "centerId": "center-1", "title": "Test Course", ... }

# 3. Check notification của user
GET /api/v1/notifications?userId=user-1
```

### Test Schedule Notification
```bash
# 1. User follow course
POST /api/v1/follows
{ "userId": "user-1", "courseId": "course-1" }

# 2. Tạo schedule với start_date trong 24h tới
POST /api/v1/schedules
{ "courseId": "course-1", "startDate": "2025-11-15T10:00:00", ... }

# 3. Trigger manual notification
POST /api/v1/schedules/:scheduleId/notify
{ "hoursBefore": 24 }

# 4. Check notification
GET /api/v1/notifications?userId=user-1
```

## 10. Best Practices

### Performance
- Sử dụng `Promise.all()` để gửi notifications song song
- Query có index trên `user_id`, `course_id`, `center_id`
- Deduplication để tránh spam notifications

### Scalability
- Có thể tăng/giảm interval của cron job
- Có thể adjust `hoursAhead` parameter (12h, 24h, 48h)
- Payload JSON cho phép thêm fields mới không breaking changes

### Maintenance
- Monitor logs để track số lượng notifications
- Regular cleanup notifications cũ (optional)
- Backup database trước khi chạy migration
