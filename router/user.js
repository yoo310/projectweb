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

const storage = multer.memoryStorage(); // ใช้ memoryStorage สำหรับเก็บไฟล์ใน RAM ชั่วคราว
const upload = multer({ storage });

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
        // console.log(user)
        const username = user.username
        if(user.password !== hashedPassword){
            return res.render('sing_in', { msg: '❌ Wrong username or password' });
        }

        const avatarBase64 = user.avatar ? user.avatar.toString('base64') : null;
        
        req.session.username = username
        req.session.avatar = avatarBase64
        req.session.userid = user.id 
        // res.render('home', { username });
        res.redirect('/home');
        
    });

});

router.get('/home', (req, res) => {
    const username = req.session.username;
    const avatar = req.session.avatar;

    const sql = `
        SELECT p.*, m.username, m.avatar, m.id
        FROM posts as p
        JOIN member as m ON p.ownerID = m.id
        ORDER BY p.time DESC
    `; // p.* → ดึง ทุกคอลัมน์ จากตาราง posts

    // จัดกลุ่มโพสต์ของแต่ละ user
    pool.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Database error:", err); // Debug หากมีปัญหา MySQL
            return res.status(500).send("Database error");
        }

        // console.log("Posts from database:", results); // Debug ผลลัพธ์จาก MySQL

        const groupedPosts = {};
        results.forEach(post => {
            const userID = post.ownerID;
            if (!groupedPosts[userID]) {
                groupedPosts[userID] = {
                    userid:userID,
                    username: post.username,
                    avatar: post.avatar ? post.avatar.toString('base64') : null,
                    posts: []
                };
            }
            groupedPosts[userID].posts.push({
                postID: post.postID, // ใช้ post.id สำหรับฟีเจอร์ Join
                capion: post.capion,
                time: new Date(post.time).toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }),
                ownerID:post.ownerID,
                img: post.img ? post.img.toString('base64') : null
            });
        });
        // ส่งตัวแปรไปยัง home.ejs

        res.render('home', {groupedPosts,username,avatar });
    });
});

