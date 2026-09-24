# Lucky Draw — วงล้อนำโชค

รันบนเครื่องหรือ Railway ข้อมูลอยู่ใน Google Sheet ที่ต่อกับ Google Form

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บ ดีไซน์เดียวกับ `sources/lucky-spin.html` แก้เฉพาะ logic: preset บูธ, โควตารายชั่วโมง, ชื่อคอลัมน์ของ Form, URL จาก `.env` |
| `Code.gs` | Apps Script วางใน Google Sheet |
| `server.js` | login (JWT) + เสิร์ฟหน้าเว็บ + proxy ไป Apps Script อ่านค่าจาก env ไม่มี dependency |
| `login.html` | หน้า login ใช้สีและฟอนต์เดียวกับแอป |
| `Dockerfile`, `docker-compose.yml`, `railway.json` | รันใน container / Railway |

## 1. เตรียม Google Sheet

1. เปิด Sheet ที่รับคำตอบจาก Google Form
2. หัวคอลัมน์แถวแรกต้องมี `ชื่อ` (คำถามใน Form ตั้งชื่อตรงนี้) และเพิ่มคอลัมน์ `played` กับ `รางวัล` เองที่ท้ายตาราง
   - ไม่บังคับ: `id`, `Booth`, `บริษัท`, `Feedback` (ถ้าไม่มี `id` ระบบใช้เลขแถวแทน)
   - คอลัมน์อื่นของ Form เช่น `Timestamp` ปล่อยไว้ได้
3. `ส่วนขยาย › Apps Script` วางโค้ดจาก `Code.gs` แล้วบันทึก
4. `ทำให้ใช้งานได้ › การทำให้ใช้งานได้รายการใหม่ › เว็บแอป`
   - เรียกใช้ในฐานะ: **ฉัน**
   - ผู้มีสิทธิ์เข้าถึง: **ทุกคน**
5. คัดลอก Web App URL (ลงท้าย `/exec`)

แก้ `Code.gs` ภายหลัง ต้อง deploy เวอร์ชันใหม่ทุกครั้ง (`จัดการการทำให้ใช้งานได้ › แก้ไข › เวอร์ชันใหม่`)

## 2. ตั้ง token ใน Apps Script

1. สุ่มค่า token ยาวๆ เช่น `openssl rand -hex 24`
2. Apps Script › `Project Settings` (รูปเฟือง) › `Script Properties` › เพิ่ม `TOKEN` = ค่านั้น
3. Deploy เวอร์ชันใหม่ (`Deploy › Manage deployments › แก้ไข › New version`) URL เดิมใช้ต่อได้

หลังตั้ง `TOKEN` แล้ว Apps Script จะตอบเฉพาะ request ที่มี token ตรงกัน ใครได้ URL ไปก็ใช้ไม่ได้

## 3. ตั้งค่า env

คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า

| ตัวแปร | ค่า |
|---|---|
| `SCRIPT_GOOGLE_SHEET` | Web App URL ลงท้าย `/exec` |
| `SCRIPT_TOKEN` | ค่าเดียวกับ `TOKEN` ใน Apps Script |
| `APP_USERNAME` | ชื่อผู้ใช้หน้า login (ค่าเริ่มต้น `booth`) |
| `APP_PASSWORD` | รหัสผ่านหน้า login ว่าง = ปิด login (ใช้บนเครื่องเท่านั้น) **ต้องตั้งบน Railway** |
| `JWT_SECRET` | คีย์เซ็น session ยาวๆ สุ่ม `openssl rand -hex 32` ถ้าไม่ตั้ง restart แล้วทุกเครื่องต้อง login ใหม่ |

- URL และ token อยู่บน server เท่านั้น หน้าเว็บเรียกผ่าน `/api/players` และ `/api/post`
- Login แล้วได้ session (JWT ใน cookie `HttpOnly`, `SameSite=Strict`, `Secure` บน https) ใช้ได้ **4 ชั่วโมง** นับจากตอน login ไม่ต่ออายุอัตโนมัติ ให้ login ก่อนงานไม่เกิน 30 นาที (งาน 13:00–16:30)
- หมดอายุระหว่างใช้งาน: ผลที่หมุนแล้วเก็บในคิว หน้าเว็บพาไป login แล้วส่งผลให้อัตโนมัติ
- กรอกรหัสผิด 10 ครั้ง ล็อก 15 นาที
- ออกจากระบบ: เปิด `<host>/logout`

## 4. รัน

| วิธี | คำสั่ง |
|---|---|
| Node 22+ | `npm start` |
| Docker | `docker compose up -d --build` |
| Railway | New Project › Deploy from GitHub repo › ใส่ตัวแปรทั้ง 5 ใน `Variables` (Railway ใช้ `Dockerfile` และ `railway.json` เอง) |

| บูธ | URL | แท็บที่อ่าน |
|---|---|---|
| A | `<host>/?booth=A` | `Auto Feedback` |
| B | `<host>/?booth=B` | `Sopify Feedback` |

`<host>` = `http://127.0.0.1:8787` บนเครื่อง หรือโดเมน Railway

ของรางวัล เรท และโควตารายชั่วโมงตั้งตาม `PLAN.md` ให้แล้ว แก้เรทได้ในหน้าแอดมิน (PIN `1234` เปลี่ยนก่อนวันงาน)
เครื่องที่เคยเปิดแอปมาก่อนให้กด `แอดมิน › ตั้งค่า › รีเซ็ต` หนึ่งครั้ง

## ทดสอบ

```bash
npm test
```

- `code.test.js`: `Code.gs` กับชีตจำลอง (อ่านรายชื่อ, บันทึกครั้งเดียว, กันเขียนทับ, `row-N`, รีเซ็ต, token, แท็บคงเหลือ)
- `server.test.js`: proxy (ไม่หลุด URL, ส่ง token, 502 เมื่อ Apps Script ล่ม) และ login (JWT 4 ชม., cookie, หมดอายุ, แก้ token, `alg:none`, open redirect, ล็อกหลังผิด 10 ครั้ง)
