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
    // console.log(receiverName,receiverID,senderID);

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


router.get("/showchat", (req, res) => {
    const userId = req.session.userid; // ใช้ session เพื่อดึง userId
    console.log("This is showchat", userId)
    if (!userId) {
        return res.redirect("/sign_in"); // ถ้ายังไม่ได้ล็อกอินให้ไปหน้า sign in
    }

    const sql = `
        SELECT cr.id AS room_id, cr.name AS room_name, cr.type, 
               m.id AS user_id, m.username, m.email, m.avatar 
        FROM room_participants AS rp
        JOIN chat_rooms AS cr ON rp.room_id = cr.id
        JOIN member AS m ON rp.user_id = m.id
        WHERE m.id = ?
    `;

    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("❌ Error fetching chat data:", err);
            return res.status(500).send("Error fetching chat data");
        }

        console.log("✅ Chat Rooms Data:", results); // เช็คว่ามีข้อมูลออกมาไหม
        res.render("viewchat", { chatRooms: results }); // ส่งข้อมูลไปหน้า EJS
    });
});



router.get('/room/:room_id', (req, res) => {
    const roomId = req.params.room_id;
    const userId = req.session.userid;

    if (!userId) {
        return res.redirect('/sign_up');
    }

    // ดึงข้อมูลห้องแชท
    const roomQuery = `SELECT * FROM chat_rooms WHERE id = ?`;

    // ดึงรายชื่อสมาชิกในห้อง
    const participantsQuery = `
        SELECT m.id, m.username, m.avatar 
        FROM room_participants rp 
        JOIN member m ON rp.user_id = m.id 
        WHERE rp.room_id = ?`;

    // ดึงข้อความแชท
    const messagesQuery = `
        SELECT m.username, c.message, c.sender_id 
        FROM chat_messages c
        JOIN member m ON c.sender_id = m.id
        WHERE c.room_id = ?
        ORDER BY c.timestamp ASC`;

    pool.query(roomQuery, [roomId], (err, roomResults) => {
        if (err || roomResults.length === 0) {
            return res.status(404).send('Chat room not found');
        }

        pool.query(participantsQuery, [roomId], (err, participantsResults) => {
            if (err) {
                return res.status(500).send('Error fetching participants');
            }

            pool.query(messagesQuery, [roomId], (err, messagesResults) => {
                if (err) {
                    return res.status(500).send('Error fetching messages');
                }

                res.render('chat', {
                    room: roomResults[0],
                    participants: participantsResults,
                    messages: messagesResults,
                    userId
                });
            });
        });
    });
});



module.exports = router;