const express = require("express"); // ใช้สร้างเซิร์ฟเวอร์
const bodyParser = require('body-parser');// แปลงข้อมูลจากฟอร์มหรือ JSON ที่มาจากฝั่ง client ให้ใช้งานได้ง่ายใน req.body.
const path = require('path');// ใช้จัดการ path ของไฟล์หรือโฟลเดอร์ในระบบปฏิบัติการ
const { render } = require("ejs");

const app = express(); //ตัวแปรที่ใช้กำหนดการตั้งค่าต่าง ๆ และจัดการเส้นทางของเซิร์ฟเวอร์.
const port = 3000; //ระบุพอร์ตที่เซิร์ฟเวอร์จะรัน

app.set('views',`${__dirname}/static/member`); // กำหนดตำแหน่งโฟลเดอร์ที่เก็บไฟล์ Views (template) เป็นโฟลเดอร์ static
app.set('view engine','ejs'); // ตั้งค่าให้ใช้ EJS เป็น template engine


// กำหนดให้โฟลเดอร์ static เป็นโฟลเดอร์สำหรับเสิร์ฟไฟล์ Static เช่น CSS, JavaScript, และรูปภาพ.
let root_path = path.resolve(__dirname,'static');

app.use(express.static(root_path));

app.get('/login',(req,res) => {
    res.render('sing in');
});

app.get('/home',(req,res) => {
    res.render('home')
})



app.listen(port,() =>{
    console.log(`Server is runing>>> http://localhost:${port}/login`)
})