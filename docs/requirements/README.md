# Phase 1: Requirements — Lucky Draw วงล้อนำโชค

> ต่อจาก `REQUIREMENTS.md` v1.0 และ `PLAN.md` · Branch `feature/sop-restructure` · สถานะ: **Draft รอ Product Owner อนุมัติ**

## เอกสารในหมวดนี้

| ลำดับ | เอกสาร | คำอธิบาย |
|:-----:|:-------|:---------|
| 1.1 | [Raw Requirement List (MoSCoW)](1.1_Raw_Requirement_List_MoSCoW.md) | 69 REQ + 23 NFR พร้อม MoSCoW และรายการ Won't |
| 1.2 | [User Story List](1.2_User_Story_List.md) | 42 stories แยกตาม role (ผู้เล่น, ทีมงานบูธ, ผู้จัดงาน) และ feature |
| 1.3 | [Acceptance Criteria](1.3_Acceptance_Criteria.md) | AC แบบ Given/When/Then ทุก story + NFR checklist, map AC-01..AC-12 เดิม |
| 1.5 | [Definition of Ready & Done](1.5_Definition_of_Ready_Done.md) | DoR/DoD ของโปรเจกต์ (ปรับจาก template SOP ตาม D-01, D-02) |
| - | [task.md](task.md) | Shared state: task 1–3 วัน พร้อม owner (`qa`, `backend-engineer`, `frontend-engineer`) |
| - | [implementation_plan.md](implementation_plan.md) | Shared state: phase, gate, timeline 3 sprint, dependency, ความเสี่ยง |

## การตัดสินใจ (approved by product owner)

| ID | การตัดสินใจ | อ้างอิง |
|---|---|---|
| D-01 | Stack ตาม SOP: React + TypeScript + Tailwind, Node.js + Express + TypeScript, Docker Compose, deploy บน Railway **ไม่มี database** ใช้ Google Sheet ผ่าน Apps Script (backend เรียกด้วย shared token, URL/token อยู่ใน env ของ server เท่านั้น) | REQ-090, NFR-009, NFR-018, NFR-019 |
| D-02 | คงดีไซน์ "เวทีในความมืด" ของ `lucky-spin.html` แบบ pixel-for-pixel (สี, Bai Jamjuree + IBM Plex Sans Thai, วงล้อ 3D three.js, motion, เสียง) เป็นข้อยกเว้นที่อนุมัติแล้วต่อสีแบรนด์ SOP Phase 2 หน้า login มีแล้วในสไตล์เดียวกัน | REQ-070..076, REQ-099 |
| D-03 | Login ก่อนเข้าแอป: username + password (env) เลือกบูธ A/B ในหน้า login, JWT ใน cookie HttpOnly หมดอายุ 4 ชั่วโมงหลัง login ไม่ต่ออายุ, session ล็อกกับบูธ (ทุก path กลับหน้าบูธตัวเอง, API ใช้เฉพาะแท็บของบูธ), ผิด 10 ครั้งล็อก 15 นาที, `/logout` เพื่อสลับบูธ | REQ-001..006 |
| D-04 | บูธ A "Auto Pre-Inspection Camera" แท็บ `Auto Feedback`, บูธ B "Sopify" แท็บ `Sopify Feedback` แต่ละบูธมี Google Form ของตัวเอง คอลัมน์: Timestamp, ข้อมูลติดต่อ (= ชื่อ), บริษัท, อีเมล, ความสนใจในการต่อยอด, ข้อเสนอแนะเพิ่มเติม (= feedback) + `played`, `รางวัล` ไม่มีคอลัมน์ id ใช้ `row-N` หมุนได้คนละ 1 ครั้งต่อบูธ | REQ-010, REQ-024 |
| D-05 | Flow หน้าบูธ: ฟัง → ดู demo → สแกน QR ส่ง Form โชว์หน้า "ส่งคำตอบแล้ว" รับแสตมป์ → ทีมงานแตะชื่อ (ขึ้นภายใน 20 วินาที) → ผู้เล่นแตะหมุน → รับรางวัล | REQ-011, REQ-020, REQ-096 |
| D-06 | รางวัลมี 3 อย่างเท่านั้น: กระบอกน้ำ 6 (A 3 / B 3), กระเป๋าผ้า 15 (A 8 / B 7), ผ้าเย็น 160 (A 80 / B 80) ไม่มีช่องปลอบใจ ผู้ได้กระบอกน้ำหรือกระเป๋าผ้าไม่ได้ผ้าเย็นเพิ่ม | REQ-031, REQ-095 |
| D-07 | ย้ายการสุ่มไป backend (แก้ Open Issue 1): server สุ่มด้วย crypto randomness ภายใต้ lock ตรวจ stock เขียน Sheet แล้วคืนผล frontend แค่หมุนให้หยุดตรงรางวัลที่ได้ | REQ-021..026, REQ-091 |
| D-08 | ค่ารางวัล (ชื่อ, สี, เรท, stock ต่อบูธ, โควตาสะสมรายชั่วโมงแบบไม่บังคับ, enabled, win) อยู่ในแท็บ `Prizes` ใหม่ใน Sheet (แก้ Open Issue 2) ทีมงานแก้ใน Sheet ทุก kiosk เห็นค่าเดียวกัน แท็บรางวัลในแอปเป็นแบบอ่านอย่างเดียว แท็บ "เชื่อมต่อ Google Sheet" ถูกลบแล้ว | REQ-030, REQ-036, REQ-066, REQ-092, REQ-093 |
| D-09 | วงล้อ: ช่องกว้างเท่ากัน 40 ช่อง จำนวนช่องตามโอกาสจริง (ขั้นต่ำ 1) รางวัลที่สุ่มไม่ได้หายจากวงล้อ วงล้อปิด (ปุ่มหมุนปิด, "ของรางวัลหมดแล้ว") เมื่อบูธไม่มีรางวัลเหลือ | REQ-040..043 |
| D-10 | แท็บสรุป `คงเหลือ` (สูตร) ใน Sheet ยังอยู่ | REQ-035 |
| D-11 | คงของเดิมจาก spec v1.0 ถ้าไม่ขัดกับข้อข้างบน: รีเฟรช 20 วินาที, state ของฉากเปิดรางวัลและข้อความสถานะ, CSV, PIN แอดมิน, reduced-motion, วงล้อ 2D, a11y, XSS escaping, NFR ด้าน performance (คิวผลออฟไลน์ขัดกับ D-07 ดู Q2) | REQ-011, REQ-050..053, REQ-060..065, REQ-073, REQ-075, NFR-001..008 |

