# implementation_plan.md — Lucky Draw (shared state)

| รายการ | รายละเอียด |
|---|---|
| Branch | `feature/sop-restructure` |
| Phase ปัจจุบัน | 1 · Requirements — **gate ยังไม่ผ่าน** (ดู [README](README.md#phase-1-quality-gate)) |
| Task list | [task.md](task.md) |
| วันงาน | ยังไม่ยืนยัน (Q6) timeline ด้านล่างนับเป็นวันทำงาน D1 = วันถัดจาก Phase 1 gate ผ่าน |

## เป้าหมาย

สร้างแอปวงล้อใหม่บน stack ของ SOP (React + TypeScript + Tailwind, Node.js + Express + TypeScript, Docker Compose, Railway) โดยคงหน้าตาเดิมทุกพิกเซล ย้ายการสุ่มไป backend และย้ายค่ารางวัลไปแท็บ `Prizes` ใน Google Sheet ไม่มี database (D-01 ถึง D-11)

## ภาพรวมระบบ (ระดับ requirement ไม่ใช่ design)

```
Kiosk (React SPA) ──cookie JWT──> Backend (Express) ──token──> Apps Script Web App ──> Google Sheet
                                  - login / ล็อกบูธ                                     - Auto Feedback  (Form บูธ A)
                                  - สุ่ม + lock ต่อบูธ                                    - Sopify Feedback (Form บูธ B)
                                  - อ่าน/ตรวจ Prizes                                     - Prizes
                                                                                         - คงเหลือ (สูตร)
```

## Phase และ gate

| Phase | Output | Gate | Owner |
|---|---|---|---|
| 1 Requirements | เอกสารใน `docs/requirements/` | PO อนุมัติ, Q1–Q5 ตอบแล้ว, ทีมตกลง DoR/DoD | PM |
| 2 Design | ภาพ baseline + mockup ส่วนใหม่ + design README (ข้อยกเว้น D-02) | Tab + Enter/Space, 375px ไม่แตก, loading/empty/error ครบ | `frontend-engineer` |
| 3 Data Design | Sheet Data Design + API spec (แทน schema/migration ตาม D-01) | PO/Senior อนุมัติ | `backend-engineer` |
| 4 TDD | Failing tests จาก AC ทุกข้อ | Test รันได้และ fail ด้วยเหตุผลที่ถูก | `qa` |
| 5 Write Code | Backend, frontend, `Code.gs`, Docker, Railway | Per-endpoint gate ของ SOP + DoD | `backend-engineer`, `frontend-engineer` |
| 6 Testing | Visual, perf, security, UAT | Gate 1 (sandbox) + Gate 2 (UAT sign-off) | `qa` |

## Timeline (3 sprint × 5 วันทำงาน)

| Sprint | วัน | `backend-engineer` | `frontend-engineer` | `qa` | Story ที่ต้องเสร็จ |
|---|---|---|---|---|---|
| 1 | D1–D5 | T-301, T-302, T-501, T-502 | T-201, T-202, T-511, T-512 | T-401, T-402, T-403 | US-010..013, US-040 |
| 2 | D6–D10 | T-503, T-504, T-505 | T-513, T-514 | T-404, T-405, T-406 | US-001..003, 006, 007, 030..036, 038, 039, 041, 043 |
| 3 | D11–D15 | T-506 (ถ้า Q1 = เก็บโควตา), T-507 | T-515, T-516, T-517 | T-407, T-408, T-601, T-602, T-603 | ที่เหลือทั้งหมด + UAT |
| Buffer | D16–D17 | แก้ bug จาก UAT | แก้ bug จาก UAT | Regression | ต้องเสร็จก่อนวันงานอย่างน้อย 2 วันทำงาน |

## Dependency สำคัญ

- Phase 1 gate → ทุก task ใน Phase 2 ขึ้นไป
- T-301, T-302 → T-404, T-405, T-503, T-504, T-505
- T-402 + T-404 → T-504 · T-403 → T-502 · T-405 → T-503 · T-406 → T-514, T-515 · T-407 → T-516, T-517
- Q1 → T-301 (ส่วนโควตา), T-408, T-506 · Q4 → T-516 · Q7 → T-302, T-507

## ความเสี่ยง

| ความเสี่ยง | ผลกระทบ | แนวทาง |
|---|---|---|
| Apps Script ช้า (1–3 วินาที ต่อครั้ง บวกเวลารอ lock) | หมุนรอนาน | วงล้อหมุนรอผลทันทีที่แตะ (REQ-025), timeout 25 วินาที, NFR-004 (Q5) |
| เน็ตหน้างานหลุด | หมุนไม่ได้ | REQ-026 + hotspot สำรองตาม `PLAN.md` |
| ทีมงานเรียงหรือลบแถวใน Sheet | เขียนผลผิดแถว (id = เลขแถว) | NFR-023 runbook + REQ-028 ตรวจชื่อที่คาดไว้ |
| Railway รันหลาย instance | lock และตัวนับ login ไม่ใช้ร่วมกัน | NFR-019 บังคับ 1 instance + REQ-034 ตรวจ stock ซ้ำใน Apps Script |
| Port ฉาก three.js ไป React แล้วหน้าตาเพี้ยน | เสียจุดดึงคน | AC-043-01 เทียบภาพ baseline, T-513 ประเมิน 3 วัน |
