const db = require("../config/db");
const Notification = require("../models/notification.model");
const Follow = require("../models/follow.model");

/**
 * Tìm các schedules sắp khai giảng trong khoảng thời gian cụ thể
 * @param {number} hoursAhead - Số giờ trước khi khai giảng cần thông báo
 * @returns {Array} Danh sách schedules cần thông báo
 */
async function getUpcomingSchedules(hoursAhead = 24) {
  try {
    const [rows] = await db.query(
      `SELECT 
        s.id AS scheduleId,
        s.course_id AS courseId,
        s.start_date AS startDate,
        s.end_date AS endDate,
        s.location,
        s.seats,
        s.status,
        c.title AS courseTitle,
        c.summary AS courseSummary,
        c.image_url AS courseImage,
        c.center_id AS centerId,
        center.name AS centerName
      FROM schedules s
      INNER JOIN courses c ON s.course_id = c.id
      INNER JOIN centers center ON c.center_id = center.id
      WHERE s.status = 'open'
        AND c.is_deleted = 0
        AND s.start_date > NOW()
        AND s.start_date <= DATE_ADD(NOW(), INTERVAL ? HOUR)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.type = 'reminder'
            AND JSON_EXTRACT(n.payload, '$.scheduleId') = s.id
            AND n.created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
        )
      ORDER BY s.start_date ASC`,
      [hoursAhead, hoursAhead]
    );
    
    return rows;
  } catch (error) {
    console.error("Error getting upcoming schedules:", error);
    throw error;
  }
}

/**
 * Gửi thông báo khai giảng cho followers của một khóa học
 */
async function sendScheduleNotifications(schedule) {
  try {
    const { scheduleId, courseId, courseTitle, courseSummary, courseImage, startDate, location, centerId, centerName } = schedule;
    
    // Lấy danh sách user đang follow khóa học này
    const [followers] = await db.query(
      `SELECT DISTINCT user_id 
       FROM follows 
       WHERE course_id = ?`,
      [courseId]
    );
    
    if (followers.length === 0) {
      console.log(`⚠️ Không có follower nào cho khóa học: ${courseTitle}`);
      return 0;
    }

    // Định dạng ngày giờ khai giảng
    const startDateFormatted = new Date(startDate).toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Tạo notification cho mỗi follower
    const notificationPromises = followers.map(follower => {
      return Notification.create({
        userId: follower.user_id,
        centerId,
        type: 'reminder',
        payload: {
          title: 'Khóa học đã mở lớp khai giảng',
          message: `Khóa học "${courseTitle}" sẽ khai giảng vào ${startDateFormatted} tại ${location}`,
          scheduleId,
          courseId,
          centerId,
          centerName,
          courseTitle,
          courseSummary,
          courseImage,
          startDate,
          location,
          notificationType: 'course_starting_soon'
        }
      });
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Đã gửi ${followers.length} thông báo cho khóa học: ${courseTitle}`);
    
    return followers.length;
  } catch (error) {
    console.error("Error sending schedule notifications:", error);
    throw error;
  }
}

/**
 * Chạy job kiểm tra và gửi thông báo cho schedules sắp khai giảng
 */
async function checkAndNotifyUpcomingSchedules(hoursAhead = 24) {
  try {
    console.log('=== Checking Upcoming Schedules ===');
    console.log(`Looking for schedules starting in the next ${hoursAhead} hours...`);
    
    const upcomingSchedules = await getUpcomingSchedules(hoursAhead);
    
    if (upcomingSchedules.length === 0) {
      console.log('ℹ️ Không có lịch khai giảng nào trong thời gian tới');
      return { schedulesFound: 0, notificationsSent: 0 };
    }

    console.log(`📅 Tìm thấy ${upcomingSchedules.length} lịch khai giảng sắp tới`);
    
    let totalNotifications = 0;
    for (const schedule of upcomingSchedules) {
      const count = await sendScheduleNotifications(schedule);
      totalNotifications += count;
    }

    console.log('✅ Schedule notification check completed', {
      schedulesFound: upcomingSchedules.length,
      notificationsSent: totalNotifications
    });

    return {
      schedulesFound: upcomingSchedules.length,
      notificationsSent: totalNotifications
    };
  } catch (error) {
    console.error('❌ Error in schedule notification job:', error);
    throw error;
  }
}

/**
 * Gửi thông báo nhắc nhở trước X giờ (flexible)
 */
async function notifyBeforeSchedule(scheduleId, hoursBefore = 1) {
  try {
    const [schedules] = await db.query(
      `SELECT 
        s.id AS scheduleId,
        s.course_id AS courseId,
        s.start_date AS startDate,
        s.location,
        c.title AS courseTitle,
        c.summary AS courseSummary,
        c.image_url AS courseImage,
        c.center_id AS centerId,
        center.name AS centerName
      FROM schedules s
      INNER JOIN courses c ON s.course_id = c.id
      INNER JOIN centers center ON c.center_id = center.id
      WHERE s.id = ?
        AND s.status = 'open'
        AND c.is_deleted = 0`,
      [scheduleId]
    );

    if (schedules.length === 0) {
      throw new Error('Schedule not found or not available');
    }

    return await sendScheduleNotifications(schedules[0]);
  } catch (error) {
    console.error('Error sending manual schedule notification:', error);
    throw error;
  }
}

module.exports = {
  checkAndNotifyUpcomingSchedules,
  notifyBeforeSchedule,
  getUpcomingSchedules,
  sendScheduleNotifications
};
