const express = require('express')
const mysql = require('mysql2')
const md5 = require('md5')
const session = require('express-session')
const multer = require('multer')
const bodyParser = require('body-parser')
const path = require('path')
const router = express.Router()

require('dotenv').config();

router.use(bodyParser.urlencoded({extended:true}));
router.use(bodyParser.json());

router.use(session({
    secret: 'adlfhlaskjdhfkljsdfh',  // คีย์เข้ารหัส sessions
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 900000 } // อายุ session 15 นาที
}));

const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 3306,
});

router.post('/sing-up1',(req,res) => {
     // เก็บข้อมูลใน session ในกรณีที่มี การลงทะเบียนแบบหลายขั้นตอน
    req.session.step1 = {
        email: req.body.email,
        username: req.body.username,
        password: req.body.password
    };

    // ตรวจเมลซ้ำ
    const {email} = req.session.step1;
    const checkEmail = "SELECT * FROM member WHERE email = ? "
    pool.query(checkEmail,[email],(err,results) =>{
        if(err){ 
            console.log('Database error:', err);
            return res.render('sing_up2', { msg: 'Database error occurred' });
        }
        if (results.length > 0){ // ถ้าซ้ำ
            return res.render('sing_up1', { msg: '❌ email already exists' });
        }
        // ถ้าไม่ซ้ำ
        console.log("Step 1 data saved:", req.session.step1);
        return res.render("sing_up2"); // ไปยังหน้าถัดไป
    });

    
});

router.post('/sing-up2', (req, res) => {
    // ตรวจสอบว่า session ของ step1 มีอยู่หรือไม่
    if (!req.session.step1) {
        console.log('err'); // แสดงข้อความ error ใน console
        res.render("sing_up1"); // ถ้าไม่มี session ให้กลับไปยังหน้า sing_up1
    };

    // เก็บข้อมูล step2 ลงใน session
    req.session.step2 = {
        gender: req.body.option || [], // เก็บข้อมูล gender จากแบบฟอร์ม (ถ้าไม่มีให้ใช้ [])
        age: req.body.age,            // เก็บข้อมูลอายุจากแบบฟอร์ม
        distance: req.body.distance   // เก็บข้อมูลระยะทางจากแบบฟอร์ม
    };

    // แสดงข้อมูล session step1 และ step2 ใน console เพื่อ Debug
    console.log("Step 1 data saved:", req.session.step1);
    console.log("Step 2 data saved:", req.session.step2);

    // ดึงค่าที่ต้องการจาก session step1 และ step2
    const { email, username, password } = req.session.step1; // ข้อมูล step1
    const { gender, age, distance } = req.session.step2;     // ข้อมูล step2

    // SQL สำหรับเพิ่มข้อมูลลงในฐานข้อมูล
    const sql = "INSERT INTO member (email, username, password, gender, age, distance) VALUES (?, ?, ?, ?, ?, ?)";
    pool.query(sql, [email, username, md5(password), gender, age, distance], (err, results) => {
        if (err) {
            console.log('Database error:', err); // แสดงข้อความ error หากมีปัญหากับฐานข้อมูล
            return res.render('sing_up1', { msg: 'Database error occurred' }); // ส่งกลับไปยัง sing_up1 พร้อมข้อความ error
        }
        res.render('sing_in'); // หากสำเร็จให้แสดงหน้า sing_in
    });
});


// *********************** login ***********************


module.exports = router;