router.post("/create_post",upload.single("image"), (req, res) => {
     // ตรวจสอบค่าทั้งหมดที่ได้รับ
    const username = req.session.username   
    const avatar = req.session.avatar
    // console.log("/create_post "); 
    // console.log(" req.session.username : ",username);
    // console.log(" req.session.username : ",avatar);
    
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
        const Poster_avatar = avatar


        const insertSql  = "INSERT INTO posts (img,capion,memberID,memberName,posterAvatar) VALUES (?,?,?,?,?)";
        pool.query(insertSql , [fileBuffer,capion,memberID,member_name,Poster_avatar], (err, result) => {
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

router.post('/join',(req,res) => {
    const userid = req.session.userid
    const {postID,ownerID} = req.body;

    const sql = "INSERT INTO join_posts (ownerID,postID,userID) VALUES (?,?,?)"
    pool.query(sql,[ownerID,postID,userid],(err,results) =>{
        if (err) {
            console.error("Error saving to database:", err);
            res.redirect('/home')
        }
        res.redirect('/home')
    });
    
});

 
router.get('/profile', (req, res) => {
    const username = req.session.username; 
    // console.log("Username in session:", username);
    if (!username) {
        return res.redirect('sing_in'); // ถ้ายังไม่ได้ login ให้กลับไปหน้า login
    }
    const sql = "SELECT * FROM member WHERE username = ?";
    pool.query(sql, [username], (err, results) => {
        if (err) {
            console.log("❌ Database error:", err);
            return res.redirect('/sing_in');
        }
        if (results.length === 0) {
            console.log("❌ User not found!");
            return res.redirect('/sing_in');
        }
        const formattedResults = results.map(data => ({
            ...data,
            avatar: data.avata ? data.avata.toString('base64') : null
        }));
        const userData = formattedResults[0];
        // console.log("✅ userData:", userData); // ตรวจสอบ userData ก่อนใช้
        
        if (!userData) {
            console.log("❌ userData is undefined");
            return res.redirect('/sing_in');
        }

        const userid = userData.id;
        // console.log(userid);
        const mypost = "SELECT * FROM posts WHERE ownerID = ?"
        pool.query(mypost, [userid], (err, results) => {
            if (err) {
                console.log("❌ Database error:", err);
                return res.redirect('/sing_in');
            }
            if (results.length === 0) {
                console.log("❌ User not found!");
                return res.redirect('/sing_in');
            }
            const formattedResultsFromPosts = results.map(post => ({ // post => ({ ...post }) หรือ callback function ที่ใช้ใน map() คุณสามารถกำหนดชื่อพารามิเตอร์ใน map() เป็นอะไรก็ได้
                ...post,
                // toLocaleDateString() เป็นเมธอดใน JavaScript ที่ช่วยจัดรูปแบบวันที่ตามภาษาหรือรูปแบบที่กำหนด
                time: new Date(post.time).toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false // 24 ชั่วโมง
                }),
                img: post.img ? post.img.toString('base64') : null, // ตรวจสอบประเภทของไฟล์ก่อนแปลงเป็น Base64:
                posterAvatar: post.posterAvatar ? post.posterAvatar.toString('base64') : null
            }));
            // console.log("✅ Posts Data:", formattedResultsFromPosts);
            res.render("profile", { username: userData.username, userData, postAt_past: formattedResultsFromPosts });
        });
    }); 
});

router.get("/profile/:username", (req, res) => {
    const memberName = req.params.username?.trim(); // ✅ ตัดช่องว่างที่อาจเกิดขึ้น
    
    //  memberName อย่างละเอียด
    if (!username) {
        return res.redirect('sing_in'); // ถ้ายังไม่ได้ login ให้กลับไปหน้า login
    }

    const sql = "SELECT * FROM member WHERE username = ?";
    pool.query(sql, [memberName], (err, results) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).send("Database error.");
        }
        if (results.length === 0) {
            return res.status(404).send("❌ ไม่พบข้อมูลผู้ใช้");
        }
        const formattedResults = results.map(data => ({
            ...data,
            avatar: data.avata ? data.avata.toString('base64') : null
        }));
        const userData = formattedResults[0];

        // console.log("✅ userData:", userData); // ตรวจสอบ userData ก่อนใช้
        
        if (!userData) {
            console.log("❌ userData is undefined");
            return res.redirect('/sing_in');
        }

        const userid = userData.id;
        // console.log(userid);
        const mypost = "SELECT * FROM posts WHERE memberID = ?"
        pool.query(mypost, [userid], (err, results) => {
            if (err) {
                console.log("❌ Database error:", err);
                return res.redirect('/sing_in');
            }
            if (results.length === 0) {
                console.log("❌ User not found!");
                return res.redirect('/sing_in');
            }
            const formattedResultsFromPosts = results.map(post => ({ // post => ({ ...post }) หรือ callback function ที่ใช้ใน map() คุณสามารถกำหนดชื่อพารามิเตอร์ใน map() เป็นอะไรก็ได้
                ...post,
                // toLocaleDateString() เป็นเมธอดใน JavaScript ที่ช่วยจัดรูปแบบวันที่ตามภาษาหรือรูปแบบที่กำหนด
                time: new Date(post.time).toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false // 24 ชั่วโมง
                }),
                img: post.img ? post.img.toString('base64') : null, // ตรวจสอบประเภทของไฟล์ก่อนแปลงเป็น Base64:
                posterAvatar: post.posterAvatar ? post.posterAvatar.toString('base64') : null
            }));
            // console.log("✅ Posts Data:", formattedResultsFromPosts);
            res.render("profile", { username: userData.username, userData, postAt_past: formattedResultsFromPosts });
        });

    });
});





module.exports = router;