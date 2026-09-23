# TerraVigil — Master Product Requirements Document

**Version:** 2.0 (supersedes SafeMine_PRD v1.0 and reconciles SRS v1.0)
**Status:** Authoritative. This is the single source of truth for all modules.
**Product:** TerraVigil — AI-Assisted Aerial Landmine Detection, Confirmation & Geospatial Intelligence
**Internal codename:** SafeMine (used in the repo, `frontend/package.json`, and legacy decks — same product)
**Institution:** Keshav Memorial Institute of Technology · Team G1307
**Team:** N. Venkat (24BD1A0554) · Sunand Peduru (24BD1A053D) · K. Sudheer Kumar (24BD1A052V) · N. Anirudh Reddy (24BD1A0538) · P. Anirudh Umesh (24BD1A053C)
**Mentor & Domain Head:** Dr. T Aditya Kumar, Assistant Professor, Dept. of CSE

---

## 0. Document Control & Source Reconciliation

### 0.1 Source artifacts consolidated into this PRD

| ID | Artifact | Date | Nature |
|---|---|---|---|
| S1 | `SRS (2).docx` — Software Requirements Specification v1.0 | 13-08-2026 | Formal academic spec. REQ-1.1 → REQ-5.5, SDLC phases 1–6. |
| S2 | `PPT_SDC_II_TERRAVIGIL.pptx` — SDC-II review deck, 12 slides | 12-08-2026 | Formal review submission. |
| S3 | `SafeMine_PRD.docx` — engineering PRD v1.0 | undated (most recent) | Team-locked hardware/software stacks, 5 must-have AI features, 12-week plan. |
| S4 | Operator/architect chat transcript (workflow walkthrough + corrections) | current session | Latest binding constraints. |
| S5 | `frontend/` — Phase-1 React skeleton + `docs/DESIGN_SYSTEM.md` | 24-08-2026 | Existing code. Design system retained; UI to be rebuilt. |

### 0.2 Authority order

When sources disagree, later wins:

```
S4 (chat decisions)  >  S3 (engineering PRD)  >  S1 (SRS)  >  S2 (deck)  >  S5 (code)
```

Rationale: S3 locked real part numbers and a realistic stack after S1 was written; S4 corrected S3's operational assumptions. S1 remains the formal academic deliverable, so **every deviation from S1 is logged in §0.3 and must be carried back into an SRS v1.1 amendment** — do not silently diverge from a graded document.

### 0.3 Conflict register — resolutions are binding

| ID | Topic | S1 (SRS) says | S3 (eng PRD) says | **Resolution** |
|---|---|---|---|---|
| **C-01** | Flight autonomy | Autonomous; dashboard generates flight path (REQ-1.4) | Autonomous grid, but built in Mission Planner — dashboard mission generation explicitly cut | **RC-manual piloting is the primary documented mode (S4). ArduPilot AUTO is a supported variant. Either way the dashboard has ZERO flight authority.** See §2.3. |
| **C-02** | Map area selection | Interactive map polygon selection (REQ-1.2) | Cut — "operator builds missions in Mission Planner" | **REMOVED. No polygon editor, no waypoint upload, no flight-path preview anywhere in the product.** |
| **C-03** | Coverage | Implied from planned area | Not specified | **Coverage is DERIVED from the actually-flown GPS track buffered by sensor footprint. There is no planned area to compare against.** See §12. |
| **C-04** | Metal detector | Core thesis — dual-sensor confirmation, Zero-Noise Policy (REQ-3.1–3.5) | **Absent entirely** | **RETAINED as the confirmation tier.** S3 omitted it, but S3's own Limitation #1 ("RGB physically cannot see buried objects") is *exactly* what the metal detector solves. The Arduino + ADS1115 + induction coil work in progress is in scope. |
| **C-05** | Live video | Live HD RTP/RTSP stream, ~2 Mbps link (REQ-5.3, §3.4) | Cut for bandwidth — detection images only | **CUT. This is physics, not preference** — see §7.4. Replaced by two-tier imagery (§7.5). |
| **C-06** | Backend framework | Flask | **FastAPI** | **FastAPI.** |
| **C-07** | Database | "relational or NoSQL" | **PostgreSQL + PostGIS** | **PostgreSQL 16 + PostGIS 3.4.** Non-negotiable — the safe-path planner and spatial dedup need `ST_DWithin`/GiST. |
| **C-08** | Inference rate | ">15 FPS" (SDLC Phase 4) | Not specified | **">15 FPS" is an order-of-magnitude error.** Replaced by a ground-sampling-rate requirement (§7.3). |
| **C-09** | Model | YOLOv8n (S1); "YOLO11n" (S2 slide 8) | YOLOv8 + TensorRT | **YOLOv8n.** S2's "YOLO11n" is a typo — the ONNX opset-12 → TensorRT pipeline in S1 is specified for v8n. Fix slide 8. |
| **C-10** | User roles | Operator vs Administrator (§5.3) | Admin only for v1 | **Three roles defined in the schema (Admin/Operator/Analyst); only Admin+Operator enforced in v1.** Analyst is schema-ready, UI-deferred. |
| **C-11** | Product name | TerraVigil | SafeMine | **TerraVigil** is the product name (it is on the graded SRS and SDC-II deck). SafeMine is the internal codename. Rename `frontend/package.json` or leave — cosmetic. |
| **C-12** | Buried mines | Implied detectable from RGB | Explicitly impossible with RGB | **S3 is correct and this is the honest position.** RGB detects *surface-laid and partially-exposed* ordnance plus surface disturbance indicators. Sub-surface evidence comes only from the metal detector. Stated in every report. |

### 0.4 How to use this document with an AI coding assistant

This PRD is written to be pasted (or referenced by path) into a coding session. Each module in §4.2 has a stable ID (`M1`–`M14`). Each requirement has a stable ID (`P-<section>.<n>`). When commissioning work:

> "Implement **M9 (Safe-Path Planner)** per `docs/PRD.md` §14. Satisfy P-14.1 → P-14.8. Do not touch other modules."

**Hard rules for any implementer, human or model:**

1. Never invent a requirement. If this PRD is silent, ask — do not guess.
2. Never implement anything on the §2.2 out-of-scope list, even if it seems helpful.
3. Never use the words *clear*, *cleared*, *safe*, or *all clear* about ground in code, UI, or reports (§23.2).
4. Never let an LLM compute or alter a risk score (§11.7).

---

## 1. Product Definition

### 1.1 Problem

Manual landmine clearance puts deminers in direct lethal risk, is slow, and is economically inverted: a mine costs **$3–$30** to manufacture and **$300–$1,000** to clear. Casualties are rising — **5,757 in 2023 → 6,279 in 2024**, of which **90% were civilians and nearly 50% were children** (S1 §Problem Statement, S2 slide 2).

