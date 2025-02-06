const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const multer = require('multer'); //อัพไฟล์รูป
const bodyParser = require('body-parser');
const path = require('path');
const router = express.Router();
const sharp = require('sharp'); //อัดไฟล์รูป

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



router.post('/create_chat',(req,res) => {
    const senderID = req.session.userid;
    const {receiverName,receiverID} = req.body;
    console.log(receiverName,receiverID,senderID);

    if (!receiverName) {
        return res.redirect('sing_in'); // ถ้ายังไม่ได้ login ให้กลับไปหน้า login
    }

    const check_chat = `select cr.id FROM chat_rooms AS cr
        JOIN room_participants AS rp1 ON cr.id = rp1.room_id
        JOIN room_participants AS rp2 ON cr.id = rp2.room_id 
        WHERE cr.type = 'private' AND rp1.user_id = ? AND rp2.user_id = ?`

    
    pool.query(check_chat,[senderID,receiverID],(err,results) => {
        if (err) {
            console.error("Error checking chat room:", err);
            return res.redirect('/home');
        }
        if (results.length > 0) {
            // ห้องแชทมีอยู่แล้ว ใช้ห้องเดิม
            const existingRoomId = results[0].id;
            return res.redirect(`/chat/${existingRoomId}`);
        }

        // ถ้ายังไม่มีห้องแชท, สร้างใหม่
        const sql = "INSERT INTO chat_rooms (name,type) VALUES (?,?)"
        pool.query(sql,[receiverName,'private'],(err,Chatresults) => {
            if (err) {
                console.error("Error creating chat room:", err);
                return res.redirect('/home');
            }

            const roomID = Chatresults.insertId; // ค่า ID ของ chat_rooms ที่เพิ่งถูกสร้าง
            console.log("room Id : ",roomID)

             // เพิ่มผู้ใช้ทั้งสองคนเข้าไปในห้องแชท
            const insert_participant = "INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)"
            pool.query(insert_participant,[roomID,receiverID],(err,results) => {
                if (err) {
                    console.error("Error adding user1:", err);
                    return res.redirect('/home');
                }
                pool.query(insert_participant,[roomID,senderID],(err,results)=>{
                    if (err) {
                        console.error("Error adding user2:", err);
                        return res.redirect('/home');
                    }
                    res.redirect('/home')
                });
            });
        });
    });
});

router.get('/chat')



module.exports = router;