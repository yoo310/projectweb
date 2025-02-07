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

                    // ✅ เพิ่มข้อความต้อนรับเข้าไปใน `messages`
                    const welcomeMessage = "Welcome to the chat!";
                    const insert_message = `
                        INSERT INTO messages (room_id, sender_id, message, created_at) 
                        VALUES (?, ?, ?, NOW())`;
                    pool.query(insert_message, [roomID, senderID, welcomeMessage], (err) => {
                        if (err) {
                            console.error("Error adding welcome message:", err);
                        }
                        res.redirect(`/chat/room/${roomID}/${receiverID}`);
                    });
                });
            });
        });
    });
});


router.get("/showchat", (req, res) => {
    const userId = req.session.userid; // ดึง userId จาก session
    // console.log("This is showchat", userId);

    if (!userId) {
        return res.redirect("/sign_in"); // ถ้ายังไม่ได้ล็อกอินให้ไปหน้า sign in
    }

    const sql = `
        SELECT cr.id AS room_id, cr.name AS room_name, cr.type, 
               sender.id AS sender_id, sender.username AS sender_name, sender.email AS sender_email, sender.avatar AS sender_avatar,
               receiver.id AS receiver_id, receiver.username AS receiver_name, receiver.email AS receiver_email, receiver.avatar AS receiver_avatar
        FROM room_participants AS rp
        JOIN chat_rooms AS cr ON rp.room_id = cr.id
        JOIN member AS sender ON rp.user_id = sender.id
        JOIN room_participants AS rp2 ON rp.room_id = rp2.room_id
        JOIN member AS receiver ON rp2.user_id = receiver.id
        WHERE rp.user_id = ? AND rp2.user_id != ?;
    `;

    pool.query(sql, [userId, userId], (err, results) => {
        if (err) {
            console.error("❌ Error fetching chat data:", err);
            return res.status(500).send("Error fetching chat data");
        }

        // console.log("✅ Chat Rooms Data (With Receiver Info):", results); 

        res.render("viewchat", { chatRooms: results, userId }); // ส่งข้อมูลไปหน้า EJS
    });
});

// มาทำอันนี้ต่อ
router.get("/room/:roomId/:receiverId", async (req, res) => {
    const { roomId, receiverId } = req.params;
    const userId = req.session.userid;

    // console.log("roomId,receiverId,userId",roomId,receiverId,userId)

    try {
        // console.log("⚡ Running SQL Query...");
        // ✅ ดึงข้อมูลของผู้รับ
        const [receiverResults] = await pool.promise().query(
            `SELECT id AS receiver_id, username AS receiver_name, email AS receiver_email, avatar AS receiver_avatar 
             FROM member WHERE id = ?`, 
            [receiverId]
        );
        // console.log("🟢 Query executed successfully!");

        if (!Array.isArray(receiverResults) || receiverResults.length === 0) {
            return res.status(404).send("Receiver not found");
        }

        const receiverData = receiverResults[0];
        console.log("receiverData",receiverData)
        // ✅ ดึงข้อความของห้องแชท
        const [messageResults] = await pool.promise().query(
            `SELECT sender_id, message, created_at AS created_at 
             FROM messages 
             WHERE room_id = ? 
             ORDER BY created_at  ASC;`,
            [roomId]
        );

        console.log("✅ Messages Data:", messageResults);
        
        const messages = Array.isArray(messageResults) ? messageResults : [];
        
        res.render("chatroom", {
            roomId,
            receiver: receiverData,
            userId,
            messages // ป้องกัน `undefined`
        });
        
    } catch (err) {
        console.error("❌ Error fetching chat data:", err);
        res.status(500).send("Error fetching chat data");
    }
});



router.post("/send_message", async (req, res) => {
    const { roomId, receiverId, message } = req.body;
    const senderId = req.session.userId; // ดึง sender ID จาก session

    if (!senderId || !roomId || !receiverId || !message) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // ✅ บันทึกข้อความลงฐานข้อมูล
        const sql = `INSERT INTO messages (room_id, sender_id, receiver_id, message, created_at) 
                     VALUES (?, ?, ?, ?, NOW())`;
        await pool.execute(sql, [roomId, senderId, receiverId, message]);

        console.log(`✅ Message saved: Room ${roomId}, Sender ${senderId}, Receiver ${receiverId}`);
        
        res.status(200).json({ success: true, message: "Message sent successfully" });
    } catch (err) {
        console.error("❌ Error saving message:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});








module.exports = router;