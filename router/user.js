const express = require('express')
const mysql = require('mysql2')
const md5 = require('md5')
const session = require('express-session')
const multer = require('multer') //อัพไฟล์รูป
const bodyParser = require('body-parser')
const path = require('path')
const router = express.Router()
const sharp = require('sharp'); //อัดไฟล์รูป

require('dotenv').config();

router.use(bodyParser.urlencoded({extended:true}));
router.use(bodyParser.json());

const storage = multer.memoryStorage(); // ใช้ memoryStorage สำหรับเก็บไฟล์ใน RAM ชั่วคราว
const upload = multer({ storage });

const pool = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 3306,
});

const processImage = async (buffer) => {
    try {
        const resizedBuffer = await sharp(buffer)
            .resize(500) // ปรับขนาด
            .toFormat('jpeg', { quality: 80 }) // ลดคุณภาพ
            .toBuffer();
        return resizedBuffer;
    } catch (err) {
        console.error('Error resizing image:', err);
        throw err; // ส่ง error กลับไปให้ตัวที่เรียกใช้งาน
    }
};

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
        console.log(req.session.username)
        // res.render('home', { username });
        res.redirect('home');
        
    });

});

router.get('/home', (req, res) => {
    const username = req.session.username;
    const userid = req.session.userid;

    // ✅ ดึงข้อมูลทุกโพสต์และข้อมูลเจ้าของโพสต์
    const sql = `
        SELECT p.*, m.username, m.avatar, m.id
        FROM posts AS p
        JOIN member AS m ON p.ownerID = m.id
        ORDER BY p.time DESC
    `;

    const userSql = "SELECT avatar FROM member WHERE id = ?"; // ดึง avatar ของตัวเอง

    pool.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).send("Database error");
        }

        pool.query(userSql, [userid], (err, userResults) => {
            if (err) {
                console.error("❌ Database error (User Avatar):", err);
                return res.status(500).send("Database error");
            }

            // ✅ แปลงข้อมูลให้รองรับการแสดงผล
            const posts = results.map(post => ({
                postID: post.postID,
                capion: post.capion,
                time: new Date(post.time).toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }),
                ownerID: post.ownerID,
                ownerName: post.username,
                avatar: post.avatar ? post.avatar.toString('base64') : null,
                img: post.img ? post.img.toString('base64') : null
            }));

            // ✅ ดึง avatar ของ User ที่ล็อกอิน
            const userAvatar = userResults[0]?.avatar ? userResults[0].avatar.toString('base64') : null;

            // ✅ ส่งข้อมูลไปยัง home.ejs
            res.render('home', { posts, username, userAvatar });
        });
    });
});


