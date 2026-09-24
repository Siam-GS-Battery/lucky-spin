# task.md — Lucky Draw (shared state)

สถานะ: `[ ]` ยังไม่เริ่ม · `[/]` กำลังทำ · `[x]` เสร็จ · Branch: `feature/sop-restructure`
แผนและลำดับ: [implementation_plan.md](implementation_plan.md) · AC: [1.3](1.3_Acceptance_Criteria.md)

กติกา: หยิบ task ได้เมื่อผ่าน DoR ([1.5](1.5_Definition_of_Ready_Done.md)) ทุก task 1–3 วัน มี owner หนึ่งค่า estimate เป็นค่าที่ PM เสนอ รอ senior + junior ยืนยัน

## Phase 1 — Requirements (PM)

- [x] เขียน 1.1 MoSCoW, 1.2 User Stories, 1.3 AC, 1.5 DoR/DoD, README
- [ ] Product Owner อนุมัติเอกสาร Phase 1 และตอบ Q1–Q5 (ดู [README](README.md#open-questions))
- [ ] ทีมตกลง DoR/DoD (ตารางลงนามใน 1.5)
- [ ] ยืนยันวันงาน (Q6) เพื่อผูก timeline

## Phase 2 — Design (เริ่มหลัง Phase 1 gate ผ่าน)

- [ ] **T-201** `frontend-engineer` · 1 วัน · ถ่ายภาพ baseline ของ `lucky-spin.html` (Select, Ready, Spinning, Reveal, Admin, Login ที่ 1440×900 และ 390×844, PNG @2x) + design README บันทึกข้อยกเว้น D-02 และ map token สีและฟอนต์ไป Tailwind config · AC-043-01, AC-043-02
- [ ] **T-202** `frontend-engineer` · 1 วัน · Mockup ส่วนที่ไม่มีใน baseline: แท็บของรางวัลแบบอ่านอย่างเดียว, วงล้อปิด, ข้อความหมุนไม่สำเร็จ, คำเตือนค่าตั้งรางวัลผิด · AC-022-03, AC-005-01, AC-017-01, AC-031-01

## Phase 3 — Data Design (แทน Database ตาม D-01)

- [ ] **T-301** `backend-engineer` · 1 วัน · Sheet Data Design: คอลัมน์แท็บบูธ, แท็บ `Prizes` (คอลัมน์ ชนิด การตรวจค่า รูปแบบโควตา), สูตรแท็บ `คงเหลือ`, runbook ข้อห้ามเรียง/แทรก/ลบแถว · REQ-010, REQ-030, REQ-032, REQ-035, NFR-023 · ส่วนโควตารอ Q1
- [ ] **T-302** `backend-engineer` · 1 วัน · API spec: `/login`, `/logout`, `/healthz`, รายชื่อ, สถานะวงล้อ, หมุน, รีเซ็ต และ contract ของ action Apps Script (read, play พร้อมชื่อที่คาดไว้และตรวจ stock, reset) · รอ Q7 สำหรับ topology

## Phase 4 — TDD: failing tests ก่อน implement

- [ ] **T-401** `qa` · 1 วัน · Test harness: Vitest (BE, FE), Supertest, React Testing Library, Apps Script จำลอง, coverage threshold BE 80% / FE 70% · NFR-020
- [ ] **T-402** `qa` · 1 วัน · Unit test service สุ่มและการแบ่งช่อง · AC-032-03, AC-033-01, AC-035-01, AC-036-01..03, AC-022-01
- [ ] **T-403** `qa` · 1 วัน · Test auth และ session · AC-010-01..04, AC-011-01..03, AC-012-01..04, AC-013-01, AC-040-01..03, NFR-012, NFR-013, NFR-015
- [ ] **T-404** `qa` · 2 วัน · Integration test API · AC-001-01..03, AC-017-02, AC-017-03, AC-021-01, AC-021-03, AC-031-01..03, AC-030-01, AC-030-02, AC-032-01, AC-032-02, AC-033-02..04, AC-034-01..03, AC-039-01, AC-039-02, AC-041-01, AC-041-03, NFR-011, NFR-014, NFR-016
- [ ] **T-405** `qa` · 1 วัน · Test `Code.gs` กับชีตจำลอง · AC-033-03, AC-034-04, AC-038-01..03, AC-041-02
- [ ] **T-406** `qa` · 2 วัน · Component test flow ผู้เล่น · AC-001-04, AC-002-01..03, AC-003-01..03, AC-004-01..04, AC-005-01, AC-005-02, AC-006-01, AC-008-01..03, AC-009-01, AC-014-01..04, AC-015-01..04, AC-016-01..03, AC-017-01, AC-018-01..03
- [ ] **T-407** `qa` · 1 วัน · Component test หน้าแอดมิน · AC-019-01..04, AC-020-01..03, AC-021-02, AC-022-02, AC-022-03, AC-023-01..04, AC-024-01
- [ ] **T-408** `qa` · 1 วัน · Test โควตารายชั่วโมง · AC-037-01..05 · **blocked: Q1**

## Phase 5 — Write Code

Backend
- [ ] **T-501** `backend-engineer` · 1 วัน · Scaffold Express + TypeScript strict, Zod middleware, error classes, response helper, security headers, `/healthz`, Dockerfile
- [ ] **T-502** `backend-engineer` · 2 วัน · Login/logout, JWT HS256 cookie 4 ชั่วโมง, middleware ล็อกบูธ, ล็อก 10 ครั้ง/15 นาที, ตรวจ env ตอน start · US-010..013, US-040 · ต้องมี T-403
- [ ] **T-503** `backend-engineer` · 2 วัน · Apps Script client (token, timeout 25 s, map 502) + แก้ `Code.gs` (ตรวจชื่อที่คาดไว้, ตรวจ stock ซ้ำ, อ่าน `Prizes`, `setupSheet` ใช้ `Prizes`) + deploy เวอร์ชันใหม่ · US-034, US-038, US-041 · ต้องมี T-405
- [ ] **T-504** `backend-engineer` · 2 วัน · Service สุ่ม + lock ต่อบูธ + endpoint หมุน · US-032..035 · ต้องมี T-402, T-404
- [ ] **T-505** `backend-engineer` · 2 วัน · Endpoint รายชื่อ, สถานะวงล้อ (อ่านและตรวจ `Prizes`, โอกาสจริง, ช่อง), รีเซ็ต, rate limit · US-001, US-021, US-030, US-031, US-039
- [ ] **T-506** `backend-engineer` · 1 วัน · โควตาสะสมรายชั่วโมง (Asia/Bangkok) · US-037 · **blocked: Q1**
- [ ] **T-507** `backend-engineer` · 1 วัน · `docker-compose.yml` ที่ root, config Railway (1 instance, `TZ`, healthcheck), `.env.example`, README · US-042

Frontend
- [ ] **T-511** `frontend-engineer` · 1 วัน · Scaffold Vite + React + TypeScript strict + Tailwind, token และฟอนต์จาก T-201, Dockerfile
- [ ] **T-512** `frontend-engineer` · 1 วัน · หน้า Login (port `login.html`) · US-010, AC-010-02, AC-010-03
- [ ] **T-513** `frontend-engineer` · 3 วัน · Component วงล้อ 3D (port ฉาก three.js) + วงล้อ 2D สำรอง + reduced motion + เสียง · US-006, US-007, US-043
- [ ] **T-514** `frontend-engineer` · 2 วัน · วาดช่องจากสถานะของ backend + หมุนรอผล + หยุดตรงรางวัล · US-002, US-003, US-036
- [ ] **T-515** `frontend-engineer` · 3 วัน · Flow Select/Ready/Spinning/Reveal, รายชื่อ, ค้นหา, รีเฟรช 20 วินาที, สถานะบันทึก, หมุนไม่สำเร็จ, วงล้อปิด · US-001, US-004, US-005, US-008, US-009, US-014..018
- [ ] **T-516** `frontend-engineer` · 2 วัน · แอดมิน: PIN, แท็บผู้เล่น, รีเซ็ต, CSV · US-019, US-020, US-021, US-024 · วิธีเก็บ PIN รอ Q4
- [ ] **T-517** `frontend-engineer` · 1 วัน · แท็บของรางวัลแบบอ่านอย่างเดียว + ตั้งค่าหน้าจอ · US-022, US-023

## Phase 6 — Testing / UAT

- [ ] **T-601** `qa` · 1 วัน · เทียบภาพ baseline, a11y (keyboard, contrast), fps · AC-043-01..03, NFR-001, NFR-006, NFR-007
- [ ] **T-602** `qa` · 1 วัน · Performance (P95) และ security scan (OWASP, 0 critical) · NFR-003, NFR-004, NFR-008..016
- [ ] **T-603** `qa` · 1 วัน · UAT จาก 1.3 + ซ้อมบนเน็ตหน้างานกับ Sheet จริงทั้งสองบูธ, sign-off โดย PO · AC-001-01, AC-042-01..03 และ AC ทั้งหมดแบบ end-to-end

## Backlog (Could Have)

- [ ] **T-901** `backend-engineer` · 1 วัน · คอลัมน์ `played_at` · US-050
- [ ] **T-902** `frontend-engineer` · 1 วัน · Kiosk mode · US-051
- [ ] **T-903** `backend-engineer` · 1 วัน · โหมดทดลองฝั่ง server · US-052
- [ ] **T-904** `frontend-engineer` · 1 วัน · ส่งออก/นำเข้าการตั้งค่าหน้าจอ · US-053
