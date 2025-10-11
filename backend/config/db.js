const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studyportal',
    port: process.env.DB_PORT || 40593,
    timezone: '+07:00' // Giờ VN
   
});

module.exports = pool; 
