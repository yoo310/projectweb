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
    saveUninitialized: false,
    cookie: { maxAge: 900000 } // อายุ session 15 นาที
}));

const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 3306,
});

router.post('/verify',(req,res) => {
    const {email,password} = req.body;
    const hashedPassword = md5(password);

    const sql = "SELECT * FROM member WHERE email = ? "
    pool.query(sql ,[email],(err,results) => {
        if(err){
            console.error('Database error:', err);
            return res.render('sing_in', { msg: 'Database error occurred' });
        }
        if(results.length === 0){
            return res.render('sing_in', { msg: '❌ Wrong username or password' });
        } 
        const user = results[0]
        const username = user.username
        if(user.password !== hashedPassword){
            return res.render('sing_in', { msg: '❌ Wrong username or password' });
        }
        
        req.session.username = username
        // res.render('home', { username });
        res.redirect('/home');
        
    });

});

router.get('/home', (req, res) => {
    username = req.session.username;

    // console.log("req.session.username : ",username); // Debug
    // console.log("GET /home route called"); // Debug

    const sql = "SELECT img, capion, memberName FROM posts"; // ตรวจสอบว่าตาราง posts มีอยู่
    // console.log("Executing SQL Query...");

    pool.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Database error:", err); // Debug หากมีปัญหา MySQL
            return res.status(500).send("Database error");
        }

        // console.log("Posts from database:", results); // Debug ผลลัพธ์จาก MySQL

        // แปลง Buffer เป็น Base64 สำหรับ img
        const formattedResults = results.map(post => ({
            ...post,
            img: post.img ? post.img.toString('base64') : null
        }));
        // ส่งตัวแปรไปยัง home.ejs
        res.render('home', { posts: formattedResults, username: req.session.username });
    });
});






const storage = multer.memoryStorage(); // ใช้ memoryStorage สำหรับเก็บไฟล์ใน RAM ชั่วคราว
const upload = multer({ storage });

router.post("/create_post",upload.single("image"), (req, res) => {
     // ตรวจสอบค่าทั้งหมดที่ได้รับ
    const username = req.session.username

    if (!username){
        return res.send("User not logged in");
    }
    
    const sql = "SELECT ID,username FROM member WHERE username = ? "
    pool.query(sql,[username],(err,results) =>{
        if (err){
            console.log("Data Base error !!")
            return res.send("Data Base error !!")
        }if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const memberID = results[0].ID;
        const member_name = results[0].username;
        const fileBuffer = req.file.buffer; // ดึงข้อมูลไฟล์จาก RAM
        const capion = req.body.capion;


        const insertSql  = "INSERT INTO posts (img,capion,memberID,memberName) VALUES (?,?,?,?)";
        pool.query(insertSql , [fileBuffer,capion,memberID,member_name], (err, result) => {
            if (err) {
                console.error("Error saving to database:", err);
                return res.status(500).send("Database error");
            }
            res.redirect("/home");
            // res.redirect("/home", { username: username });
            // res.send({ message: "File uploaded successfully"});
        });
    });
    
});

router.get('/profile', (req, res) => {
    const username = req.session.username; 
    console.log("Username in session:", username);

    if (!username) {
        return res.redirect('/login'); // ถ้ายังไม่ได้ login ให้กลับไปหน้า login
    }

    const sql = "SELECT * FROM member WHERE username = ?";
    pool.query(sql, [username], (err, results) => {
        if (err) {
            console.log("❌ Database error:", err);
            return res.redirect('/login');
        }

        if (results.length === 0) {
            console.log("❌ User not found!");
            return res.redirect('/login');
        }

        console.log("User found:", results[0]);

        res.render("profile", { username: results[0].username, userData: results[0] });
    });
});








module.exports = router;