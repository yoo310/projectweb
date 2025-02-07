const mysql = require("mysql2");
require("dotenv").config(); // โหลดตัวแปรจาก `.env`

const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise(); // ใช้ `.promise()` เพื่อรองรับ `async/await`
