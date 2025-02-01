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
     // เก็บข้อมูลใน session
    req.session.step1 = {
        email: req.body.email,
        username: req.body.username,
        password: req.body.password
    };

    const {email,username,password} = req.session.step1;
    const checkEmail = "SELECT * FROM member WHERE email = ? "
    pool.query(checkEmail,[email],(err,results) =>{
        if(err){
            console.log('Database error:', err);
            return res.render('sing_up2', { msg: 'Database error occurred' });
        }
        if (results.length > 0){
            return res.render('sing_up1', { msg: '❌ email already exists' });
        }
        console.log("Step 1 data saved:", req.session.step1);
        return res.render("member/sing_up2"); // ไปยังหน้าถัดไป
    });

    
});

router.post('/sing-up2', (req,res) =>{
    if(!req.session.step1){
        console.log('err')
        res.render("sing_up1");
    };
    
    req.session.step2 = {
        gender:  req.body.option || [] ,
        age: req.body.age,
        distance: req.body.distance
    };
    console.log("Step 1 data saved:", req.session.step1);
    console.log("Step 2 data saved:", req.session.step2);

    const {email,username,password} = req.session.step1;
    const {gender,age,distance} = req.session.step2;

    const sql = "INSERT INTO member (email, username, password, gender, age, distance) VALUES (?, ?, ?, ?, ?, ?)"
    pool.query(sql,[email,username,md5(password),gender,age,distance],(err,results) =>{
        if(err){
            console.log('Database error:', err);
            return res.render('sing_up1', { msg: 'Database error occurred' });
        }
        res.render('sing_in');
        
    });
  

    
});





module.exports = router;