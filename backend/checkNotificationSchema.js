const db = require('./config/db');

(async () => {
  try {
    // Check ENUM values for type column
    const [rows] = await db.query(`
      SHOW COLUMNS FROM notifications WHERE Field = 'type'
    `);
    
    console.log('Notification type column info:');
    console.log(rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
