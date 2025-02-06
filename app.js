const express = require("express"); // ใช้สร้างเซิร์ฟเวอร์
const bodyParser = require('body-parser');// แปลงข้อมูลจากฟอร์มหรือ JSON ที่มาจากฝั่ง client ให้ใช้งานได้ง่ายใน req.body.
const path = require('path');// ใช้จัดการ path ของไฟล์หรือโฟลเดอร์ในระบบปฏิบัติการ
const session = require('express-session')

const app = express(); //ตัวแปรที่ใช้กำหนดการตั้งค่าต่าง ๆ และจัดการเส้นทางของเซิร์ฟเวอร์.
const port = 3000; //ระบุพอร์ตที่เซิร์ฟเวอร์จะรัน

app.set('views',`${__dirname}/Static/member`); // กำหนดตำแหน่งโฟลเดอร์ที่เก็บไฟล์ Views (template) เป็นโฟลเดอร์ static
app.set('view engine','ejs'); // ตั้งค่าให้ใช้ EJS เป็น template engine

// กำหนดให้โฟลเดอร์ static เป็นโฟลเดอร์สำหรับเสิร์ฟไฟล์ Static เช่น CSS, JavaScript, และรูปภาพ.
let root_path = path.join(__dirname,'Static');
app.use(express.static(root_path));

app.use(session({
    secret: 'adlfhlaskjdhfkljsdfh',  // คีย์เข้ารหัส sessions
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 900000 } // อายุ session 15 นาที
}));


const userRouter = require('./router/user');
const registerRouter = require('./router/register');
const chatRouter = require('./router/chat');
app.use('/register',registerRouter);
app.use('/user',userRouter);
app.use('/chat',chatRouter);
app.use('/',userRouter);


app.get('/welcome', (req, res) => {
    res.render('welcome')
});


// ************** welcome *****************
app.get('/singup1',(req,res) =>{
    res.render('sing_up1')
});
app.get('/singin',(req,res) =>{
    res.render('sing_in')
});



app.listen(port,() =>{
    console.log(`Server is runing>>> http://localhost:${port}/welcome`)
});