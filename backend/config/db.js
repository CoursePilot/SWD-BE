const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studyportal',
    port: process.env.DB_PORT || 3306,
    timezone: '+07:00', // Giờ VN
    // Connection pool settings
    connectionLimit: 10,
    acquireTimeout: 60000,
    // Keep alive
    keepAliveInitialDelay: 0,
    enableKeepAlive: true
});

module.exports = pool; 