router.post("/create_post", upload.single("image"), async (req, res) => {
    const username = req.session.username;
    let avatar = req.session.avatar; // เก็บ avatar จาก session (ถ้ามี)

    if (!username) {
        return res.status(401).send("User not logged in");
    }

    try {
        // ดึงข้อมูลสมาชิกจากฐานข้อมูล
        const sql = "SELECT ID, username, avatar FROM member WHERE username = ?";
        pool.query(sql, [username], async (err, results) => {
            if (err) {
                console.log("❌ Database error:", err);
                return res.status(500).send("Database error");
            }
            if (results.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            const memberID = results[0].ID;
            const member_name = results[0].username;

            // ดึง avatar จากฐานข้อมูล ถ้ายังไม่มีใน session
            if (!avatar) {
                avatar = results[0].avatar;
            }

            // ตรวจสอบว่ามีไฟล์แนบมาหรือไม่
            if (!req.file) {
                return res.redirect('/home');
            }

            // ปรับขนาดภาพก่อนบันทึก
            const originalBuffer = req.file.buffer;
            const resizedBuffer = await processImage(originalBuffer);

            const capion = req.body.capion;

            // คำสั่ง SQL สำหรับเพิ่มโพสต์ใหม่
            const insertSql = "INSERT INTO posts (img, capion, ownerID, ownerName, posterAvatar) VALUES (?, ?, ?, ?, ?)";
            pool.query(insertSql, [resizedBuffer, capion, memberID, member_name, avatar], (err, result) => {
                if (err) {
                    console.error("❌ Error saving to database:", err);
                    return res.status(500).send("Database error");
                }
                res.redirect("/home");
            });
        });

    } catch (err) {
        console.error("Error processing image:", err);
        res.redirect('/home')
        // return res.status(500).send("Image processing error");
    }
});

router.post('/join',(req,res) => {
    const userid = req.session.userid
    const {postID,ownerID,ownerName} = req.body;

    const sql = "INSERT INTO join_posts (ownerID,postID,userID) VALUES (?,?,?)"
    pool.query(sql,[ownerID,postID,userid],(err,results) =>{
        if (err) {
            console.error("Error saving to database:", err);
            res.redirect('/home')
        }

        const create_chat = "INSERT INTO chat_rooms (name,type) VALUES (?,?)"
        const type = "group"
        pool.query(create_chat,[ownerName,type],(err,results) => {
            if (err) {
                console.error("Error create chat to database:", err);
                res.redirect('/home')
            }
            res.redirect('/home')
        });
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
            avatar: data.avatar ? data.avatar.toString('base64') : null
        }));
        const userData = formattedResults[0];
        // console.log("✅ userData:", userData); // ตรวจสอบ userData ก่อนใช้
        
        if (!userData) {
            console.log("❌ userData is undefined");
            return res.redirect('/sing_in');
        }

        const userid = userData.id;
        // console.log(userid);
        const mypost = `
        SELECT p.*, m.username, m.avatar, m.id
        FROM posts AS p
        JOIN member AS m ON p.ownerID = m.id
        WHERE p.ownerID = ?
        ORDER BY p.time DESC
        `;
        // const mypost = "SELECT * FROM posts WHERE ownerID = ?"
        pool.query(mypost, [userid], (err, results) => {
            if (err) {
                console.log("❌ Database error:", err);
                return res.render('sing_in');
            }
            const formattedResultsFromPosts = results.map(post => ({
                ...post,
                time: new Date(post.time).toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }),
                ownerID: post.ownerID, 
                ownerName: post.username, 
                avatar: post.avatar ? post.avatar.toString('base64') : null,
                img: post.img ? post.img.toString('base64') : null,
               
            }));
            // console.log("✅ Posts Data for Profile:", formattedResultsFromPosts);
            res.render("Myprofile", {userData, postAt_past: formattedResultsFromPosts });
        });
    }); 
});

router.get("/profile/:username", (req, res) => {
    const memberName = req.params.username; // ✅ ตัดช่องว่างที่อาจเกิดขึ้น
    // console.log(memberName)
    //  memberName อย่างละเอียด
    if (!memberName) {
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
            avatar: data.avatar ? data.avatar.toString('base64') : null
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
            }));
            // console.log("✅ Posts Data:", formattedResultsFromPosts);
            res.render("profile", { username: userData.username, userData, postAt_past: formattedResultsFromPosts });
        });

    });
});

router.get('/profile_edit',(req,res) => {
    const username = req.session.username;
    // console.log(username) 

    if (!username) {
        return res.redirect('sing_in'); // ถ้ายังไม่ได้ login ให้กลับไปหน้า login
    }

    const sql = "SELECT * FROM member WHERE username = ?"
    pool.query(sql,[username],(err,results) => {
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

        res.render('editProfile',{userData})
    });
});

router.post('/profile_update',upload.single('avatar'), async (req,res) => {
    const check_userid = req.session.userid;

    if (!check_userid) {
        return res.redirect('sing_in'); // ถ้ายังไม่ได้ login ให้กลับไปหน้า login
    }

    try {
        const {username,email,gender,age,interested} = req.body
        let avatar = null

        if (!req.file) {
            return res.redirect('/home');
        }

        const originalBuffer = req.file.buffer;
        const resizedBuffer = await processImage(originalBuffer);

        // อัปเดตตาราง `member`
        const sql = "UPDATE member SET username = ? ,email = ? ,gender = ?,age = ?,Interested = ?, avatar = ? WHERE id = ?"
        pool.query(sql,[username,email,gender,age,interested,resizedBuffer,check_userid],(err,results) =>{
            if (err) {
                console.log("❌ Database error:", err);
                return res.redirect('/home');
            }

            const sql2 = "UPDATE posts SET posterAvatar = ? WHERE ownerName = ?"
            pool.query(sql2,[resizedBuffer,check_userid],(err,results) => {
            if (err) {
                console.log("❌ Database error:", err);
                return res.redirect('/home');
            }
            return res.redirect("/profile");
            });
        });
    } catch (error){
        console.error("Error processing image:", error);
        res.redirect('/home')
        // return res.status(500).send("Image processing error")
    }
    

    
});





module.exports = router;