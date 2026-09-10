# Campaign Cadence Engine — Automated Bug Reproduction Test Suite

This repository contains the source code and automated test suite for **Campaign Cadence Engine (App 15)**.

As part of **Phase 2**, automated tests have been implemented using **Jest** and **Supertest** that specifically catch each of the 7 confirmed bugs from Phase 1 by asserting specification requirements and failing against the unpatched application.

---

## 🛠️ Tech Stack & Tools Used
- **Test Runner / Framework**: [Jest](https://jestjs.io/) (v30)
- **API Testing / HTTP Assertions**: [Supertest](https://github.com/ladjs/supertest) (v7)
- **Runtime Environment**: Node.js / CommonJS
- **Application Server**: Express.js

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Application Locally
```bash
npm start
```
The server will start on `http://localhost:3015`.

### 3. Run Automated Tests
```bash
npm test
```

---

## 📋 Bug Reports & Automated Test Coverage

The test suite in [`tests/bugs.test.js`](./tests/bugs.test.js) verifies the 7 confirmed bugs:

| # | Bug Title | Affected Component / Endpoint | Defect Type | Expected Behavior | Actual Behavior in Unpatched App |
|---|---|---|---|---|---|
| **1** | Wrong Success Status Code | `POST /api/enroll` | `wrong-status-code` | Returns `201 Created` upon successful enrollment creation. | Returns `200 OK`. |
| **2** | Off-by-One Day Date Offset | `GET /api/schedule/:enrollmentId` | `wrong-date-time-handling` | Step dates equal `enrolledOn + dayOffset` (e.g., `2026-09-10 + 0` = `2026-09-10`). | Returns `2026-09-11` (+1 day offset). |
| **3** | Accepts Future Enrollment Dates | `POST /api/enroll` | `missing-boundary-check` | Rejects future enrollment dates with `400 Bad Request`. | Accepts future dates with `200 OK`. |
| **4** | Allows Duplicate Active Enrollment | `POST /api/enroll` | `missing-reference-or-state-check` | Rejects enrolling a candidate already active in the campaign with `400 Bad Request`. | Allows duplicate active enrollment with `200 OK`. |
| **5** | Accepts Negative Day Offset | `POST /api/campaigns` | `missing-boundary-check` | Rejects steps with negative `dayOffset` (`< 0`) with `400 Bad Request`. | Accepts `dayOffset: -1` with `201 Created`. |
| **6** | Wrong Date Format in Schedule View | `UI / scheduleView` | `wrong-format-display` | Displays step dates in `DD-MM-YYYY` format (e.g. `10-09-2026`). | Displays dates in `YYYY-MM-DD` format (e.g. `2026-09-10`). |
| **7** | Wrong Status Code for Missing Enrollment | `GET /api/schedule/:enrollmentId` | `wrong-status-code` | Returns `404 Not Found` when enrollment ID does not exist. | Returns `200 OK` with body `null`. |

---

## 🧪 Test Execution Results
Running `npm test` executes the 7 test scenarios. Each test fails specifically at the assertion representing the unpatched defect:
- `Bug 1`: `Expected: 201, Received: 200`
- `Bug 2`: `Expected: "2026-09-10", Received: "2026-09-11"`
- `Bug 3`: `Expected: 400, Received: 200`
- `Bug 4`: `Expected: 400, Received: 200`
- `Bug 5`: `Expected: 400, Received: 201`
- `Bug 6`: `Expected pattern: /^\d{2}-\d{2}-\d{4}$/, Received: "2026-09-10"`
- `Bug 7`: `Expected: 404, Received: 200`
