ผู้จัดทำ
นายสหรัฐ ฉายยา 66022208
นางสาว ชนาภา ติใหม่ 66021331 


# 🚀 Web Project Setup Guide
## 📌 ขั้นตอนการติดตั้งโปรเจค (Localhost)
1.สร้างฐานข้อมูล **`web_project`** ใน MySQL ด้วยคำสั่ง:
```sql
CREATE DATABASE web_project;

2.นำเข้าไฟล์ web_project.sql ไปยังฐานข้อมูล web_project ด้วยคำสั่ง:
mysql -u root -p web_project < web_project.sql

3.แก้ไขไฟล์ .env เพื่อกำหนดค่าการเชื่อมต่อ MySQL
DB_USER=root
DB_HOST=localhost
DB_NAME=web_project
DB_PASSWORD=
DB_PORT=3306

4.ติดตั้ง Dependencies ด้วยคำสั่ง:
npm i

5.รันเซิร์ฟเวอร์โดยใช้คำสั่ง:
npm run start