## Open Questions

ต้องได้คำตอบจาก Product Owner ก่อน Phase 1 gate ผ่าน (Q1–Q5) หรือก่อน task ที่ระบุ (Q6–Q7) PM แนะนำแต่ไม่ได้ตัดสินใจแทน

**Q1. เก็บโควตาสะสมรายชั่วโมง หรือใช้ stock รวมต่อบูธอย่างเดียว** (REQ-033, US-037, T-408, T-506)
ตัวเลขจาก `PLAN.md`: คาดว่ามีคนหมุน ~57 ครั้ง/บูธ/ชั่วโมง โควตาปล่อย ~26 ชิ้น/บูธ/ชั่วโมง (1 + 2 + 23) บูธ A มีรวม 91 ชิ้น
- **A. เก็บโควตา:** ของกระจายตลอด 13:00–16:30 ทุกชั่วโมงมีโอกาสได้รางวัลใหญ่ ข้อเสีย: วงล้อจะปิดกลางชั่วโมงหลังหมุนครบ ~26 ครั้ง จนถึงต้นชั่วโมงถัดไป (คนที่ยังไม่หมุนกลับมาหมุนได้), ต้องมีคอลัมน์โควตาใน `Prizes`, คิดเวลาเป็น Asia/Bangkok บน server (Railway เป็น UTC), งานเพิ่ม ~2 วัน
- **B. stock รวมอย่างเดียว:** ง่ายกว่า มาก่อนได้ก่อน ข้อเสีย: ที่ ~57 ครั้ง/ชั่วโมง ของบูธ A น่าจะหมดราว 14:40 วงล้อปิดประมาณ 2 ชั่วโมงสุดท้าย และรางวัลใหญ่อาจหมดในชั่วโมงแรก
- **แนะนำ A** เพราะตรงกับตารางใน `PLAN.md` และบูธยังมีของดึงคนตลอดงาน

**Q2. ยืนยันว่าไม่หมุนระหว่างออฟไลน์** (REQ-026, REQ-101, AC-017-01)
เมื่อการสุ่มอยู่ที่ backend เครื่องที่ต่อ backend หรือ Apps Script ไม่ได้จะสุ่มหรือตรวจ stock ไม่ได้ คิวผลออฟไลน์เดิมจึงใช้ไม่ได้ **แนะนำ:** ออฟไลน์ = ไม่ได้หมุน แสดงข้อความและให้ลองใหม่ (มี hotspot สำรองตาม `PLAN.md`) ข้อดี: ไม่แจกเกินและไม่มีผลที่แก้ได้ในเครื่อง ข้อเสีย: ระหว่างเน็ตหลุดไม่มีใครหมุนได้

