-- Migration: Add title and message columns to notifications table
-- Date: 2025-11-14
-- Description: Thêm columns title và message vào bảng notifications

ALTER TABLE notifications 
  ADD COLUMN title VARCHAR(255) NULL AFTER type,
  ADD COLUMN message TEXT NULL AFTER title;

-- Update existing notifications with default values (optional)
UPDATE notifications 
SET 
  title = CASE 
    WHEN type = 'system' THEN 'Thông báo hệ thống'
    WHEN type = 'reminder' THEN 'Nhắc nhở'
    WHEN type = 'lead' THEN 'Lead mới'
    ELSE 'Thông báo'
  END,
  message = CONCAT('Bạn có một thông báo mới từ hệ thống')
WHERE title IS NULL;