Existing alternatives fail on cost or coverage. Ground-penetrating radar survey rigs are expensive and slow. Existing UAV research (Heuschmid et al., IEEE Access 2025, DOI [10.1109/ACCESS.2025.3572196](https://doi.org/10.1109/ACCESS.2025.3572196)) proved lightweight CNNs on UAVs match heavyweight architectures for *thermographic* detection — 97% precision, 96.1% accuracy, 94.2% recall, Cohen's κ 92.16% — but stops at single-modality detection with no localization pipeline, no confirmation tier, and no decision-support output.

### 1.2 Product thesis

> **TerraVigil turns a $600 drone into a stand-off minefield survey instrument by refusing to trust any single sensor.** A camera proposes; a metal detector disposes; GPS localizes; and a reasoning layer converts confirmed geometry into a risk surface, a minimum-risk route, and a citable report — with zero personnel inside the hazard zone.

The differentiator is not the detector. It is the **evidence discipline**: a three-state classification that separates *what we saw* from *what we confirmed*, and never lets the former be presented as the latter.

### 1.3 What we deliver (S2 slide 11, refined)

1. RC-piloted aerial RGB survey with on-board YOLOv8n inference on a Jetson Nano.
2. Dual-sensor confirmation (visual + metallic) before any detection is published as a mine.
3. GPS-geotagged detections with an **honest, stated uncertainty radius** — never a bare point.
4. A three-band risk assessment over confirmed detections, driving a risk heatmap.
5. Grad-CAM explainability on every detection card.
6. A minimum-risk route planner (A* over a PostGIS risk graph).
7. An IMAS-grounded RAG safety copilot with source citation, text and voice.
8. One-click auto-generated PDF mission reports.
9. Zero ground personnel inside hazardous zones during operation.

### 1.4 Success criteria (demo-gated, from S3 §1.3, amended)

The project succeeds if, in a live demonstration, it can:

| # | Criterion | Amendment vs S3 |
|---|---|---|
| 1 | Take off and fly a survey pattern over a test area | S3 said "autonomously"; RC-manual is acceptable (C-01) |
| 2 | Capture frames continuously at the required ground sampling rate | Was "continuously" — now quantified (§7.3) |
| 3 | Run YOLOv8n on-board the Jetson via TensorRT | unchanged |
| 4 | Detect a visible inert target | unchanged |
| 5 | Register a metal-detector signature over that target on a confirmation pass | **NEW** (C-04) |
| 6 | Emit a CONFIRMED classification only when both agree, and an UNCONFIRMED classification when only one does | **NEW** — this is the thesis |
| 7 | Geotag the confirmation with a stated uncertainty radius | S3 said "associate with GPS"; now with error budget |
| 8 | Transmit to the backend over the SiK link | unchanged |
| 9 | Render it live on the dashboard map with correct layer separation | unchanged |
| 10 | Show a Grad-CAM overlay for that detection | unchanged |
| 11 | Return a minimum-risk route across the surveyed area | unchanged |
| 12 | Answer one IMAS question with a citation | unchanged |
| 13 | Generate the PDF mission report | unchanged |

### 1.5 Product metrics

| Metric | Target | Source |
|---|---|---|
| Detection recall (visual, test set) | **≥ 94.2%** — beat the base paper | S1 §5.1 |
| Detection precision (visual, test set) | ≥ 85% (recall-favoured; see §21.4) | derived |
| Confirmation precision (dual-sensor, field) | ≥ 95% | S1 §1.4 |
| Localization error, 95% | **≤ 3.5 m CEP95** | §7.6 |
| Visual coverage rate | ≥ 0.35 ha per battery @ 4 m AGL | §7.7 |
| Detection event latency (confirm → dashboard) | ≤ 3 s | S1 §5.1 |
| Report generation | ≤ 60 s, one click | S3 §5.1 |
| Ground personnel in hazard zone | **0** | S1 §5.2 |

---

## 2. Scope

### 2.1 In scope (MVP)

| # | Capability | Module |
|---|---|---|
| 1 | RC-piloted survey flight; on-board continuous YOLOv8n inference | M1, M4 |
| 2 | Arduino + ADS1115 + induction-coil metal detector with calibrated baseline | M2 |
| 3 | MAVLink GPS/attitude ingestion and frame↔fix time synchronization | M3 |
| 4 | Three-state fusion & confirmation under a Zero-Noise Policy | M5 |
| 5 | Three-band risk assessment over confirmed detections | M6 |
| 6 | Swept-area coverage derived from the flown track | M7 |
| 7 | Grad-CAM explainability per detection | M8 |
| 8 | A* minimum-risk route planning over a PostGIS risk graph | M9 |
| 9 | IMAS-grounded RAG safety copilot (Chroma) | M10 |
| 10 | Auto-generated PDF mission report (WeasyPrint) | M11 |
| 11 | Voice field assistant (Web Speech API, thin client) | M12 |
| 12 | Agent orchestration (CrewAI) | M13 |
| 13 | Operator web dashboard — live monitoring, register, risk map, reports | M14 |
| 14 | Telemetry bridge over SiK; two-tier imagery; post-flight reconciliation | M15 |

### 2.2 Out of scope — do not build

Preserved from S3 §2.2, extended with S4 decisions. **Revisit only post-MVP, never mid-build.**

| Cut | Reason |
|---|---|
| **Mission planner / survey-area polygon editor** | We do not plan areas in advance. The drone flies; coverage is measured after the fact. (C-02, S4) |
| **Auto-generated missions or waypoint upload from the dashboard** | Flight authority stays in Mission Planner / RC. (C-01) |
| **Any vehicle command authority** — arm, disarm, takeoff, land, RTL, mode change | Safety. The web app is read-only w.r.t. the aircraft. |
| **Live video streaming** | SiK link cannot carry it (§7.4). Detection thumbnails only. (C-05) |
| **Mobile application** | Web dashboard only. Swipe-to-Verify app explicitly cancelled (S3 §5.3). |
| **Real-time manual camera control** | Camera is fixed nadir. |
| Buried-mine detection from RGB | Physically impossible (C-12). Sub-surface evidence is the metal detector's job only. |
| Object tracking across frames | Each frame independent; correlation happens spatially in M5, not temporally in the tracker. |
| Multi-drone coordination | One airframe. |
| Cloud inference | All inference on the Jetson. |
| Obstacle avoidance | Controlled test environments only. |
| Weather prediction | — |
| SMS/email/push notification systems | In-dashboard alerts only. |
| AI retraining from the web UI | Offline, developer-run. |
| Gazebo/AirSim as a shipped feature | SITL remains an internal dev practice, not a deliverable. |
| Thermal / LWIR sensing | Budget. Documented upgrade path (§26). |
| Non-metallic mine detection | Out of reach for this sensor set. Documented limitation. |
| Any neutralization / disposal interaction | Absolute. TerraVigil observes; it never acts on ordnance. |

### 2.3 The flight-authority fence (C-01 resolution, normative)

This resolves the apparent SRS↔PRD↔operator conflict. All three sources agree on the load-bearing point:

```
┌─────────────────────────────────────────────────────────────┐
│  FLIGHT AUTHORITY  —  outside the product boundary          │
│                                                             │
│   RC transmitter  ──┐                                       │
│                     ├──►  Pixhawk 4 / ArduPilot  ──► Motors │
│   Mission Planner ──┘         (AUTO variant)                │
└─────────────────────────────────────────────────────────────┘
                              │ MAVLink (read-only)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TERRAVIGIL  —  observes, confirms, reasons, reports        │
│  Never commands the aircraft. Not in v1, not ever in v1.    │
└─────────────────────────────────────────────────────────────┘
```

- **P-2.1** The Jetson SHALL open the MAVLink connection in a read-only posture. No `COMMAND_LONG`, no `MISSION_ITEM` upload, no mode-set message shall exist anywhere in the codebase.
- **P-2.2** The backend SHALL expose no endpoint that writes to the aircraft. Any such route is a defect.
- **P-2.3** The frontend SHALL contain no control affordance implying vehicle authority (no arm/launch/RTL/land buttons, no draggable waypoints).
- **P-2.4** Flight mode (RC-manual vs ArduPilot AUTO) is an operational choice recorded as session metadata (`flightMode`), not a software feature. Both modes produce an identical downstream data path.

---

## 3. Users & Roles

### 3.1 User classes (S1 §2.3, S2 slide 7)

| Class | Job to be done | Primary surface |
|---|---|---|
| **Humanitarian NGOs** *(most important)* | Field survey and clearance planning to reopen land. Need high recall and citable reports. Map-literate, not technical. | Risk map, PDF report, copilot |
| **Military & defence units** | Route clearance and stand-off reconnaissance. Need speed and the safe-path planner. | Live console, safe-path planner |
| **Government & disaster authorities** | Land-safety assessment for resettlement. Need historical traceability and aggregate risk. | Analytics, archive, reports |
| **Researchers & survey teams** | High-fidelity geotagged hazard maps as a GPR alternative. Most technical class. | Detection register, raw export, Grad-CAM |
| **Operators / administrators** | Run sessions, manage access, tune thresholds, maintain the rig. | System page, settings |

### 3.2 Roles (C-10)

| Role | Read sessions/detections | Run session, review detections | Tune thresholds | Manage users | Export/report |
|---|---|---|---|---|---|
| `admin` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `operator` | ✔ | ✔ | ✔ | — | ✔ |
| `analyst` *(schema-ready, UI-deferred)* | ✔ | — | — | — | ✔ |

- **P-3.1** All three roles SHALL exist in the schema from day one. Only `admin` and `operator` are enforced in v1 UI.
- **P-3.2** Confirmed-mine coordinates are security-sensitive (S1 §5.3). Every read of a detection's precise coordinates SHALL be written to an append-only audit log with actor, timestamp, and session.

### 3.3 Primary user flow (S3 §3, amended for C-01/C-02)

```
 1. Operator logs into the dashboard.
 2. Operator creates a Scan Session (site name, notes, thresholds). No area drawing.
 3. Pilot flies the SURVEY PASS by RC at ~4 m AGL. Jetson runs YOLO continuously.
      → Visual candidates stream to the dashboard as UNCONFIRMED_VISUAL.
      → Flown track accumulates. Visual coverage grows.
 4. Operator reviews candidates on the map and hands the pilot a confirmation list.
 5. Pilot flies the CONFIRMATION PASS: descend to ~0.4 m over each candidate, hover, sample.
      → Metal hits stream up. M5 pairs them spatially with visual candidates.
      → Paired  → CONFIRMED, risk-scored, appears on the risk heatmap.
      → Unpaired candidate → stays UNCONFIRMED_VISUAL. Never on the risk heatmap.
      → Metal hit with no visual candidate → UNRESOLVED_METAL. Separate layer.
 6. Operator ends the session. Full-resolution imagery reconciles over USB/Wi-Fi.
 7. Operator inspects Grad-CAM overlays, asks the copilot, runs the safe-path planner.
 8. Operator clicks Generate Report → PDF.
```

---

## 4. System Architecture

### 4.1 Four layers (S3 §4)

> **The drone is the sensor. The software is the product.**

| Layer | Contents | Hosted on |
|---|---|---|
| **Capture** | ZD550 airframe, Pixhawk 4 / ArduPilot, Holybro M10 GPS, camera, induction coil + Arduino + ADS1115 | Aircraft |
| **Perception** | GStreamer pipeline, YOLOv8n TensorRT engine, metal-signal conditioning, MAVLink time-sync, fusion, risk, Grad-CAM trigger | Jetson Nano P3450 |
| **Intelligence** | FastAPI, PostgreSQL/PostGIS, Chroma, CrewAI agents, LLM, A* planner, WeasyPrint | Ground laptop (Ryzen 7 / RTX 4050) |
| **Delivery** | React dashboard — live map, register, risk map, copilot, reports. **Only client. No mobile app.** | Operator browser |

### 4.2 Module register

| ID | Module | Layer | Inputs | Outputs | Spec |
|---|---|---|---|---|---|
| **M1** | Camera & capture pipeline | Perception | CSI/USB frames | Timestamped, downscaled, tiled frames | §9.1 |
| **M2** | Metal-detector subsystem | Capture | Coil analog signal | `MetalHit` events, calibrated | §9.4 |
| **M3** | Telemetry & time-sync | Perception | MAVLink stream | `TrackPoint`, frame↔fix pairing | §9.5 |
| **M4** | Visual detection (YOLOv8n) | Perception | Tiled frames | `VisualCandidate` + bbox + confidence | §9.2 |
| **M5** | Fusion & confirmation | Perception | Candidates, hits, fixes | Classified `Detection` clusters | §10 |
| **M6** | Risk assessment | Perception/Intel | Confirmed clusters | `riskScore`, `riskBand` | §11 |
| **M7** | Coverage computation | Intelligence | Flown track, altitude, sensor geometry | Swept-area polygons + grid | §12 |
| **M8** | Explainability (Grad-CAM) | Intelligence | Detection crop + model | Heatmap overlay PNG | §13 |
| **M9** | Safe-path planner | Intelligence | Risk surface, start/end | Minimum-risk polyline | §14 |
| **M10** | RAG safety copilot | Intelligence | IMAS corpus, query | Cited answer | §15 |
| **M11** | Report generator | Intelligence | Session + detections | PDF | §16 |
| **M12** | Voice assistant | Delivery | Speech | Spoken cited answer | §17 |
| **M13** | Agent orchestration | Intelligence | Task requests | Agent results | §18 |
| **M14** | Web dashboard | Delivery | REST + Socket.io | Operator UI | §20 |
| **M15** | Telemetry bridge & sync | Perception/Intel | Events, thumbnails | Delivered packets; post-flight reconciliation | §9.6 |

### 4.3 End-to-end data flow

```
                            AIRCRAFT
 ┌───────────────────────────────────────────────────────────────┐
 │  Camera ──► M1 capture ──► M4 YOLOv8n/TensorRT                │
 │                                   │ VisualCandidate           │
 │  Coil ──► ADS1115 ──► Arduino ──► M2 ──┐ MetalHit             │
 │                                        ▼                      │
 │  Pixhawk 4 ──MAVLink(ro)──► M3 ──►  M5 FUSION                 │
 │                    TrackPoint          │                      │
 │                                        ├─ CONFIRMED ──► M6 risk│
 │                                        ├─ UNCONFIRMED_VISUAL  │
 │                                        └─ UNRESOLVED_METAL    │
 │                                        │                      │
 │                                   M15 bridge ── SQLite cache  │
 └────────────────────────────────────────┼──────────────────────┘
                                          │ SiK 915 MHz · ~25–35 kbps usable
                                          │ events + 160px thumbnails only
                                          ▼
                            GROUND LAPTOP
 ┌───────────────────────────────────────────────────────────────┐
 │  M15 receiver ──► FastAPI ──► PostgreSQL + PostGIS            │
 │                     │                    │                    │
 │                     │            M7 coverage  M9 A* planner   │
 │                     │            M8 Grad-CAM  M11 WeasyPrint  │
 │                     │            M10 Chroma RAG  M13 CrewAI   │
 │                     ▼                                         │
 │              Socket.io push                                   │
 └─────────────────────┼─────────────────────────────────────────┘
                       ▼
             M14  React + Leaflet dashboard
```

### 4.4 Communication flow (S3 §8, corrected)

| # | Hop | Transport | Note |
|---|---|---|---|
| 1 | Operator → RC transmitter / Mission Planner → Pixhawk 4 → ESC → motors | RC PWM / MAVLink | Outside product boundary (§2.3) |
| 2 | Camera → GStreamer → OpenCV → YOLOv8n (TensorRT) | in-process, Jetson | Tiled, see §7.3 |
| 3 | Pixhawk → Jetson: `GLOBAL_POSITION_INT`, `ATTITUDE`, `SYSTEM_TIME`, `GPS_RAW_INT` | MAVLink over serial, **read-only** | pymavlink |
| 4 | Jetson → ground: detection events + 160 px thumbnails | **UDP micro-packets over SiK**, ≤ 1200 B, CRC, seq | §9.6 |
| 5 | Jetson → ground: full-resolution imagery | **Post-flight** over USB/Wi-Fi (rsync) | §7.5 |
| 6 | Bridge → FastAPI → PostgreSQL/PostGIS | in-process | |
| 7 | FastAPI → dashboard | **Socket.io** push, no polling | |
| 8 | Operator picks start/end → FastAPI `/safe-path` → A* over PostGIS risk graph | HTTP | §14 |
| 9 | Operator query (text or voice) → `/assistant` → Chroma retrieval → LLM → cited answer | HTTP | §15, §17 |
| 10 | "Generate Report" → CrewAI report agent → PostgreSQL + Chroma → LLM narrative → WeasyPrint → PDF | HTTP | §16 |

---

## 5. Hardware Stack (Locked — S3 §6)

| Component | Part | Notes added by this PRD |
|---|---|---|
| Frame | ZD550 550 mm carbon-fibre folding quadcopter | ~2.5 kg AUW with payload |
| Flight controller | **Pixhawk 4**, ArduPilot | |
| Motors | Brushless | |
| ESC | BLHeli-S 40A (BLS-MAX) | |
| GPS + compass | **Holybro M10** | **No RTK.** CEP50 ≈ 1.5 m, CEP95 ≈ 3.0 m — dominates the error budget (§7.6) |
| Telemetry radio | **Holybro SiK** (433/915 MHz) | **~64 kbps air rate, ~25–35 kbps usable.** Governs C-05 |
| Battery | 4S LiPo | 12–18 min realistic endurance with payload |
| Companion computer | **NVIDIA Jetson Nano Dev Kit (P3450, 4 GB)** | EOL at JetPack 4.6 / CUDA 10.2. **No Tensor Cores.** See §26 R-03 |
| Camera | USB / CSI RGB — **reference sensor: Raspberry Pi Camera Module 3 (IMX708)** | 4608×2592, f = 4.74 mm, HFOV 68.5°, VFOV 41.9° |
| Metal detector | Induction coil → **ADS1115** 16-bit I²C ADC → **Arduino** buffer → Jetson | **C-04.** Arduino isolates the Jetson's 3.3 V GPIO |
| Payload power | Dedicated 5 V / 4 A BEC | Separate rail from flight electronics |
| Ground station | Ryzen 7 / RTX 4050 laptop; Mission Planner | Also hosts backend, DB, LLM/VLM |

- **P-5.1** The metal detector SHALL be routed through the Arduino buffer. Direct coil-to-Jetson GPIO is forbidden — it will destroy the 3.3 V pins (S1 SDLC Phase 2).
- **P-5.2** The payload SHALL draw from the dedicated 5 V/4 A BEC, never from the flight-controller rail.
- **P-5.3** The coil SHALL be mounted to minimise interference from the motors/ESC. Baseline drift caused by motor RPM SHALL be characterised on the bench and compensated in M2 (§9.4).

---

## 6. Software Stack (Locked — S3 §7, amended)

| Component | Tool | Amendment |
|---|---|---|
| Drone firmware | ArduPilot | |
| Flight ↔ companion | **pymavlink** (low-level) or MAVSDK (async). **Avoid DroneKit** — unmaintained | Read-only posture (P-2.1) |
| Computer vision | OpenCV + **GStreamer** (IMX708 downscale) | GStreamer added — required to avoid OOM on 4 GB (S1 Phase 4) |
| Detection model | **YOLOv8n** (Ultralytics) → ONNX opset 12 → **TensorRT FP16** engine, compiled natively on the Nano | C-09 |
| Explainability | **Grad-CAM** (`pytorch-grad-cam` over the Ultralytics model) — runs **ground-side** | Moved to ground: the Nano cannot afford it in-flight |
| Backend | **FastAPI** (Python) | C-06 |
| Database | **PostgreSQL 16 + PostGIS 3.4** — `ST_DWithin`/`ST_Distance`, GiST indexing | C-07 |
| Vector DB | **Chroma** | |
| Agent orchestration | **CrewAI** first (fastest to prototype). LangGraph only if building the reasoning-feed stretch goal | S3 §5.2 |
| LLM | Claude or GPT API | Temperature 0 for all report/risk-adjacent calls (§11.7) |
| Ground-side VLM | INT4-quantised VLM for candidate validation | S1 Phase 3. **Advisory only — never alters risk** (§11.7) |
| Frontend | **React 19 + Vite + TypeScript + Tailwind + Leaflet + Socket.io + Zustand + TanStack Query** | Existing `frontend/` stack retained (S5) |
| Reports | **WeasyPrint** (HTML/CSS → PDF) | Richer styling than ReportLab's canvas API |
| Deployment | **Docker Compose**, Git/GitHub | Jetson runs `systemd` autostart (`Type=idle`, S1 Phase 5) |

---

## 7. Physics & Sensing Budget

**This section is the most load-bearing in the document.** It contains the corrections that make the rest of the design feasible. Every number is derived, not asserted; all are marked for bench validation.

### 7.1 Camera geometry

For the reference IMX708 (active area 6.45 × 3.63 mm, f = 4.74 mm):

```
HFOV = 2·atan(3.225 / 4.74) = 68.5°
VFOV = 2·atan(1.815 / 4.74) = 41.9°
DFOV = 76.0°                          (matches the 75° datasheet figure ✓)

Ground swath   W(h) = 2h·tan(34.23°) = 1.361 · h      [across track]
Ground depth   H(h) = 2h·tan(20.95°) = 0.766 · h      [along track]
GSD            = W(h) / W_px                          [m per pixel]
```

For any other camera, substitute `HFOV`/`VFOV` and keep the formulae.

### 7.2 Altitude ceiling is set by target pixel size

A 100 mm anti-personnel mine (PMN ≈ 112 mm, PMA-3 ≈ 103 mm, Type 72 ≈ 78 mm) must span **≥ 24 px** for YOLOv8n to hold recall. At inference width 1280 px:

| AGL (m) | Swath W (m) | Depth H (m) | GSD (mm/px) | 100 mm target (px) | Verdict |
|---|---|---|---|---|---|
| 2 | 2.72 | 1.53 | 2.13 | 47 | strong |
| 3 | 4.08 | 2.30 | 3.19 | 31 | good |
| **4** | **5.44** | **3.06** | **4.25** | **24** | **ceiling for AP mines** |
| 5 | 6.80 | 3.83 | 5.31 | 19 | marginal |
| 6 | 8.17 | 4.60 | 6.38 | 16 | poor |
| 10 | 13.61 | 7.66 | 10.63 | 9 | fail |

At inference width 1920 px the ceiling rises to ~6 m (24 px). Anti-tank mines (~300 mm) tolerate ~12 m.

- **P-7.1** The survey-pass altitude SHALL default to **4.0 m AGL** and SHALL NOT exceed 6.0 m for anti-personnel targets.
- **P-7.2** Session metadata SHALL record `inferenceWidthPx` and `nominalAglM`; the report SHALL state the resulting GSD and minimum resolvable target size. **No report may imply detection capability below its own GSD limit.**

### 7.3 The ">15 FPS" target is wrong — replace it (C-08)

S1 SDLC Phase 4 targets ">15 FPS." That is video-smoothness thinking. The real constraint is **spatial**: consecutive frames must overlap along track.

```
FPS_required = groundSpeed / ( H(h) · (1 − forwardOverlap) )
```

At h = 4 m (H = 3.06 m), 30% forward overlap, v = 3 m/s:

```
FPS_required = 3 / (3.06 × 0.7) = 3 / 2.14 = 1.40 FPS
```

**~1.4 FPS, not 15.** This is a 10× relaxation, and it unlocks the design:

| Strategy | Input | Nano FPS (TensorRT FP16) | GSD @ 4 m | Target px | Feasible? |
|---|---|---|---|---|---|
| Native 640×640 | 640 | 15–25 | 8.5 mm | 12 | ✗ target too small |
| Native 1280 | 1280 | 4–7 | 4.25 mm | 24 | ✓ |
| **Tiled: 1920 wide → 6× 640 tiles, 15% overlap** | 1920 | **2.8–4.2 effective** | **2.84 mm** | **35** | **✓ recommended** |
| Native 1920 | 1920 | 2–3 | 2.84 mm | 35 | ✓ but no headroom |

- **P-7.3** M4 SHALL use **tiled inference**: capture at ≥ 1920 px wide, slice into 640×640 tiles with ≥ 15% overlap, infer per tile, and merge detections in full-frame coordinates with NMS across tile seams.
- **P-7.4** The acceptance criterion SHALL be **`achievedFps ≥ FPS_required × 1.5`** for the configured altitude and ground speed — not a fixed FPS number.
- **P-7.5** If `achievedFps < FPS_required`, the system SHALL raise an `UNDERSAMPLED` alert to the dashboard and mark the affected track segment as **not visually covered** in M7. Silent gaps are forbidden.
- **P-7.6** Ground speed SHALL be capped at **3.0 m/s** during survey passes. The dashboard SHALL warn when observed groundspeed exceeds the rate M4 can sustain.

### 7.4 The SiK link cannot carry video (C-05, normative)

Holybro SiK: 433/915 MHz, ~100 mW, configurable air rate 2–250 kbps, **default 64 kbps**. After protocol overhead, **~25–35 kbps usable**, of which MAVLink telemetry already consumes a large share.

| Payload | Size | Time @ 25 kbps | Verdict |
|---|---|---|---|
| Detection event (compact JSON, ~90 B) | 720 bit | **0.03 s** | ✓ trivial |
| 160×160 JPEG q60 thumbnail | 4–8 KB | **1.3–2.6 s** | ✓ acceptable |
| 640×480 JPEG q75 crop | 25–45 KB | 8–14 s | ✗ impractical |
| 720p H.264 video @ 2 Mbps | — | — | **✗ 60–80× over budget** |

S1 §3.4's "minimum ~2 Mbps recommended" is incompatible with the locked radio. S3 cut live video for exactly this reason.

- **P-7.7** Live video streaming SHALL NOT be implemented. Any UI element implying a live feed is a defect.
- **P-7.8** Only detection **events** and **160 px thumbnails** traverse the SiK link in flight.
- **P-7.9** If live video is ever required, it needs a **second, independent link** (5.8 GHz Wi-Fi / analogue FPV). That is a hardware change, out of scope, and must be recorded as such.

### 7.5 Two-tier imagery (replaces live video)

| Tier | Content | Path | When |
|---|---|---|---|
| **Tier 1 — thumbnail** | 160×160 JPEG q60 crop of the detection bbox, hex-encoded, chunked over UDP | SiK, in flight | ≤ 3 s after confirmation |
| **Tier 2 — full frame** | Full-resolution frame + crop, written to Jetson SD card | USB / Wi-Fi `rsync` after landing | Post-flight reconciliation |

- **P-7.10** Every detection record SHALL carry `thumbnailStatus ∈ {pending, received, lost}` and `fullFrameStatus ∈ {onboard, reconciled, missing}`. The UI SHALL show both. A missing image is displayed as missing — never silently blank.
- **P-7.11** Grad-CAM (M8) SHALL run on **Tier 2** imagery, ground-side, after reconciliation. Tier 1 thumbnails are too small.

### 7.6 Georeferencing error budget (S3 Limitation #2 — the honest number)

Independent contributors at h = 4 m AGL, v = 3 m/s:

| Source | Magnitude | Contribution (m) |
|---|---|---|
| GPS horizontal (Holybro M10, no RTK), CEP50 | — | **1.50** |
| Attitude error ±2° → `h·tan(2°)` | — | 0.14 |
| Camera boresight misalignment ±1° | — | 0.07 |
| Frame↔GPS-fix sync error 100 ms @ 3 m/s | — | 0.30 |
| Flat-ground assumption on a 10° slope, image edge `(W/2)·tan(10°)` | — | 0.48 |
| BBox centroid error ±3 px @ 2.84 mm/px | — | 0.01 |
| **RSS total** | | **≈ 1.61 m CEP50** |
| **CEP95 (≈ 2 × CEP50)** | | **≈ 3.2 m** |

- **P-7.12** Every detection SHALL carry `localizationUncertaintyM` (CEP95), computed per-detection from the live GPS fix type, HDOP, altitude, and attitude — not a hard-coded constant.
- **P-7.13** The map SHALL render every detection as a **marker plus an uncertainty circle** of radius `localizationUncertaintyM`. **A bare point is forbidden** — it implies precision the system does not have.
- **P-7.14** The PDF report SHALL state the error budget table for the session's actual conditions (§16.3).
- **P-7.15** `localizationUncertaintyM` is **not** an input to `riskScore` (§11.2). Poor localization means "we are less sure *where*", never "it is less dangerous."

### 7.7 The metal detector cannot work at survey altitude — hence two passes (C-04, critical)

An induction-balance coil detects a coin-sized metal object at roughly **0.6–1.0 × coil diameter**, up to ~1.5 × for large metal casings. For a 150–250 mm coil against a metal-cased AP mine:

```
Effective standoff   ≈ 0.15 – 0.40 m
Effective swath      ≈ 0.8 × coil diameter ≈ 0.12 – 0.20 m
```

Compare against the survey pass at 4 m AGL:

| | Camera (survey pass) | Metal coil |
|---|---|---|
| Required altitude | 4.0 m | **≤ 0.40 m** |
| Effective swath | 5.44 m | **~0.16 m** |
| Ratio | — | **~10× lower, ~34× narrower** |

**Single-pass dual-sensor confirmation is physically impossible.** This is not a tuning problem.

The resolution — and the reason the operator's "manual, RC-piloted" decision (S4) is the *correct* architecture rather than a compromise:

```
PASS 1 — SURVEY          PASS 2 — CONFIRMATION
h ≈ 4.0 m                h ≈ 0.4 m, hover
Camera only              Metal coil (+ camera)
Wide swath, fast         Point sampling, slow
Output: candidates       Output: confirm / leave unconfirmed
```

- **P-7.16** The system SHALL implement the two-pass workflow. M5's confirmation gate SHALL be **spatial-first** with a generous time window (§10.3), not same-frame temporal coincidence.
- **P-7.17** Confirmation-pass altitude SHALL be recorded per metal hit. A metal hit sampled above `metalMaxStandoffM` (default 0.5 m) SHALL be flagged `standoffExceeded` and SHALL NOT satisfy the confirmation gate.
- **P-7.18** The coil's true standoff and swath SHALL be measured on the bench against an inert metal target before any field test, and the measured values written into `config/sensing.yaml`. **The 0.15–0.40 m figure above is an estimate and must be replaced by measurement.**

### 7.8 Endurance and coverage budget

Survey pass at h = 4 m, W = 5.44 m, 30% side overlap → line spacing 3.81 m:

| Quantity | Value |
|---|---|
| Lines to cover 100 × 100 m (1 ha) | 100 / 3.81 = **27 lines** |
| Track length incl. turns | ≈ 2,900 m |
| Flight time @ 3 m/s | ≈ **16.1 min** |
| ZD550 realistic endurance (2.5 kg AUW, 4S) | 12–18 min |
| **Verdict** | **1 ha ≈ one full battery with no reserve** |

- **P-7.19** Survey planning SHALL budget **≤ 0.35 ha per battery** (30% reserve). The dashboard SHALL show elapsed session time against this budget.
- **P-7.20** Confirmation passes SHALL be budgeted at **60–90 s per candidate** (descend, hover, sample, ascend, translate) → roughly **8–10 candidates per battery**.
- **P-7.21** A site survey SHALL be expected to consume **≥ 2 batteries per hectare**. This must appear in the deployment guide, not be discovered in the field.

---

## 8. Canonical Domain Model

Single source of truth. TypeScript shapes below are the wire contract; PostgreSQL DDL mirrors them.

### 8.1 Conventions

| Concern | Rule |
|---|---|
| Time | UTC, ISO-8601 with milliseconds (`2026-08-30T14:32:21.480Z`). Every sensor record also carries `tMonoNs` (Jetson monotonic clock) for correlation. |
| Clock source | MAVLink `SYSTEM_TIME` is authoritative; the Jetson maintains a monotonic→GPS-time offset, resampled ≥ 1 Hz. Offset drift > 50 ms raises `TIME_SYNC_DEGRADED`. |
| CRS | WGS84 (EPSG:4326) for storage and API. Local computation (buffering, A*, grids) in the site's UTM zone (EPSG:326xx/327xx), recorded per session. |
| Altitude | **AGL in metres**, explicitly. AMSL stored separately as `altAmslM`. Never mix. |
| Units | SI. Metres, m/s, seconds, degrees. Confidence and normalized signals in `[0,1]`. |
| IDs | `ULID` — sortable, collision-safe, no central counter. |
| Enums | Lowercase snake_case string literals. Never numeric. |
| Mutability | Detections and review records are **append-only**. A change of mind is a new record, never an edit. |

### 8.2 Core entities

```ts
type Ulid = string;
type IsoUtc = string;

interface Coordinate {
  lat: number;              // WGS84 degrees
  lon: number;
  altAglM?: number;
  altAmslM?: number;
}

// ── Session ─────────────────────────────────────────────
type FlightMode = 'rc_manual' | 'ardupilot_auto';
type SessionState = 'created' | 'active' | 'ended' | 'aborted';
type PassKind = 'survey' | 'confirmation';

interface ScanSession {
  id: Ulid;
  siteName: string;                  // free text — NOT a drawn polygon
  state: SessionState;
  flightMode: FlightMode;
  startedAt: IsoUtc;
  endedAt: IsoUtc | null;
  operatorId: Ulid;
  utmEpsg: number;                   // e.g. 32644
  config: SessionConfig;             // frozen at start; changes create a new session
  notes: string;
}

interface SessionConfig {
  visualConfidenceThreshold: number; // T_vis, default 0.50
  metalThresholdNorm: number;        // T_metal, default 0.35
  nominalAglM: number;               // default 4.0
  inferenceWidthPx: number;          // default 1920 (tiled)
  forwardOverlap: number;            // default 0.30
  sideOverlap: number;               // default 0.30
  associationRadiusM: number;        // r_assoc, default 3.5
  metalMaxStandoffM: number;         // default 0.50
  visualSwathModel: 'fov';           // W = 1.361 * h
  metalSwathM: number;               // measured, default 0.16
}

// ── Track ───────────────────────────────────────────────
type GpsFixType = 'no_fix' | 'fix_2d' | 'fix_3d' | 'dgps' | 'rtk_float' | 'rtk_fixed';

interface TrackPoint {
  sessionId: Ulid;
  tUtc: IsoUtc;
  tMonoNs: number;
  position: Coordinate;
  groundSpeedMs: number;
  headingDeg: number;
  rollDeg: number;
  pitchDeg: number;
  fixType: GpsFixType;
  hdop: number;
  satellites: number;
  batteryPercent: number;
  pass: PassKind;                    // derived from altitude band
}

// ── Raw sensor observations (append-only) ───────────────
interface VisualCandidate {
  id: Ulid;
  sessionId: Ulid;
  tUtc: IsoUtc;
  tMonoNs: number;
  position: Coordinate;              // projected bbox centroid on ground
  localizationUncertaintyM: number;  // CEP95, §7.6
  confidence: number;                // YOLO, [0,1]
  classId: string;                   // from the model's class catalog — NEVER hardcoded
  bbox: { x: number; y: number; w: number; h: number };  // full-frame px
  frameRef: string;                  // SD-card path on the Jetson
  thumbnailStatus: 'pending' | 'received' | 'lost';
  fullFrameStatus: 'onboard' | 'reconciled' | 'missing';
  tileIndex: number;
}

interface MetalHit {
  id: Ulid;
  sessionId: Ulid;
  tUtc: IsoUtc;
  tMonoNs: number;
  position: Coordinate;
  localizationUncertaintyM: number;
  rawAdc: number;                    // ADS1115 counts
  baselineAdc: number;               // rolling baseline at sample time
  signalNorm: number;                // normalized [0,1], §9.4
  standoffM: number;                 // altAglM at sample
  standoffExceeded: boolean;         // P-7.17
  coilTempC?: number;
}

// ── Fused detection (the published unit) ────────────────
type Classification =
  | 'confirmed'             // visual ∧ metal  → risk-scored, on risk heatmap
  | 'unconfirmed_visual'    // visual only     → separate layer, NOT a mine
  | 'unresolved_metal';     // metal only      → separate layer, NOT a mine

type RiskBand = 'high' | 'medium' | 'low';
type ReviewState = 'unreviewed' | 'operator_endorsed' | 'operator_disputed';
type VlmVerdict = 'agree' | 'uncertain' | 'reject' | 'not_run';

interface Detection {
  id: Ulid;
  sessionId: Ulid;
  classification: Classification;
  position: Coordinate;              // cluster centroid
  localizationUncertaintyM: number;
  firstObservedAt: IsoUtc;
  lastObservedAt: IsoUtc;

  visualCandidateIds: Ulid[];        // may be empty for unresolved_metal
  metalHitIds: Ulid[];               // may be empty for unconfirmed_visual
  corroborationCount: number;        // independent contributing observations

  bestVisualConfidence: number | null;
  bestMetalSignalNorm: number | null;
  classId: string | null;

  // Risk — populated ONLY when classification === 'confirmed'
  riskScore: number | null;          // [0,1], §11.3
  riskBand: RiskBand | null;
  riskComputedAt: IsoUtc | null;
  riskInputs: RiskInputs | null;     // full audit trail of the computation

  // Advisory, never affects risk (§11.7)
  vlmVerdict: VlmVerdict;
  vlmRationale: string | null;
  gradCamRef: string | null;

  reviewState: ReviewState;
  reviewHistory: ReviewRecord[];     // append-only
}

interface RiskInputs {
  visualNorm: number;
  metalNorm: number;
  corroborationNorm: number;
  weights: { visual: number; metal: number; corroboration: number };
  thresholds: { visual: number; metal: number };
  overridesApplied: string[];        // e.g. ['strong_metal_floor', 'monotonic_ratchet']
  formulaVersion: string;            // 'risk-v1'
}

interface ReviewRecord {
  reviewState: ReviewState;
  reviewedAt: IsoUtc;
  reviewedBy: Ulid;
  note?: string;
}

// ── Coverage ────────────────────────────────────────────
type CellState = 'unswept' | 'visual_swept' | 'dual_swept';

interface CoverageCell {
  sessionId: Ulid;
  cellX: number;                     // UTM grid index
  cellY: number;
  state: CellState;
  visualPasses: number;
  metalPasses: number;
  meanGsdMm: number | null;
  degraded: boolean;                 // undersampled or GPS-degraded, P-7.5
}

interface CoverageSummary {
  sessionId: Ulid;
  cellSizeM: number;                 // default 0.5
  visualSweptAreaM2: number;
  dualSweptAreaM2: number;           // will be MUCH smaller — §12.2
  degradedAreaM2: number;
  trackLengthM: number;
  // NOTE: there is deliberately no "coveragePercent" field. §12.5
}
```

### 8.3 The forbidden field

- **P-8.1** No entity SHALL contain a field named or meaning `coveragePercent`, `percentComplete`, `cleared`, `clearedArea`, or `safe`. There is no denominator (no planned area, C-03) and no clearance authority (§23.2). Attempting to add one is a specification violation.

---

## 9. Edge Modules (M1–M4, M15)

### 9.1 M1 — Camera & capture pipeline

- **P-9.1** M1 SHALL use a **GStreamer** pipeline to downscale the IMX708 in-hardware to `inferenceWidthPx` before frames reach Python. Full-resolution frames SHALL NOT be decoded in Python — that OOMs a 4 GB Nano (S1 Phase 4).
- **P-9.2** Each frame SHALL be stamped with `tMonoNs` at capture, before any processing.
- **P-9.3** M1 SHALL run in its own thread and SHALL NOT block the MAVLink reader thread (S1 Phase 2: "asynchronous multi-threaded Python loops … without causing MAVLink lag").
- **P-9.4** M1 SHALL write full-resolution frames for detections to the SD card for Tier-2 reconciliation (§7.5), with a bounded ring buffer and a disk-full alert.
- **P-9.5** Camera fault or frame starvation > 2 s SHALL raise `CAMERA_FAULT` to the dashboard and mark the track segment degraded.

### 9.2 M4 — Visual detection (YOLOv8n)

- **P-9.6** The model SHALL be YOLOv8n exported to **ONNX opset 12** and compiled to a **TensorRT FP16 `.engine` natively on the target Nano** (cross-compiled engines are not portable).
- **P-9.7** Inference SHALL be tiled per P-7.3, with cross-seam NMS at IoU 0.5.
- **P-9.8** Detections below `visualConfidenceThreshold` SHALL be discarded before fusion (S1 REQ-2.4).
- **P-9.9** Detection **class labels are data, not code.** M4 SHALL load the class catalog from the model artifact. No module — edge, backend, or frontend — may hardcode a class name. Unknown `classId` renders as an explicit "unclassified" label.
- **P-9.10** Achieved effective FPS SHALL be published in the health stream and compared against `FPS_required` (P-7.4/P-7.5).
- **P-9.11** M4 SHALL project each bbox centroid to ground coordinates using the nadir pinhole model with the live GPS fix and attitude, and SHALL compute `localizationUncertaintyM` per §7.6 for that specific fix.

### 9.3 Class catalog note

The current `frontend/src/domain/detection.ts` carries **provisional placeholder labels**. These SHALL be replaced by the perception team's final catalog. Until then the UI renders the provisional label with an explicit "(provisional)" suffix.

### 9.4 M2 — Metal-detector subsystem

The Arduino runs C++; the Jetson reads a serial line protocol.

- **P-9.12** The ADS1115 SHALL be read at ≥ 20 SPS in continuous single-ended mode on the coil channel, with gain selected so the working range occupies ≥ 50% of full scale.
- **P-9.13** The Arduino SHALL maintain a **rolling baseline** (median over a 3–5 s window) and emit both `rawAdc` and `baselineAdc`. Absolute thresholds are forbidden — soil mineralization shifts the baseline (S1 Phase 6: "adjusting the analog threshold from 600 up to 750").
- **P-9.14** Normalization:
  ```
  signalNorm = clamp01( (rawAdc − baselineAdc) / (adcSpan − baselineAdc) )
  ```
  where `adcSpan` is the measured full-scale response to a reference metal target, stored in `config/sensing.yaml`.
- **P-9.15** A **metal hit** is declared when `signalNorm ≥ metalThresholdNorm` for ≥ 3 consecutive samples (debounce against motor/ESC transients).
- **P-9.16** Motor-RPM-correlated baseline drift SHALL be characterised on the bench (P-5.3) and subtracted. If residual drift exceeds 20% of `adcSpan`, M2 SHALL raise `METAL_BASELINE_UNSTABLE` and its hits SHALL be marked low-trust.
- **P-9.17** The serial line protocol SHALL be a single ASCII line per sample, CRC-suffixed, with a monotonic sequence number, so dropped bytes are detectable:
  ```
  MD,<seq>,<tMonoMs>,<rawAdc>,<baselineAdc>,<crc8>\n
  ```
- **P-9.18** Loss of Arduino serial for > 2 s SHALL raise `METAL_SENSOR_OFFLINE`. **While offline, no detection may reach `confirmed`** — the confirmation gate has lost an input.
- **P-9.19** Calibration (baseline capture + `adcSpan` against a reference target) SHALL be a documented pre-flight checklist step, and its timestamp recorded in session metadata. A session started with calibration older than 24 h SHALL warn.

### 9.5 M3 — Telemetry & time sync

- **P-9.20** M3 SHALL subscribe read-only to `GLOBAL_POSITION_INT`, `ATTITUDE`, `GPS_RAW_INT`, `SYS_STATUS`, `SYSTEM_TIME`, `VFR_HUD` at ≥ 4 Hz where available.
- **P-9.21** M3 SHALL maintain the monotonic↔GPS-time offset (§8.1) and expose a `fixAt(tMonoNs)` interpolator so any frame or metal sample can be paired with the correct fix rather than the latest one.
- **P-9.22** `fixType` below `fix_3d` or `hdop > 2.5` SHALL mark subsequent observations `gpsDegraded`, inflate `localizationUncertaintyM`, and mark the coverage cells degraded.
- **P-9.23** `pass` SHALL be derived from altitude: `altAglM ≤ metalMaxStandoffM + 0.3` → `confirmation`, else `survey`. Hysteresis of 0.2 m prevents flapping.

### 9.6 M15 — Telemetry bridge & reconciliation

- **P-9.24** Events SHALL be sent as UDP micro-packets, payload **≤ 1200 B** (MTU-safe), each with a monotonic `seq` and CRC32. Compact key names; integers scaled (lat/lon ×1e7, altitude ×1e3).
- **P-9.25** Thumbnails SHALL be chunked with `(imgId, chunkIdx, chunkCount)`. The ground receiver SHALL request gap-fill for missing chunks; after 3 failed attempts `thumbnailStatus = 'lost'`.
- **P-9.26** Every event SHALL also be written to an on-drone **SQLite cache** before transmission (S1 REQ-4.4).
- **P-9.27** On landing, `rsync` over USB/Wi-Fi SHALL reconcile the SQLite cache and Tier-2 imagery with PostgreSQL. Reconciliation SHALL be **idempotent** — ULIDs make replay safe.
- **P-9.28** The dashboard SHALL show `pendingReconciliation` count per session. A session with unreconciled records SHALL NOT be marked report-ready without an explicit operator override, recorded in the audit log.
- **P-9.29** Link-quality metrics (packet loss %, RSSI, chunks outstanding) SHALL be published to the health stream.

---

## 10. M5 — Fusion & Confirmation Specification

**This module is the product thesis. Everything else is plumbing around it.**

### 10.1 Two gates, not one — reconciling the SRS with itself

S1 contains two statements that look contradictory:

| Location | Statement | Operator |
|---|---|---|
| S1 SDLC Phase 1 | "an anomaly must trigger **either** a visual YOLO flag **or** a subsurface metallic flag before transmitting data" | **OR** |
| S1 §4.3 / REQ-3.2 | "confirm a mine only when **both** visual detection and metallic evidence agree" | **AND** |

They are not contradictory — they govern different gates:

```
             ┌──────────────────────────────────────────┐
  observation │  TRANSMIT GATE  =  visual OR metal       │  → log it, send it, show it
             └──────────────────────────────────────────┘
                              │
             ┌──────────────────────────────────────────┐
             │  CONFIRM GATE   =  visual AND metal      │  → call it a mine, risk-score it
             └──────────────────────────────────────────┘
```

- **P-10.1** The **transmit gate is OR.** Any single-sensor observation above threshold SHALL be logged and transmitted. Discarding it loses field-diagnostic information and hides sensor faults.
- **P-10.2** The **confirm gate is AND.** Only a spatially-associated visual+metal pair SHALL be classified `confirmed`.
- **P-10.3** These two gates SHALL be implemented as separate, separately-tested functions. Collapsing them is the single most likely way to break the Zero-Noise Policy.

### 10.2 Three-state classification

| Visual | Metal | `classification` | Risk-scored? | Risk heatmap? | PDF mine list? | Map layer |
|---|---|---|---|---|---|---|
| ✔ | ✔ | **`confirmed`** | **Yes** | **Yes** | **Yes — §16.2 Sec. 4** | Confirmed risk layer |
| ✔ | ✖ | `unconfirmed_visual` | No | **No** | Appendix B, labelled *not a confirmed mine* | Unconfirmed visual layer (⚠) |
| ✖ | ✔ | `unresolved_metal` | No | **No** | Appendix C, labelled *metallic anomaly, no visual corroboration* | Unresolved metal layer (◇) |
| ✖ | ✖ | — nothing emitted — | — | — | — | — |

- **P-10.4** `unconfirmed_visual` and `unresolved_metal` SHALL NEVER contribute to the risk heatmap, the confirmed-mine count, or the safe-path planner's hazard cost surface.
- **P-10.5** They SHALL be preserved, displayed on their own toggleable layers, and reported in labelled appendices. **Discarding them entirely (a literal reading of REQ-3.4) destroys the evidence needed to diagnose a failed sensor** — hence P-10.1. REQ-3.4's intent is "not stored *as mine records*", which this satisfies.
- **P-10.6** `unresolved_metal` is a **new third state** not present in S1. It is required because a metal hit with no visual candidate is a real and important field outcome — a buried mine the camera cannot see (C-12). Carry into the SRS amendment.

### 10.3 Spatial association (the confirmation gate)

Because of the two-pass workflow (§7.7), visual and metal evidence may be **minutes** apart. Association is therefore **spatial-first**.

```
associate(candidate c, metalHit m) :=
      m.sessionId == c.sessionId
  ∧   ¬m.standoffExceeded
  ∧   haversine(c.position, m.position) ≤ r_assoc
  ∧   |m.tUtc − c.tUtc| ≤ 60 min            (same session, generous)
```

`r_assoc` default **3.5 m**, derived from combining the two observations' CEP95 values:

```
r_assoc = clamp( sqrt(c.uncertainty² + m.uncertainty²),  2.0 m,  6.0 m )
```

- **P-10.7** `r_assoc` SHALL be computed per pair from the two records' actual uncertainties, clamped to `[2.0, 6.0]` m, with `SessionConfig.associationRadiusM` as the fallback.
- **P-10.8** The trade-off SHALL be documented in the UI and report: **larger `r_assoc` → higher recall of true pairings but more risk of mis-pairing; smaller → risk of failing to confirm a real mine.** Given the high-recall mandate (§1.5), err larger.
- **P-10.9** **Known limitation, must be stated in every report:** two mines closer together than `r_assoc` may merge into a single cluster. TerraVigil reports *locations of confirmed hazard*, not a count guaranteed to equal the number of devices.
- **P-10.10** In a hypothetical single-pass mode (if a future coil could reach survey altitude), the temporal window SHALL tighten to ≤ 500 ms. Implement as a config-selected mode; do not hardcode.

### 10.4 Spatial deduplication & clustering

S1 SDLC Phase 3 requires "spatial deduplication logic." A `Detection` is a **cluster**, not a single observation.

- **P-10.11** Incoming observations SHALL be assigned to an existing cluster when within `r_assoc` of its centroid (PostGIS `ST_DWithin` on the ground side; a local grid index on the Jetson), else a new cluster is opened.
- **P-10.12** The centroid SHALL be the **inverse-uncertainty-weighted mean** of member positions — a fix with HDOP 0.8 should outweigh one with HDOP 2.4.
- **P-10.13** `corroborationCount` = number of independent contributing observations. Observations from the same frame do not count as independent.
- **P-10.14** Clustering SHALL be **incremental and idempotent** — reconciled records arriving post-flight must produce the same clusters as live arrival. Deterministic tie-breaking by ULID.
- **P-10.15** A cluster's `classification` SHALL be recomputed on every membership change, and may **upgrade** `unconfirmed_visual → confirmed` when a metal hit later associates. Downgrades are forbidden (§11.6).

### 10.5 Zero-Noise Policy — enforcement points

The policy is only real if it is enforced structurally, not by convention.

| # | Enforcement point | Mechanism |
|---|---|---|
| 1 | Edge | `classify()` is the only function that may set `classification`; unit-tested against the §10.2 truth table |
| 2 | Database | `CHECK` constraint: `riskScore IS NOT NULL` **iff** `classification = 'confirmed'` |
| 3 | Database | `CHECK` constraint: `classification = 'confirmed'` **requires** `array_length(visualCandidateIds) > 0 AND array_length(metalHitIds) > 0` |
| 4 | API | Heatmap and safe-path endpoints filter `WHERE classification = 'confirmed'` at the SQL layer, not in application code |
| 5 | Report | The mine-list query is a distinct, reviewed SQL statement; appendices use separate queries |
| 6 | Frontend | Risk layer subscribes to a `confirmed`-only selector. The unconfirmed layers use different marker geometry **and** different colour ramp (§20.5) |
| 7 | LLM | The report agent receives pre-filtered, pre-classified records and is forbidden from re-classifying (§11.7, §16.4) |

- **P-10.16** All seven enforcement points SHALL exist. Defence in depth: any one of them failing must not publish an unconfirmed detection as a mine.

---

## 11. M6 — Risk Assessment Specification

S1 requires "risk-based heatmaps" (REQ-5.2) but **never defines risk**. This section defines it. It is new work and must be carried into the SRS amendment.

### 11.1 Risk is not confirmation — two separate questions

| Question | Answered by | Output |
|---|---|---|
| *Do we have enough evidence to call this a mine?* | M5 confirmation gate | `classification` |
| *How strong is the evidence for this confirmed mine?* | M6 risk assessment | `riskScore`, `riskBand` |
| *How well do we know where it is?* | §7.6 error budget | `localizationUncertaintyM` |

- **P-11.1** These three SHALL remain independent fields. Conflating them is the most common design error in this domain.

### 11.2 Localization uncertainty is NOT a risk input

- **P-11.2** `localizationUncertaintyM` SHALL NOT appear in the risk formula. A mine is exactly as dangerous whether the GPS fix was good or poor. Poor localization is rendered as a **larger uncertainty circle** (P-7.13), never as lower risk.

### 11.3 Formula (`risk-v1`)

Inputs, all normalized to `[0,1]`:

```
visualNorm  = clamp01( (bestVisualConfidence − T_vis)   / (1 − T_vis) )
metalNorm   = clamp01( (bestMetalSignalNorm  − T_metal) / (1 − T_metal) )
corrobNorm  = clamp01( (corroborationCount − 1) / 3 )        // saturates at 4 observations

riskScore   = 0.40·visualNorm + 0.40·metalNorm + 0.20·corrobNorm
```

Weight rationale — equal weight to the two independent physical modalities, with corroboration as a smaller confidence multiplier. Visual is not privileged over metal: metal is the only sub-surface evidence the system has (C-12).

### 11.4 Bands

| Band | Range | Meaning |
|---|---|---|
| **`high`** | `riskScore ≥ 0.70` | Strong agreement from both modalities and/or repeated corroboration |
| **`medium`** | `0.40 ≤ riskScore < 0.70` | Confirmed, moderate evidence strength |
| **`low`** | `riskScore < 0.40` | Confirmed at threshold. **Still a confirmed mine.** |

- **P-11.3** There is **no `none` band.** Every `confirmed` detection is at minimum `low`. `low` means *weak evidence*, never *probably fine*.
- **P-11.4** **Strong-metal floor.** If `metalNorm ≥ 0.85`, `riskBand` SHALL be at least `medium` regardless of `riskScore`. Strong physical sub-surface evidence dominates a weak visual score.

### 11.5 Worked examples

| # | `c_vis` | `s_metal` | `n` | visualNorm | metalNorm | corrobNorm | `riskScore` | Band | Note |
|---|---|---|---|---|---|---|---|---|---|
| A | 0.94 | 0.88 | 3 | 0.880 | 0.815 | 0.667 | **0.811** | **high** | textbook confirmation |
| B | 0.62 | 0.48 | 1 | 0.240 | 0.200 | 0.000 | **0.176** | **low** | confirmed, weak — still a mine |
| C | 0.55 | 0.95 | 2 | 0.100 | 0.923 | 0.333 | **0.476** | **medium** | weak visual, very strong metal; floor also applies |
| D | 0.98 | 0.40 | 4 | 0.960 | 0.077 | 1.000 | **0.615** | **medium** | strong visual, weak metal, well corroborated |
| E | 0.91 | *(no metal pass)* | 1 | — | — | — | **null** | **null** | `unconfirmed_visual` — no risk, not on heatmap |
| F | *(no visual)* | 0.92 | 2 | — | — | — | **null** | **null** | `unresolved_metal` — no risk, not on heatmap |

Computed with `T_vis = 0.50`, `T_metal = 0.35`.

### 11.6 Monotonic ratchet

- **P-11.5** Within a session, `riskBand` SHALL NOT decrease automatically. If recomputation lowers it, the higher band is retained and `overridesApplied` records `monotonic_ratchet`.
- **P-11.6** Only an authenticated operator may lower a band, via an explicit action that writes an append-only `ReviewRecord` with a mandatory note. The original band remains visible in history.
- **P-11.7** Rationale (state in the report): in a system whose stated priority is high recall to avoid life-threatening false negatives (S1 §5.1), automated de-escalation is the most dangerous possible behaviour.

### 11.7 The LLM and VLM may never touch risk

- **P-11.8** `riskScore` and `riskBand` SHALL be computed **only** by the deterministic function in §11.3. No LLM, VLM, or agent may compute, adjust, or override them.
- **P-11.9** The ground-side INT4 VLM (S1 Phase 3) is **advisory**. Its output populates `vlmVerdict` / `vlmRationale` and may raise review priority. `vlmVerdict = 'reject'` SHALL NOT lower `riskScore` or `riskBand`.
- **P-11.10** Rationale: in a high-recall safety system you never let a model talk you out of physically-corroborated visual **and** metallic evidence. A VLM rejection is a flag for a human, not a verdict.
- **P-11.11** `RiskInputs` SHALL be persisted with every score so any number in any report can be recomputed and audited years later. `formulaVersion` makes future formula changes traceable.

### 11.8 Risk surface (heatmap)

- **P-11.12** The heatmap SHALL be a kernel-density surface over `confirmed` detections only, each weighted by `riskScore`, with kernel bandwidth **≥ `localizationUncertaintyM`** so the rendering cannot look sharper than the data.
- **P-11.13** The heatmap SHALL use a **risk-specific 3-step colour ramp**, distinct from the system-status palette (§20.5).
- **P-11.14** Absence of heat SHALL be labelled **"no confirmed detections"**, never "clear" or "safe" (§23.2).

---

## 12. M7 — Coverage Specification

> "We don't plan the area beforehand — the drone flies over the area and we get the coverage. That's the main thing." — S4

Coverage is therefore a **measured output**, not a planned input.

### 12.1 Swept-area model

```
sweptPolygon(pass) = buffer( flownTrack(pass),  swathWidth(pass) / 2 )
```

- **P-12.1** Coverage SHALL be computed in the session's UTM zone (metres), then transformed to WGS84 for delivery.
- **P-12.2** Track segments where `gpsDegraded`, `UNDERSAMPLED` (P-7.5), or `CAMERA_FAULT` was active SHALL be excluded from swept area and accumulated into `degradedAreaM2` — reported separately, never silently dropped.

### 12.2 Two swaths, two coverages — never one number

The camera and the coil sweep radically different footprints (§7.7). Reporting a single figure is misleading and unsafe.

| Coverage | Swath | At 4 m AGL | Typical result over 1 ha |
|---|---|---|---|
| **Visual coverage** | `W(h) = 1.361 · h` | **5.44 m** | most of the site |
| **Dual (metal-corroborated) coverage** | `metalSwathM` (measured, ~0.16 m) | **0.16 m** | **a few tens of m² at most** |

- **P-12.3** M7 SHALL emit `visualSweptAreaM2` and `dualSweptAreaM2` as **two distinct, always-co-displayed values.**
- **P-12.4** The UI and report SHALL never show one without the other, and SHALL make the magnitude difference explicit. Dual coverage will typically be **< 1%** of visual coverage — that is expected, not a bug, and it is the honest picture of what a metal detector on a drone can do.

### 12.3 Grid accumulation

- **P-12.5** Cell size **0.5 m** in the session UTM grid.
- **P-12.6** Cell state: `dual_swept` if swept by both sensors; `visual_swept` if camera only; else `unswept`.
- **P-12.7** Each cell SHALL record `visualPasses`, `metalPasses`, and `meanGsdMm`. A cell swept only at GSD worse than the session's minimum-resolvable limit (§7.2) SHALL be marked `degraded`.
- **P-12.8** The Leaflet layer SHALL render coverage via a canvas/tile renderer, not per-cell DOM vectors — a 1 ha site at 0.5 m is 40,000 cells.

### 12.4 Coverage confidence

- **P-12.9** Coverage SHALL be qualified, not binary. A cell swept once at marginal GSD is not equivalent to one swept three times at good GSD. Expose `visualPasses` and `meanGsdMm` in the cell tooltip and the report.

### 12.5 The non-claim — swept ≠ cleared

- **P-12.10** No surface of this product SHALL state or imply that any area is **cleared, safe, mine-free, or released.** Land release under the International Mine Action Standards (IMAS) requires accredited procedures, quality assurance, and full-depth clearance that TerraVigil does not perform and does not claim.
- **P-12.11** Every coverage view and every report page containing coverage SHALL carry the fixed legend:

  > **SWEPT ≠ CLEARED.** This map shows where sensors passed and what they observed. It is a survey aid, not a clearance certificate. No area shown here has been cleared under IMAS. Do not enter or authorise entry on the basis of this map.

- **P-12.12** There SHALL be no `coveragePercent` field or UI element (P-8.1). Percentages require a denominator, and this product deliberately has none.

---

## 13. M8 — Explainability (Grad-CAM)

S3 §5.1 calls this the **highest-ROI feature** — it directly answers "how do you know it's not just guessing."

- **P-13.1** Grad-CAM SHALL run **ground-side** on Tier-2 full-resolution imagery, using `pytorch-grad-cam` over the Ultralytics PyTorch model (not the TensorRT engine).
- **P-13.2** It SHALL be triggered automatically on reconciliation for every `confirmed` and `unconfirmed_visual` detection, and be re-runnable on demand.
- **P-13.3** Output: a PNG overlay at the crop's native resolution, referenced by `gradCamRef`, plus the target layer name and model checkpoint hash for reproducibility.
- **P-13.4** The detection card SHALL show original / overlay side-by-side with an opacity slider, and SHALL state which model checkpoint produced it.
- **P-13.5** Grad-CAM output SHALL NOT influence `riskScore` (P-11.8). It explains; it does not score.
- **P-13.6** When Tier-2 imagery is `missing`, the card SHALL say **"explanation unavailable — source image not reconciled"** rather than hiding the panel.

---

## 14. M9 — AI Safe-Path Planner

S3 §5.1: "Real pathfinding over real geospatial data, not an LLM prompt." This is where M6's risk output becomes actionable.

- **P-14.1** The planner SHALL run **A\*** over a graph built in PostGIS from the session's UTM grid.
- **P-14.2** Node set: `visual_swept` or `dual_swept` cells. `unswept` cells SHALL be **traversable but heavily penalised** — routing through unsurveyed ground is worse than routing near a known hazard you can see.
- **P-14.3** Edge cost:
  ```
  cost(u,v) = dist(u,v) · ( 1 + λ_hazard·hazard(v) + λ_unswept·unswept(v) + λ_degraded·degraded(v) )

  hazard(v) = Σ over confirmed detections d:
                 d.riskScore · exp( −dist(v, d)² / (2·σ_d²) )
  σ_d       = max( d.localizationUncertaintyM,  minStandoffM )
  ```
- **P-14.4** `σ_d` SHALL be at least the detection's own uncertainty radius. Routing closer than the error circle is meaningless precision.
- **P-14.5** Only `classification = 'confirmed'` detections SHALL contribute to `hazard()` (P-10.4). `unconfirmed_visual` and `unresolved_metal` SHALL contribute to a **separate advisory cost term**, rendered as a distinct dashed corridor on the map — surfaced to the operator, not silently blended into the primary cost.
- **P-14.6** `minStandoffM` SHALL default to **5.0 m** and be operator-configurable upward only. Hard floor, never below the largest `localizationUncertaintyM` on the route.
- **P-14.7** λ weights SHALL be config, exposed in the UI as a single **"caution ⟷ directness"** slider, with the resolved numeric weights shown.
- **P-14.8** Output: polyline, total length, **minimum standoff achieved**, count of confirmed detections within `2·minStandoffM`, and the resolved weights — plus the mandatory disclaimer:

  > **This route is a planning aid computed from an incomplete survey. It is not a cleared lane and confers no safety guarantee. Unswept ground on or near this route has not been examined.**

- **P-14.9** If no route exists satisfying `minStandoffM`, the planner SHALL return **no route** with an explanation. It SHALL NOT silently relax the standoff to produce an answer.
- **P-14.10** Use PostGIS `ST_DWithin` with a GiST index for the hazard convolution. Do not compute distances in Python.

---

## 15. M10 — RAG Safety Copilot

- **P-15.1** The corpus SHALL be **real IMAS demining documentation** plus this project's own operator/deployment guides, ingested into **Chroma** with per-chunk source, section, page, and version metadata.
- **P-15.2** Every answer SHALL cite retrieved sources by document, section, and page. **An answer with no retrieved support SHALL say so and refuse** rather than answer from parametric memory.
- **P-15.3** Two-index retrieval:
  - **Doctrine index** (Chroma) — IMAS and procedure text.
  - **Mission index** (PostgreSQL, structured) — sessions, detections, coverage.
- **P-15.4** Mission-data questions ("how many confirmed detections in session X?") SHALL be answered by **parameterised SQL**, never by asking the LLM to read records. The LLM narrates the query result; it does not compute it.
- **P-15.5** The copilot SHALL refuse, with an explanation, any request to: declare an area clear or safe; authorise entry; recommend a neutralization or disposal procedure; or override a risk band.
- **P-15.6** Temperature 0. All prompts and retrieved context SHALL be logged with the answer for audit.
- **P-15.7** Answers SHALL be scoped to the current session unless the operator explicitly broadens scope.

---

## 16. M11 — Report Generator

### 16.1 Trigger & mechanics

- **P-16.1** One click → CrewAI report agent → pulls session stats + detections from PostgreSQL and doctrine context from Chroma → LLM drafts narrative → **WeasyPrint** renders HTML/CSS → PDF. Target ≤ 60 s.
- **P-16.2** Every report SHALL be immutably stored with a content hash, a monotonic report number, and the `formulaVersion` of the risk model used.
- **P-16.3** Regenerating SHALL create a **new** report, never overwrite. Superseded reports remain retrievable.

### 16.2 Mandatory structure

| § | Section | Content | Rule |
|---|---|---|---|
| 1 | Cover | Site, session ID, operator, date/time, report № , content hash | |
| 2 | **Scope & limitations** | **Comes before findings, never an appendix.** Two-pass method; RGB cannot see buried objects (C-12); GSD limit and minimum resolvable target (§7.2); error budget (§7.6); `r_assoc` merge limitation (P-10.9); SWEPT ≠ CLEARED (P-12.11) | **P-16.4** |
| 3 | Method & configuration | Flight mode, altitudes, thresholds, calibration timestamps, model checkpoint hash, `formulaVersion` | |
| 4 | **Confirmed detections** | **`classification = 'confirmed'` ONLY.** Per detection: ID, coordinates **± uncertainty**, `riskBand`, `riskScore`, `RiskInputs` breakdown, visual confidence, metal signal, `corroborationCount`, thumbnail, Grad-CAM overlay, timestamps | **P-16.5** |
| 5 | Risk map | Heatmap over confirmed detections, risk ramp legend, SWEPT ≠ CLEARED legend | |
| 6 | Coverage | `visualSweptAreaM2` **and** `dualSweptAreaM2` together (P-12.3), degraded area, track length, per-cell pass statistics | |
| 7 | Safe-path (if run) | Route, minimum standoff, resolved weights, disclaimer (P-14.8) | |
| 8 | Telemetry summary | Duration, distance, battery profile, link quality, fault events | |
| 9 | Data integrity | Reconciliation status, lost thumbnails, missing frames, degraded segments | **P-16.6** |
| A | Appendix A — Audit | `RiskInputs` for every detection; full config; calibration records | |
| B | **Appendix B — Unconfirmed visual observations** | `unconfirmed_visual`. Header: *"The following are visual observations that were NOT corroborated by metallic evidence. They are NOT confirmed mines and are excluded from all findings and maps above."* | **P-16.7** |
| C | **Appendix C — Unresolved metallic anomalies** | `unresolved_metal`. Header: *"The following are metallic anomalies with no visual corroboration. They are NOT confirmed mines. A metallic anomaly may indicate a buried device that the camera cannot see, or benign metallic debris. Neither interpretation is established by this survey."* | **P-16.8** |

### 16.3 Numbers in reports

- **P-16.9** Every coordinate SHALL be printed with its uncertainty: `17.385421°N, 78.486671°E ± 3.2 m (95%)`. A bare coordinate is a defect.
- **P-16.10** The §2 error-budget table SHALL be computed from the session's **actual** conditions, not copied from this PRD.

### 16.4 LLM constraints in reporting

- **P-16.11** The LLM SHALL receive **pre-filtered, pre-classified, pre-scored** records. It SHALL NOT be given the raw observation stream.
- **P-16.12** The LLM SHALL NOT compute, alter, or restate any risk band or score other than verbatim from the record (P-11.8).
- **P-16.13** The LLM SHALL NOT generate the words *clear*, *cleared*, *safe*, *secure*, or *mine-free* about ground. Enforce with a post-generation regex gate that **fails the render** on violation.
- **P-16.14** All numeric values in prose SHALL be template-injected from the database, never generated. Temperature 0.
- **P-16.15** Narrative sections SHALL be visually distinguished from data sections so a reader always knows what was computed vs. written.

---

## 17. M12 — Voice Field Assistant

- **P-17.1** Browser **Web Speech API** captures speech → text → `POST /assistant` → same RAG path as M10 → response spoken via speech synthesis. **Thin client: all intelligence server-side** (S3 §5.1).
- **P-17.2** The transcribed query SHALL be displayed for correction before dispatch. Silent mis-transcription in a safety context is unacceptable.
- **P-17.3** Spoken answers SHALL be accompanied by the full text **with citations visible** — citations cannot be conveyed reliably by voice alone.
- **P-17.4** Voice SHALL NOT be able to trigger any state-changing action (end session, alter a review state, change thresholds). Read-only.
- **P-17.5** Graceful degradation with a clear notice where the Web Speech API is unavailable (notably non-Chromium browsers).

---

## 18. M13 — Agent Orchestration

- **P-18.1** **CrewAI** first — fastest to prototype (S3 §7). LangGraph only if building the reasoning-feed stretch goal (S3 §5.2).
- **P-18.2** Agents: **Report** (M11 narrative), **Analyst** (session Q&A over structured data), **Doctrine** (IMAS retrieval). Each with an explicit, minimal toolset.
- **P-18.3** No agent SHALL have write access to `detections`, `risk_*`, or `coverage_*` tables. Agents read and produce prose. Ground truth is written only by deterministic modules.
- **P-18.4** Every agent invocation SHALL be logged with inputs, tool calls, and outputs.
- **P-18.5** Wall-clock and token budgets per invocation, with a hard timeout. A hung agent SHALL degrade to a template-only report rather than blocking the operator.

### 18.6 Stretch goal — Live Agent Reasoning Feed

- **P-18.6** Build **only if the five must-haves are complete early** (S3 §5.2). If built: LangGraph state-graph stream over Socket.io, clearly labelled as model reasoning and **not** as system findings.

---

## 19. API Contract

FastAPI, `/api/v1`, JSON, TLS. Socket.io for push. **No endpoint writes to the aircraft (P-2.2).**

### 19.1 REST

| # | Method & path | Purpose | Roles | Notes |
|---|---|---|---|---|
| **1** | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | Session auth | all | HttpOnly cookie or bearer; enforced on every request (S1 REQ-1.1) |
| **2** | `GET /sessions` · `POST /sessions` · `GET /sessions/{id}` · `POST /sessions/{id}/end` | Scan-session lifecycle | operator, admin | **`POST /sessions` body has NO geometry** (C-02): `{siteName, flightMode, notes, config}` |
| **3** | `GET /sessions/{id}/detections` | Detection register | all | Filters: `classification`, `riskBand`, `minConfidence`, `minMetal`, `reviewState`, `from`, `to`, `bbox`. Cursor-paginated. **`classification` is required for the risk layer query** |
| **4** | `GET /detections/{id}` · `GET /detections/{id}/thumbnail` · `GET /detections/{id}/frame` · `GET /detections/{id}/gradcam` | Detection detail & imagery | all | 404 with a typed reason when imagery is unreconciled — never an empty 200 |
| **5** | `POST /detections/{id}/review` | Append-only review action | operator, admin | `{reviewState, note}`. Band downgrade requires a note (P-11.6) |
| **6** | `GET /sessions/{id}/track` | Flown track | all | Decimated by default; `?full=true` for export |
| **7** | `GET /sessions/{id}/coverage` | Coverage grid & summary | all | Returns **both** swept areas (P-12.3). Vector tiles or packed binary — not 40k JSON objects |
| **8** | `GET /sessions/{id}/risk-surface` | Risk heatmap | all | **Server-side `WHERE classification='confirmed'`** (enforcement point 4, P-10.16) |
| **9** | `POST /sessions/{id}/safe-path` | A* minimum-risk route | all | `{start, end, minStandoffM, caution}` → route + standoff + disclaimer. `409` with explanation when no route satisfies the standoff (P-14.9) |
| **10** | `POST /assistant/query` | RAG copilot (text & voice) | all | `{query, sessionId?, scope}` → `{answer, citations[], sql?, refused?}` |
| **11** | `POST /sessions/{id}/report` · `GET /reports` · `GET /reports/{id}` · `GET /reports/{id}/pdf` | Report generation & retrieval | operator, admin | `202` + job id; poll or await Socket.io `report:ready` |
| **12** | `GET /system/health` · `GET /system/events` | Subsystem health & event log | all | Per-subsystem: camera, metal detector, GPS, link, inference, database, reconciliation |
| **13** | `GET /config/thresholds` · `PATCH /config/thresholds` | Environmental tuning (S1 Phase 6) | operator, admin | Changes apply to **new** sessions only; active-session config is frozen (§8.2) |
| **14** | `POST /ingest/events` · `POST /ingest/reconcile` | Bridge ingestion | service token | Idempotent by ULID (P-9.27). Not operator-facing |
| **15** | `GET /catalog/detection-classes` | Model class catalog | all | **Frontend MUST read classes from here** (P-9.9) |

### 19.2 Socket.io channels

| Channel | Payload | Cadence |
|---|---|---|
| `telemetry` | `TrackPoint` | 2–4 Hz |
| `detection` | new/updated `Detection` incl. classification change | on event |
| `coverage` | incremental swept-cell deltas | ~1 Hz, batched |
| `health` | subsystem status, link quality, achieved FPS vs required | 1 Hz |
| `alert` | `UNDERSAMPLED`, `CAMERA_FAULT`, `METAL_SENSOR_OFFLINE`, `TIME_SYNC_DEGRADED`, `LINK_LOST`, `LOW_BATTERY`, `METAL_BASELINE_UNSTABLE` | on event |
| `report:ready` | report id + URL | on completion |

- **P-19.1** Socket.io only — **no polling** (S3 §8).
- **P-19.2** Every payload SHALL carry `sessionId` and a monotonic `seq`. Clients SHALL detect gaps and refetch rather than render a hole.
- **P-19.3** Reconnect with exponential backoff and a resume cursor. On reconnect the client SHALL refetch authoritative state, not assume continuity.
- **P-19.4** Error envelope for all REST failures:
  ```json
  { "error": { "code": "IMAGERY_NOT_RECONCILED", "message": "...", "detail": {} } }
  ```
  Typed codes only. The UI maps codes to copy — no string matching on messages.

---

## 20. M14 — Frontend Specification

### 20.1 What was wrong (S5 audit)

The existing `frontend/` is a well-structured Phase-1 skeleton with a genuinely good service seam and design system — but the UI failed on four counts (S4):

| Failure | Evidence | Fix |
|---|---|---|
| **Built features that don't exist in this product** | Mission planner, survey-area polygon, flight-path preview, "mission" vocabulary | §20.2 — delete. Sessions, not planned missions (C-02) |
| **Generic SaaS look** | `GradientCard.tsx` hardcodes `emerald-500`/`amber-500`/`sky-500`/`indigo-500` — violating the token discipline its own `DESIGN_SYSTEM.md` mandates — plus decorative `blur-2xl` corner glow and `staggerIndex` entrance animation **on live telemetry values**. `GlassPanel.tsx` implements glassmorphism that the same doc explicitly forbids | §20.4, §20.5 |
| **All mock, no data path** | Every `Live*Service` throws `NotImplementedError` | §19 contract + §20.8 cutover |
| **No risk or fusion model** | No `classification`, no `riskBand`, no layer separation. `DETECTION_REVIEW_STATE` deliberately avoided asserting mines — correct for Phase 1, but the product now *does* confirm | §10, §11 |

- **P-20.1** `GlassPanel.tsx` and `GradientCard.tsx` SHALL be **deleted**, not refactored. Both encode the wrong visual thesis.
- **P-20.2** Animating a telemetry value on arrival makes it unreadable at the moment it matters. **No entrance animation on any live numeric value.**
- **P-20.3** `npm run check:tokens` SHALL be extended to fail on any raw Tailwind palette colour (`emerald-*`, `sky-*`, …) in `components/` or `pages/`, not just hex literals — that is the hole `GradientCard` slipped through.

### 20.2 Information architecture

Stack retained: React 19 + Vite + TS + Tailwind + Leaflet + Socket.io + Zustand + TanStack Query.

| Route | Screen | Purpose |
|---|---|---|
| `/login` | Login | REQ-1.1 |
| `/` | **Operations** | Active session or latest; alerts, health, jump-in |
| `/live` | **Live Console** ★ primary | Map + detection feed + telemetry + sweep ribbon |
| `/sessions` | Session archive | List with per-session stats |
| `/sessions/:id` | Session detail / replay | Reuses the live layout, scrubbable |
| `/detections` | Detection register | Filterable table, three classification tabs |
| `/risk-map` | Risk map | Cross-session risk surface + layer control |
| `/safe-path` | Safe-path planner | Pick start/end, caution slider, result |
| `/analytics` | Analytics | Recharts over historical sessions |
| `/reports` | Reports | Generate, list, download |
| `/assistant` | Copilot | Chat + voice, citations |
| `/system` | System health | Subsystems, event log, thresholds |
| `/settings` | Settings | Display, units, connection |

- **P-20.4** There SHALL be **no `/missions/plan` route** and no polygon-drawing affordance anywhere (C-02).
- **P-20.5** Vocabulary: **"scan session"**, never "mission plan". **"swept"**, never "covered" or "cleared".

### 20.3 Live Console — the primary screen

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TERRAVIGIL   SESSION 01K9…  ● ACTIVE   RC-MANUAL   LINK 94%   BATT 68%   │
├──────────────────────────────────────────┬─────────────────────────────────┤
│                                          │  DETECTION FEED                 │
│                MAP                       │  ┌───────────────────────────┐  │
│                                          │  │ ⬤ CONFIRMED    HIGH  0.81 │  │
│   ⬤ confirmed (risk ramp + ○ uncertainty)│  │ vis ████████░░ 0.94       │  │
│   ⚠ unconfirmed visual                   │  │ mtl ████████░░ 0.88  n=3  │  │
│   ◇ unresolved metal                     │  ├───────────────────────────┤  │
│   ── flown track                         │  │ ⚠ UNCONFIRMED VISUAL      │  │
│   ▒▒ visual swept    ▓▓ dual swept       │  │ vis ████████░░ 0.91       │  │
│                                          │  │ mtl ░░░░░░░░░░  no pass   │  │
│                                          │  └───────────────────────────┘  │
│                                          ├─────────────────────────────────┤
│                                          │  TELEMETRY                      │
│                                          │  AGL   4.1 m    SPD  2.8 m/s    │
│                                          │  FIX   3D  HDOP 0.9  SAT 14     │
│                                          │  FPS   3.4 / 1.4 req  ✓         │
│                                          │  PASS  SURVEY                   │
│                                          ├─────────────────────────────────┤
│                                          │  SWEPT  0.21 ha vis             │
│                                          │         38 m²    dual           │
│                                          │  ⚠ SWEPT ≠ CLEARED              │
├──────────────────────────────────────────┴─────────────────────────────────┤
│ SWEEP RIBBON  ─── altitude band ─── pass band ─── detection ticks ────────  │
│ ▁▁▂▄▄▄▄▂▁▁▁▁▄▄▄▄▄▄▂▁▁▁  │survey│conf│survey│  ⬤   ⚠  ⬤       ◇      ⬤    │
└────────────────────────────────────────────────────────────────────────────┘
```

- **P-20.6** Layer toggles SHALL be independent and their state persisted. The **confirmed risk layer** and the two **unconfirmed layers** SHALL use different marker geometry **and** different colour ramps (P-10.16 enforcement 6).
- **P-20.7** The `FPS achieved / required` readout SHALL be permanently visible during an active session with a pass/fail glyph (P-7.5).
- **P-20.8** The **SWEPT ≠ CLEARED** notice SHALL be persistently visible whenever coverage is rendered (P-12.11) — not a dismissible toast.
- **P-20.9** Marker rendering SHALL use Leaflet's canvas renderer. Coverage SHALL use tiles or canvas (P-12.8).

### 20.4 Art direction

The reference language is a **glass-cockpit instrument**, not a marketing dashboard: aviation EFIS, QGroundControl, seismic monitoring consoles, terminal-density financial displays. Authority comes from **information density, typographic hierarchy, and hairline structure** — never from gradients, glow, or depth effects.

**Retain from `docs/DESIGN_SYSTEM.md`** (it is good, and its contrast audit passes): the dark surface ramp, the border tokens, the type scale, tabular numerals for all telemetry, ≤ 150 ms opacity/transform-only motion, `prefers-reduced-motion`.

**Three functional signatures** — these are what make it specific rather than templated. Each earns its place by carrying information:

1. **The Confidence Ledger.** Every detection row renders two stacked micro-bars — `vis` and `mtl` — with the threshold marked as a tick on each. The product's entire thesis (two independent sensors, both required) becomes a repeated visual atom the operator reads in under a second. A missing bar means *that sensor never reported*, visually distinct from a bar at zero.
2. **The Sweep Ribbon.** A full-width strip along the bottom: session time axis, altitude sparkband (making the survey/confirmation two-pass structure immediately legible), sensor-active bands, detection ticks coloured by classification. Scrubbable in replay. This is the one element that makes the two-pass workflow self-explanatory.
3. **Reticle geometry.** Corner brackets — not rounded card borders — frame the map and any imagery pane. Optical-sight vocabulary, used sparingly (two or three places), never decoratively.

**Typography.** One grotesk + one mono, both self-hosted (field deployments may be offline — P-20.14). Suggested: **Inter Tight** for UI, **IBM Plex Mono** for all numerics, coordinates, and IDs. Every number, coordinate, timestamp, and ID uses tabular mono so digits do not jitter as values update — this is functional, not stylistic.

**Density target.** The Live Console shows **≥ 40 discrete data points without scrolling at 1440×900.** If it looks sparse, it is under-specified.

**Forbidden.** Gradient fills, glassmorphism, backdrop blur, glow, neon, drop shadows for hierarchy, entrance animation on data, decorative iconography, pill-shaped cards, raw Tailwind palette colours (P-20.3).

### 20.5 Two colour systems, never one

- **P-20.10** **System status** keeps the existing five-state semantic set: `ok · warning · critical · offline · info`.
- **P-20.11** **Risk** SHALL have its own, visually distinct three-step sequential ramp (`low → medium → high`). It SHALL NOT reuse status tokens. Reusing `warning`/`critical` for risk bands is a category error — a HIGH-risk confirmed detection is a *correct, nominal* system output, not a system fault. The existing `GradientCard` made exactly this mistake.
- **P-20.12** Status and risk SHALL be distinguishable without colour: status by icon, risk by band label plus marker fill pattern (WCAG 1.4.1).
- **P-20.13** Contrast: all pairs ≥ 4.5:1. Re-run `scripts/contrast-audit.mjs` after adding the risk ramp; the audit is only meaningful if it covers the new tokens.

### 20.6 Copy law

- **P-20.14** Forbidden in all UI strings: *clear, cleared, safe, secure, mine-free, all clear, verified safe*. Enforce with a lint rule over string literals in `components/` and `pages/`.
- **P-20.15** Mandated vocabulary:

| Never | Always |
|---|---|
| "Area clear" | "No confirmed detections in swept area" |
| "Mine detected" (for visual-only) | "Unconfirmed visual observation" |
| "100% covered" | "0.21 ha visually swept · 38 m² dual-swept" |
| "Safe route" | "Minimum-risk route (planning aid)" |
| "Mission plan" | "Scan session" |
| "Low risk" alone | "Confirmed · risk band LOW (weak evidence)" |

- **P-20.16** `riskBand = low` SHALL never render without the word **"Confirmed"** adjacent. "Low" alone reads as "probably fine."

### 20.7 State & data layer

- **P-20.17** **TanStack Query** for all REST reads; **Zustand** for realtime-pushed state (telemetry, live detections, coverage deltas, alerts) and UI state (layer toggles, filters).
- **P-20.18** Socket.io events SHALL update Zustand **and** invalidate the corresponding Query keys, so a refetch always reconciles against the server.
- **P-20.19** Detection classes SHALL be fetched from `GET /catalog/detection-classes` (P-9.9). No hardcoded class name may exist in the frontend.
- **P-20.20** The existing `scripts/check-boundaries.mjs` layering rule (components/pages may not import service adapters) SHALL be retained and extended to the new modules.

### 20.8 Mock → live cutover

The existing mock/live seam is the most valuable thing in `frontend/` — keep it.

- **P-20.21** Mock adapters SHALL implement §19 exactly, including error codes and the three-state classification, so the UI is fully exercised before the backend exists.
- **P-20.22** Mock fixtures SHALL include: all three classifications; all three risk bands; a strong-metal-floor case; a monotonic-ratchet case; missing thumbnails; missing Grad-CAM; degraded GPS; an `UNDERSAMPLED` segment; and a no-route safe-path result. **If the UI has never rendered these states, it will fail in the field.**
- **P-20.23** The **SIMULATED DATA** banner SHALL be persistent, non-dismissible, and unmistakable whenever `dataMode = mock`.
- **P-20.24** Cutover SHALL touch only `services/dto.ts`, `services/mappers.ts`, and the `Live*Service` classes. If a page needs changing, the seam was wrong.

---

## 21. Data & ML Pipeline

### 21.1 Dataset strategy (S3 §9)

Real landmines cannot be used. The approach — and this is a **design decision to document, not a gap to hide**:

1. Public landmine-remnant datasets (Roboflow Universe — see S1 §1.5 for the specific sets).
2. Synthetic composites: mine-like objects rendered onto real terrain photography.
3. **Kaggle Military Assets (12 classes, YOLOv8 format)** as hard negatives — critical for suppressing false positives in complex zones.
4. Physical demonstration with **inert training replicas**.

### 21.2 Pipeline (built and tested end-to-end on synthetic data — S3 §9)

| Stage | Function | Guarantee |
|---|---|---|
| `00` merge | Combine multi-source data; arbitrary nesting; collision-proof filenames; remap each source's classes onto one shared list | **Refuses to silently treat unannotated images as "confirmed empty"** |
| `01` clean | Remove corrupt files; exact + near-duplicate removal (MD5 + average-hash) | |
| `02` convert | Pascal VOC XML and COCO JSON → YOLO `.txt`; skip if already YOLO (e.g. Roboflow export) | |
| `03` augment | Flip, 90°/270° rotation, brightness, centre-zoom — **bounding boxes transformed and verified numerically against pixel centroids, not visually** | |
| `04` split | 70/15/15 train/val/test in Ultralytics layout + auto-generated `data.yaml` | |
| `05` stats | Written report: split breakdown, per-class balance, annotation-density charts | |

- **P-21.1** Aerial-perspective training data SHALL be captured or synthesised at the **operational GSD range (2.8–4.3 mm/px, §7.2)**. A model trained only on close-range imagery will not transfer to 4 m nadir. This is the most likely cause of a field-vs-benchmark gap.
- **P-21.2** The Kaggle negative set SHALL be included in every training run. Omitting hard negatives is the fastest route to unusable field precision.

### 21.3 Model pipeline

- **P-21.3** Train YOLOv8n on the RTX 4050 → export ONNX **opset 12** → compile the TensorRT FP16 `.engine` **natively on the target Nano** (P-9.6).
- **P-21.4** Every artifact SHALL carry a checkpoint hash recorded in session metadata and every report (P-16.2).
- **P-21.5** Validate on a held-out test split **and** on real aerial frames from the actual rig. Benchmark metrics alone do not qualify a model for field use.

### 21.4 Recall asymmetry (S3 §9, normative)

> **A missed detection is a safety failure. A false positive is an analyst annoyance.**

- **P-21.6** Model selection, threshold tuning, and augmentation SHALL be optimised for **recall**, accepting lower precision. Report both, and state the asymmetry explicitly.
- **P-21.7** `visualConfidenceThreshold` SHALL default **low (0.50)**. The dual-sensor confirmation gate (§10) — not the visual threshold — is what controls false positives. This is the entire architectural point: **the camera is allowed to be trigger-happy because the metal detector is the gate.**

### 21.5 Licensing

- **P-21.8** Datasets under CC BY 4.0 or similar SHALL be attributed in the final report and repository. Attribution is a licence obligation, not a courtesy.

---

## 22. Non-Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| P-22.1 | Visual recall ≥ 94.2% on the held-out test split | S1 §5.1 |
| P-22.2 | `achievedFps ≥ 1.5 × FPS_required` for configured altitude and speed | §7.3 |
| P-22.3 | Confirmed detection → dashboard ≤ 3 s (link permitting) | S1 §5.1 |
| P-22.4 | Telemetry render latency ≤ 1 s | S1 §5.1 |
| P-22.5 | Localization ≤ 3.5 m CEP95 at 4 m AGL with `fix_3d`, HDOP ≤ 1.5 | §7.6 |
| P-22.6 | Detection register query ≤ 500 ms p95 over 100 sessions | S1 §5.1 |
| P-22.7 | Report generation ≤ 60 s | S3 §5.1 |
| P-22.8 | Safe-path A* ≤ 3 s over a 1 ha, 0.5 m grid | derived |
| P-22.9 | Zero confirmed-data loss across link interruption (on-drone cache + idempotent reconciliation) | S1 REQ-4.4 |
| P-22.10 | Dashboard runs in current Chrome, Firefox, Edge on Windows/macOS/Linux | S1 §2.4 |
| P-22.11 | Basemap tiles and fonts SHALL work fully offline (pre-packaged tiles, self-hosted fonts) | field reality |
| P-22.12 | Ground station operates within 8 GB RAM alongside DB and backend | S1 §2.5 |
| P-22.13 | Jetson software autostarts on power-up via `systemd` (`Type=idle`) | S1 Phase 5 |
| P-22.14 | Modular pipeline — capture/detect/fuse/store/report independently replaceable (e.g. swap to thermal) without redesign | S1 §5.4 |
| P-22.15 | WCAG 2.1 AA: contrast ≥ 4.5:1; status and risk never colour-alone | §20.5 |
| P-22.16 | Graceful degradation on camera fault, GPS loss, metal-sensor offline, DB outage — with an explicit operator-visible alert in every case | S1 §5.4 |

---

## 23. Safety, Security, Ethics & Legal

### 23.1 Safety

- **P-23.1** Zero ground personnel inside the hazardous zone during operation (S1 §5.2).
- **P-23.2** Stand-off operation at all times; the operator never enters the survey area.
- **P-23.3** Fail-safe behaviour (RTL / controlled landing) on link loss, low battery, or critical sensor fault is **ArduPilot's responsibility**, configured in Mission Planner — not TerraVigil's. The dashboard **reports** fail-safe state; it never triggers it (§2.3).
- **P-23.4** A documented pre-flight checklist SHALL be mandatory, including metal-detector calibration (P-9.19), coil standoff verification, and payload power isolation.
- **P-23.5** Every risk band, confidence, and uncertainty radius SHALL be visible wherever a detection is shown, so no clearance decision can be made on unconfirmed or unqualified data (S1 §5.2).
- **P-23.6** Reproduce all flight-logic changes in **SITL before touching the real airframe** (S3 §10). Costs nothing; catches most mission-sequencing and failsafe bugs.

### 23.2 The clearance non-claim (absolute)

- **P-23.7** TerraVigil is a **survey and decision-support aid**. It does not perform, certify, or claim land release under IMAS. No output SHALL state or imply that ground is clear, safe, or released.
- **P-23.8** The words *clear, cleared, safe, secure, mine-free, all clear* SHALL NOT appear in any UI string, report sentence, or LLM output referring to ground. Enforced by lint (P-20.14) and by the report render gate (P-16.13).
- **P-23.9** Every map and report page carrying coverage SHALL bear the SWEPT ≠ CLEARED notice (P-12.11).
- **P-23.10** Rationale for the whole section: a survey tool mistaken for a clearance certificate kills people. This is the single highest-severity failure mode in the product, and it is a *wording* failure, not a technical one.

### 23.3 Security

- **P-23.11** All operator traffic over HTTPS/TLS. Authentication enforced on every request (S1 §5.3).
- **P-23.12** Passwords hashed with Argon2id. No credentials, keys, or tokens in the frontend bundle or the repo.
- **P-23.13** **Confirmed-mine coordinates are security-sensitive.** Every read SHALL be audit-logged with actor, timestamp, session, and detection IDs (P-3.2).
- **P-23.14** Export (CSV/GeoJSON/PDF) SHALL be role-gated and audit-logged.
- **P-23.15** The ingestion endpoints (`/ingest/*`) SHALL require a service token distinct from operator credentials.
- **P-23.16** The SiK link is unauthenticated by default. Treat all ingested data as untrusted: validate ranges, reject implausible coordinates, rate-limit. Document link spoofing as an accepted residual risk for a research prototype.

### 23.4 Legal & ethical

- **P-23.17** UAV flight permissions are the deploying organisation's responsibility; altitude and boundary limits are operational constraints (S1 §2.5).
- **P-23.18** Mission data belongs to the deploying organisation; shared externally only with authorised humanitarian partners (S1 §5.5).
- **P-23.19** Dataset licence attribution in the report and repo (P-21.8).
- **P-23.20** The base paper (Heuschmid et al., IEEE Access 2025) SHALL be cited wherever its metrics are quoted, with the explicit note that **its results are thermographic and our RGB pipeline is not directly comparable** (§26 R-01).

---

## 24. Test & Acceptance Plan

### 24.1 Bench (no flight)

| ID | Test | Pass criterion |
|---|---|---|
| T-01 | GStreamer IMX708 downscale on the Nano | Sustained at `inferenceWidthPx`, **no OOM** on 4 GB (S1 Phase 4) |
| T-02 | TensorRT FP16 tiled inference throughput | `achievedFps ≥ 1.5 × FPS_required` at 4 m / 3 m/s (P-7.4) |
| T-03 | **Coil standoff & swath characterisation** | Measured values written to `config/sensing.yaml` (**P-7.18 — blocks all field testing**) |
| T-04 | Motor-RPM baseline drift | Residual < 20% of `adcSpan` after compensation (P-9.16) |
| T-05 | Arduino serial protocol integrity | CRC + sequence detect 100% of injected corruptions (P-9.17) |
| T-06 | MAVLink time sync | Monotonic↔GPS offset drift < 50 ms over 15 min (§8.1) |
| T-07 | Read-only MAVLink audit | **Static analysis proves zero command-emitting calls in the codebase** (P-2.1) |
| T-08 | Fusion truth table | `classify()` unit tests cover all four rows of §10.2 |
| T-09 | Risk formula | All six §11.5 worked examples reproduce exactly |
| T-10 | Zero-Noise enforcement | Each of the seven §10.5 points independently blocks an unconfirmed detection from the mine list |
| T-11 | Copy-law lint | Forbidden vocabulary fails the build in UI strings and report render |
| T-12 | Dataset augmentation | Bounding boxes verified **numerically** against pixel centroids (S3 §9 stage 03) |

### 24.2 Ground-based system tests (drone powered, not flying)

| ID | Test | Pass criterion |
|---|---|---|
| T-13 | Walk the rig over an inert metal target at survey altitude | Metal hit **absent** — proves §7.7 and validates the two-pass necessity |
| T-14 | Walk the rig over the target at ≤ 0.4 m | Metal hit present, `standoffExceeded = false` |
| T-15 | Two-pass end-to-end on an inert replica | `unconfirmed_visual` after pass 1, upgraded to `confirmed` after pass 2 (P-10.15) |
| T-16 | UDP micro-packet delivery over SiK at range | ≥ 95% event delivery; thumbnail latency ≤ 3 s |
| T-17 | Link-loss and recovery | Zero confirmed-data loss; idempotent reconciliation (P-9.27) |
| T-18 | Metal sensor unplugged mid-session | `METAL_SENSOR_OFFLINE` raised; **no new `confirmed` detections** (P-9.18) |
| T-19 | GPS degraded (shielded antenna) | `localizationUncertaintyM` inflates; cells marked degraded; risk band **unchanged** (P-11.2) |

### 24.3 Field acceptance (flight, controlled test area, inert replicas)

| ID | Test | Pass criterion |
|---|---|---|
| T-20 | Survey pass over a 20 × 20 m plot with 5 inert replicas | ≥ 4 of 5 appear as visual candidates (recall ≥ 80% at demo scale) |
| T-21 | Confirmation pass over each candidate | Metal-cased replicas → `confirmed`; non-metallic → remain `unconfirmed_visual` |
| T-22 | Coverage output | `visualSweptAreaM2` within 15% of hand-measured; `dualSweptAreaM2` reported separately (P-12.3) |
| T-23 | Localization | Each confirmed position within its own stated CEP95 of surveyed truth (P-22.5) |
| T-24 | Full demo chain | All 13 §1.4 success criteria in one continuous session |
| T-25 | Report audit | Every number in the PDF traceable to a database record; §2 limitations present; appendices correctly labelled |
| T-26 | Endurance | Coverage per battery ≥ 0.35 ha at 4 m (P-7.19) |

---

## 25. Timeline (12 weeks — S3 §11, amended)

| Weeks | Focus | Amendments vs S3 |
|---|---|---|
| **1–2** | Scope lock, dataset sourcing, architecture, repo. ESC/compass calibration, Mission Planner setup on the ZD550 | **+ T-03 coil characterisation — do this now; it gates everything (P-7.18)** |
| **3–4** | Jetson setup (JetPack 4.6, GStreamer camera pipeline); backend + PostGIS schema skeleton | **Autonomous grid scripting DROPPED (C-01). Replaces with: Arduino + ADS1115 metal-detector subsystem (M2) and MAVLink read-only time sync (M3)** |
| **5–6** | Train/fine-tune YOLOv8n, export TensorRT; geotagging + error budget; dashboard skeleton with map | **+ M5 fusion three-state classifier and M6 risk formula — the thesis, not a late add** |
| **7–8** | RAG pipeline (IMAS ingestion + retrieval QA); LLM chat in dashboard | unchanged |
| **9–10** | Agent layer (CrewAI: report / analyst / doctrine); dashboard feature integration; **M7 coverage from flown track** | Coverage moved earlier — it is a headline deliverable (S4) |
| **11** | End-to-end integration, WeasyPrint PDF, UI polish, safe-path planner (test against synthetic hazard data first) | unchanged |
| **12** | Testing, demo video, documentation, final presentation | **Lead with: three-state fusion + risk bands + Grad-CAM + safe-path planner** |

**Critical-path warning:** T-03 (coil standoff measurement) is in week 1–2 deliberately. If the measured standoff is worse than 0.15 m, the two-pass workflow needs rethinking and the whole confirmation thesis is at risk. **Find that out in week 2, not week 10.**

---

## 26. Risk Register

| ID | Risk | Sev | Mitigation |
|---|---|---|---|
| **R-01** | **Base-paper metrics are thermographic, ours is RGB.** Quoting 97%/94.2% as if comparable is a credibility hazard | High | Always state the modality difference (P-23.20). Our RGB targets are our own. |
| **R-02** | **Coil standoff too short even for the confirmation pass** (< 0.15 m ⇒ unsafe hover height) | **Critical** | T-03 in week 2. Fallbacks: larger coil (more depth, less small-object sensitivity); tethered pendulum coil; or pivot to visual-only with the three-state model preserved and confirmation reframed as operator+VLM review |
| **R-03** | **Jetson Nano P3450 is NVIDIA-EOL at JetPack 4.6 / CUDA 10.2, no Tensor Cores.** "The single most likely thing to silently eat a week" (S3 §10) | High | Pin an older Jetson-compatible Ultralytics/PyTorch release. Budget real setup time in weeks 3–4. Do not chase current versions. |
| **R-04** | Tiled inference too slow in practice | Med | P-7.5 alert path already handles it: reduce speed, reduce altitude, or reduce tile count. Never silently under-sample. |
| **R-05** | SiK bandwidth insufficient even for thumbnails | Med | Reduce to 96×96 q50; increase air rate to 128 kbps at range cost; accept Tier-2-only imagery |
| **R-06** | Soil mineralization causes metal false positives | Med | Rolling baseline (P-9.13) + per-site recalibration (S1 Phase 6). The AND gate suppresses the rest. |
| **R-07** | Model trained on close-range data fails at 4 m nadir | High | P-21.1 — operational-GSD training data. Validate on real rig frames (P-21.5). |
| **R-08** | Georeferencing error understated in presentation | High | P-7.13 uncertainty circles everywhere; §16.3 uncertainty on every printed coordinate |
| **R-09** | **A reader mistakes a coverage map for a clearance certificate** | **Critical** | §23.2 in full — lint gate, render gate, persistent notice. Highest-severity failure mode in the product. |
| **R-10** | Dataset licence non-compliance | Low | P-21.8 attribution |
| **R-11** | Scope creep back into mission planning | Med | §2.2 is a hard fence. P-20.4 forbids the route. Any PR reintroducing it is rejected. |
| **R-12** | LLM fabricates a number or a safety claim in a report | High | Template-injected numerics only (P-16.14); regex render gate (P-16.13); temperature 0 |
| **R-13** | One battery ≈ one hectare with no reserve | Med | P-7.19 budget of 0.35 ha/battery; plan ≥ 2 batteries per hectare (P-7.21) |
| **R-14** | Hardware damage during flight testing | Med | SITL first, always (P-23.6) |

---

## 27. Open Questions

Blocking items are marked. Everything else has a stated default that implementation may proceed on.

| # | Question | Default assumed | Blocking? |
|---|---|---|---|
| 1 | **Measured coil standoff and swath?** | 0.15–0.40 m / 0.16 m estimated | **YES — T-03, week 2** |
| 2 | Final YOLO class list and labels | Provisional catalog, served from `/catalog/detection-classes` | No |
| 3 | Camera: USB or CSI, and which lens? | Camera Module 3 / IMX708, standard 75° lens | No — swap the FOV constants |
| 4 | Basemap tiles: which source, packaged offline how? | OpenStreetMap tiles, pre-packaged for the test site | No — but needed before field use (P-22.11) |
| 5 | LLM provider and deployment (API vs local) | Claude or GPT API; ground laptop has an RTX 4050 for local fallback | No |
| 6 | Ground-side VLM checkpoint for candidate validation | INT4-quantised, advisory only (P-11.9) | No |
| 7 | IMAS corpus: which documents, which versions? | Core IMAS series + project guides | No — but citations need real versions |
| 8 | Data retention and export policy | Per-organisation, all sessions retained, export audit-logged | No |
| 9 | Deployment target: browser only, or packaged app later? | Browser only in v1 (S3 §2.2 cuts mobile) | No |
| 10 | Product name in the repo: TerraVigil or SafeMine? | **TerraVigil** product, SafeMine codename (C-11) | No — cosmetic |
| 11 | Does SRS v1.1 get amended, or do deviations live only here? | **Amend the SRS** — it is a graded document (§0.2) | No, but do it |
| 12 | Session UTM zone: auto-derive or operator-set? | Auto-derive from the first valid GPS fix, stored on the session | No |

---

## 28. Traceability

### 28.1 SRS requirement → PRD disposition

| SRS | Requirement | Disposition |
|---|---|---|
| REQ-1.1 | Secure login before mission planning | **Kept** — §19.1 route 1, P-23.11 |
| REQ-1.2 | Interactive map for survey-area selection | **REMOVED** — C-02, P-20.4 |
| REQ-1.3 | Configure altitude, boundaries, confidence thresholds | **Partially kept** — thresholds and nominal altitude are session config (§8.2); *boundaries* removed with C-02 |
| REQ-1.4 | Auto-generate autonomous flight path | **REMOVED** — C-01, C-02 |
| REQ-1.5 | Reject invalid parameters with a descriptive error | **Kept** — applies to session config; P-19.4 |
| REQ-2.1 | Continuous CSI video stream during missions | **Kept** — M1, §9.1 |
| REQ-2.2 | Real-time YOLOv8n inference on the Jetson | **Kept, re-quantified** — C-08, §7.3 (tiled, rate set by ground sampling) |
| REQ-2.3 | Bounding box, class label, confidence per detection | **Kept** — §8.2 `VisualCandidate` |
| REQ-2.4 | Discard detections below the confidence threshold | **Kept** — P-9.8 |
| REQ-2.5 | Detection continues without operator intervention | **Kept** — detection is automatic; *flight* is manual (C-01) |
| REQ-3.1 | Unified sensor-fusion module | **Kept** — M5, §10 |
| REQ-3.2 | Confirm only when visual **and** metallic agree | **Kept — core thesis** — P-10.2 |
| REQ-3.3 | Geotag every confirmed detection | **Kept, strengthened** — with mandatory uncertainty (P-7.12) |
| REQ-3.4 | Do not store unconfirmed visual detections as mine records | **Kept in intent, refined** — retained on separate layers and appendices, never as mine records (P-10.5) |
| REQ-3.5 | Triangulated correlation for high-confidence marking | **Kept** — §10.3, §10.4 |
| REQ-4.1 | Store frame ref, GPS, confidence, timestamp | **Kept, extended** — plus classification, risk, uncertainty, audit (§8.2) |
| REQ-4.2 | Automatic full flight-telemetry logging | **Kept** — M3, `TrackPoint` |
| REQ-4.3 | Persistent historical mission archives | **Kept** — `/sessions` archive |
| REQ-4.4 | Cache on-drone and sync after link loss | **Kept** — P-9.26, P-9.27 |
| REQ-5.1 | Downloadable Ground Analysis PDF per mission | **Kept, structure mandated** — §16.2 |
| REQ-5.2 | Risk-based heatmaps from confirmed geotagged detections | **Kept and finally defined** — §11 (risk was undefined in the SRS) |
| REQ-5.3 | Real-time monitoring: live HD video, map, telemetry | **Partially removed** — map and telemetry kept; **live HD video CUT** (C-05, §7.4, physics) |
| REQ-5.4 | Natural-language AI assistant over mission data | **Kept, extended** — M10 + M12 voice, with mandatory citation |
| REQ-5.5 | Post-mission analytics over historical data | **Kept** — `/analytics` |
| §5.1 | ">15 FPS" (SDLC Phase 4) | **REPLACED** — C-08, P-7.4 |
| §5.2 | Zero ground personnel; stand-off; fail-safe | **Kept** — §23.1; fail-safe is ArduPilot's, reported not triggered (P-23.3) |
| §5.3 | Secured DB, auth, roles, encryption, auditable geolocation | **Kept** — §23.3 |
| §5.5 | Business rules | **Kept** — with the clearance non-claim added (§23.2) |

### 28.2 New requirements not in the SRS — carry into v1.1

| PRD | Addition | Why |
|---|---|---|
| §7 | Altitude ceiling from GSD; ground-sampling-rate requirement; link budget; error budget; coil standoff; endurance budget | The SRS specified no sensing physics. Without it the system is not buildable. |
| §7.7 | **Two-pass survey/confirmation workflow** | Single-pass dual-sensor confirmation is physically impossible with an induction coil |
| §10.1 | Transmit gate (OR) vs confirm gate (AND) | Reconciles two SRS statements that appear to contradict |
| §10.2 | **`unresolved_metal` third classification** | A metal hit with no visual candidate is a real, important field outcome (C-12) |
| §11 | **Complete risk model** — normalization, formula, bands, floor, ratchet, audit trail | REQ-5.2 requires risk heatmaps but never defines risk |
| §11.7 | LLM/VLM may never compute or alter risk | Safety invariant |
| §12 | **Coverage derived from flown track; two separate swath coverages; no percentage** | S4's headline requirement; the SRS has no coverage concept |
| §12.5, §23.2 | **SWEPT ≠ CLEARED non-claim** with lint and render enforcement | Highest-severity failure mode (R-09) |
| §13, §14, §15, §17, §18 | Grad-CAM, A* safe-path, RAG copilot, voice, agents | From S3 §5.1 — the five must-have AI features; absent from the SRS |
| §19 | Full API contract | Neither S1 nor S3 specified endpoints |
| §20.5 | Separate colour systems for status and risk | Reusing status tokens for risk is a category error |

---

## 29. Glossary

| Term | Definition |
|---|---|
| **AGL** | Above Ground Level. All operational altitudes in this document are AGL unless marked AMSL. |
| **CEP95** | Circular Error Probable, 95% — the radius within which the true position lies 95% of the time. |
| **Confirmation pass** | Low-altitude (~0.4 m) hover over a visual candidate to sample the metal detector. §7.7 |
| **Confirmed** | A detection with associated visual **and** metallic evidence. The only classification published as a mine. §10.2 |
| **Corroboration count** | Number of independent observations contributing to a detection cluster. §10.4 |
| **Dual-swept** | A coverage cell swept by both camera and metal coil. Will be a tiny fraction of visual-swept. §12.2 |
| **GSD** | Ground Sample Distance — real-world size of one image pixel. Sets the altitude ceiling. §7.1 |
| **IMAS** | International Mine Action Standards. Governs land release, which TerraVigil does not perform. |
| **Risk band** | `high`/`medium`/`low` — evidence strength for a **confirmed** detection. Not a probability, not a confirmation state. §11.4 |
| **Scan session** | One operational period of survey and confirmation at a site. Replaces the SRS's "mission" — there is no plan. §8.2 |
| **Survey pass** | Higher-altitude (~4 m) camera-only sweep producing visual candidates. §7.7 |
| **Swept** | Sensors passed over this ground and observed it. **Not** cleared, not safe. §12.5 |
| **Transmit gate / confirm gate** | OR gate for logging any single-sensor observation; AND gate for calling something a mine. §10.1 |
| **Two-tier imagery** | 160 px thumbnails over the radio in flight; full-resolution reconciled after landing. §7.5 |
| **Unconfirmed visual** | YOLO saw something; the metal detector did not corroborate. **Not a mine.** §10.2 |
| **Unresolved metal** | Metal detected; no visual corroboration. **Not a mine.** May be a buried device or benign debris. §10.2 |
| **Zero-Noise Policy** | Unconfirmed observations are never published as mines. Enforced at seven independent points. §10.5 |

---

**End of TerraVigil Master PRD v2.0**

*Change control: material changes require a version bump, an entry in §0.3 if they resolve a source conflict, and a corresponding SRS v1.1 amendment (§0.2). The §7 sensing budget and §11 risk formula are the two most consequential sections — changes there invalidate downstream acceptance tests.*
