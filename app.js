const express = require("express");
const app = express();
const path = require('path');

let dir = path.join(__dirname, '../../')
let url = path.resolve(__dirname, '../../')

app.use(express.static(dir));

const PORT = 3000;
app.listen(PORT, () =>{
    console.log(`${PORT}`);
});

app.get('/',(req, res) =>{
    res,sendFile(url)
});

app.get('/',(req,res)=>{
    res.setHeader('','')
    res.send('')
});