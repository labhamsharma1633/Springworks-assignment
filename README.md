# Campaign Cadence Engine  Automated Test Suite & Bug Fixes

This repository contains the source code, automated test suite, and bug fixes for **Campaign Cadence Engine (App 15)**.

As part of **Phase 2**, automated tests have been implemented using **Jest** and **Supertest** covering all 7 confirmed bugs. The codebase has also been patched to fix all 7 defects, achieving **100% test pass rate (7/7 passing)**.

---

##  Tech Stack & Tools Used
- **Test Runner / Framework**: [Jest](https://jestjs.io/) (v30)
- **API Testing / HTTP Assertions**: [Supertest](https://github.com/ladjs/supertest) (v7)
- **Runtime Environment**: Node.js / CommonJS
- **Application Server**: Express.js

---

##  Getting Started

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

##  Bug Reports, Test Coverage & Fixes

The test suite in [`tests/bugs.test.js`](./tests/bugs.test.js) verifies and validates all 7 confirmed bugs:

| # | Bug Title | Affected Component / Endpoint | Defect Type | Expected Specification | Fix Implemented |
|---|---|---|---|---|---|
| **1** | Wrong Success Status Code | `POST /api/enroll` | `wrong-status-code` | Returns `201 Created` upon successful enrollment creation. | Updated status code from `200` to `201 Created`. |
| **2** | Off-by-One Day Date Offset | `GET /api/schedule/:enrollmentId` | `wrong-date-time-handling` | Step dates equal `enrolledOn + dayOffset` (e.g. `2026-09-10 + 0` = `2026-09-10`). | Fixed `addDays()` to use standard UTC date arithmetic without `+1` day shift. |
| **3** | Accepts Future Enrollment Dates | `POST /api/enroll` | `missing-boundary-check` | Rejects future enrollment dates with `400 Bad Request`. | Added validation rejecting `enrolledOn > todayStr()` with `400 Bad Request`. |
| **4** | Allows Duplicate Active Enrollment | `POST /api/enroll` | `missing-reference-or-state-check` | Rejects enrolling a candidate already active in the campaign with `400 Bad Request`. | Added check to reject duplicate unreplied enrollment in same campaign with `400 Bad Request`. |
| **5** | Accepts Negative Day Offset | `POST /api/campaigns` | `missing-boundary-check` | Rejects steps with negative `dayOffset` (`< 0`) with `400 Bad Request`. | Added validation ensuring `s.dayOffset >= 0` with `400 Bad Request`. |
| **6** | Wrong Date Format in Schedule View | `UI / scheduleView` | `wrong-format-display` | Displays step dates in `DD-MM-YYYY` format (e.g. `10-09-2026`). | Added `formatDate()` helper to format all dates as `DD-MM-YYYY`. |
| **7** | Wrong Status Code for Missing Enrollment | `GET /api/schedule/:enrollmentId` | `wrong-status-code` | Returns `404 Not Found` when enrollment ID does not exist. | Changed missing enrollment response from `200 null` to `404 Not Found`. |

---

##  Test Execution Results
Running `npm test` executes the complete test suite:

```text
PASS tests/bugs.test.js
  Campaign Cadence Engine - Phase 2 Bug Catching Suite
    1. POST /api/enroll — wrong-status-code
      √ should return HTTP 201 Created when a new enrollment is successfully created (66 ms)
    2. GET /api/schedule/:enrollmentId — wrong-date-time-handling
      √ should calculate step dates starting on enrolledOn date without adding an off-by-one extra day (25 ms)
    3. POST /api/enroll — missing-boundary-check
      √ should reject an enrollment with an enrolledOn date in the future with HTTP 400 Bad Request (11 ms)
    4. POST /api/enroll — missing-reference-or-state-check
      √ should reject enrolling a candidate who already has an active enrollment in the same campaign with HTTP 400 (37 ms)
    5. POST /api/campaigns — missing-boundary-check
      √ should reject campaign creation if any step has dayOffset < 0 with HTTP 400 Bad Request (13 ms)
    6. UI — wrong-format-display
      √ should display schedule step dates in DD-MM-YYYY format instead of YYYY-MM-DD in UI schedule view (5 ms)
    7. GET /api/schedule/:enrollmentId — wrong-status-code
      √ should return HTTP 404 Not Found when requested enrollment does not exist (14 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        1.497 s
```