**Q3. เมื่อผ้าเย็นสุ่มไม่ได้ รางวัลใหญ่จะแทบได้แน่นอน** (REQ-022, REQ-041)
สูตรโอกาสจริงเกลี่ยเรทให้รางวัลที่เหลือ เมื่อผ้าเย็นหมดหรือครบโควตา กระบอกน้ำ/กระเป๋าผ้าจะมีโอกาสรวม 100% คนถัดไปจะได้รางวัลใหญ่จนกว่าจะหมดหรือครบโควตา
- **a. ยอมรับ:** ถ้า Q1 = A เกิดได้ไม่เกิน 1 กระบอกน้ำ + 2 กระเป๋าผ้าต่อบูธต่อชั่วโมง
- **b. ปิดวงล้อเมื่อผ้าเย็นสุ่มไม่ได้:** รางวัลใหญ่ออกตามเรทเสมอ แต่อาจเหลือรางวัลใหญ่ไม่ได้แจกจนจบงาน
- **แนะนำ a ถ้า Q1 = A, แนะนำ b ถ้า Q1 = B** (ช่องปลอบใจถูกตัดออกแล้วตาม D-06)

**Q4. เก็บ PIN แอดมินที่ไหน** (REQ-060, REQ-067, T-516)
ตอนนี้ PIN อยู่ใน localStorage ของแต่ละเครื่อง กันได้แค่การกดผิด แต่ปุ่ม "ให้หมุนใหม่" แก้ Sheet และคืน stock **แนะนำ:** ย้าย PIN ไป env ของ server (`ADMIN_PIN`) และให้ backend ตรวจ PIN ก่อน endpoint รีเซ็ต ข้อเสีย: เปลี่ยน PIN ในแอปไม่ได้ ต้องแก้ env แล้ว redeploy (AC-023-04 จะถูกตัดออก)

**Q5. เป้า performance ที่ต่างจาก SOP** (NFR-004)
SOP กำหนด P95 < 2 วินาทีบน critical path แต่ Apps Script ใช้ 1–3 วินาทีต่อครั้งบวกเวลารอ lock **แนะนำ:** P95 < 2 วินาทีเฉพาะ endpoint ที่ไม่เรียก Apps Script และ P95 < 5 วินาทีสำหรับหมุนและโหลดรายชื่อ วัดบนเน็ตหน้างาน วงล้อเริ่มหมุนทันทีเพื่อกลบเวลารอ

**Q6. วันงาน** (implementation_plan.md)
ต้องมีวันที่เพื่อผูก timeline แผนต้องการ 15 วันทำงาน + buffer 2 วันหลัง Phase 1 gate ผ่าน

**Q7. Topology ตอน production** (สำหรับ Tech Lead, T-302, T-507)
**แนะนำ:** backend เสิร์ฟไฟล์ build ของ frontend ใน production (origin เดียว, cookie `SameSite=Strict` ใช้ได้, server redirect หน้าได้ตาม REQ-003, Railway 1 service ตาม NFR-019) ส่วน `docker-compose.yml` มี service frontend สำหรับ build/dev และ backend ข้อเสีย: container frontend ไม่ได้รันแยกใน production

## Phase 1 Quality Gate

| เกณฑ์ | สถานะ | หลักฐาน |
|---|---|---|
| MoSCoW done | ผ่าน | 1.1: 92 รายการ (Must 60, Should 14, Could 6, Won't 12) |
| Every story has AC | ผ่าน | 1.3: 42/42 stories มี AC แบบ Given/When/Then, AC-01..AC-12 เดิม map แล้ว |
| NFRs stated | ผ่าน | 1.1: NFR-001..023 (auth/session, rate limit, integration, performance, security, container/deploy) |
| DoR/DoD agreed by the team | **ยังไม่ผ่าน** | 1.5 ร่างแล้ว ตารางลงนามยังว่าง |
| Roadmap/timeline linked | ผ่านบางส่วน | [implementation_plan.md](implementation_plan.md) + [task.md](task.md) มี timeline แบบวันทำงาน ยังไม่มีวันจริง (Q6) |
| Product Owner อนุมัติเอกสาร Phase 1 | **ยังไม่ผ่าน** | รออนุมัติและคำตอบ Q1–Q5 |

**สถานะ gate: ยังไม่ผ่าน** ห้ามเริ่ม Phase 2 จนกว่า PO อนุมัติ ตอบ Q1–Q5 และทีมลงนาม DoR/DoD
