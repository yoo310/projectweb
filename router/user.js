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
        res.render('home', { username });
        
    });

});

module.exports = router;