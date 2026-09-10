# Bug Fix Report — Campaign Cadence Engine (App 15)

This report details the root cause, resolution, code changes, and verification for all 7 confirmed bugs identified during testing.

---

## 📑 Summary of Resolved Bugs

| Bug # | Defect Category | Affected Endpoint / UI | Summary of Issue | Status |
|---|---|---|---|---|
| **1** | `wrong-status-code` | `POST /api/enroll` | Returned `200 OK` instead of `201 Created` upon successful enrollment. | ✅ **FIXED** |
| **2** | `wrong-date-time-handling` | `GET /api/schedule/:enrollmentId` | Computed step dates with an extra `+1` day offset. | ✅ **FIXED** |
| **3** | `missing-boundary-check` | `POST /api/enroll` | Accepted `enrolledOn` dates in the future. | ✅ **FIXED** |
| **4** | `missing-reference-or-state-check` | `POST /api/enroll` | Allowed duplicate active enrollments for the same candidate. | ✅ **FIXED** |
| **5** | `missing-boundary-check` | `POST /api/campaigns` | Accepted campaign steps with negative `dayOffset` (`< 0`). | ✅ **FIXED** |
| **6** | `wrong-format-display` | UI (`#scheduleView`) | Rendered step dates in `YYYY-MM-DD` instead of `DD-MM-YYYY`. | ✅ **FIXED** |
| **7** | `wrong-status-code` | `GET /api/schedule/:enrollmentId` | Returned `200 OK` (with body `null`) for nonexistent IDs instead of `404 Not Found`. | ✅ **FIXED** |

---

## 🔍 Detailed Bug Fix Breakdown

### 1. POST /api/enroll — Wrong Status Code
- **Issue**: Endpoint returned HTTP `200 OK` on successful resource creation.
- **Specification Requirement**: A successful creation on `POST /api/enroll` must return HTTP `201 Created`.
- **Root Cause**: Hardcoded `res.status(200).json(enrollment)` in route handler.
- **Code Fix** (`server.js`):
```diff
-  res.status(200).json(enrollment);
+  res.status(201).json(enrollment);
```

---

### 2. GET /api/schedule/:enrollmentId — Wrong Date/Time Handling
- **Issue**: Step dates were calculated 1 day later than expected (e.g. `2026-09-10` with `dayOffset: 0` became `2026-09-11`).
- **Specification Requirement**: Step date must equal `enrolledOn + dayOffset` days.
- **Root Cause**: Faulty date helper was adding `n + 1` instead of `n`:
  ```javascript
  const shifted = n + 1;
  const newDay = d + shifted;
  ```
- **Code Fix** (`server.js`):
```diff
-function addDays(dateStr, n) {
-  const [y, m, d] = dateStr.split('-').map(Number);
-  const shifted = n + 1;
-  const newDay = d + shifted;
-  return `${y}-${String(m).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
-}
+function addDays(dateStr, n) {
+  const date = new Date(dateStr + 'T00:00:00Z');
+  date.setUTCDate(date.getUTCDate() + n);
+  return date.toISOString().slice(0, 10);
+}
```

---

### 3. POST /api/enroll — Missing Boundary Check (Future Date)
- **Issue**: The API permitted enrollment with an `enrolledOn` date in the future.
- **Specification Requirement**: Enrollment dates in the future must be rejected with HTTP `400 Bad Request`.
- **Root Cause**: No date comparison against `todayStr()`.
- **Code Fix** (`server.js`):
```diff
+  if (enrolledOn > todayStr()) {
+    return res.status(400).json({ error: 'enrolledOn date cannot be in the future' });
+  }
```

---

### 4. POST /api/enroll — Missing State Check (Duplicate Active Enrollment)
- **Issue**: A candidate could be enrolled multiple times into the same campaign while an active (unreplied) enrollment was already in progress.
- **Specification Requirement**: Duplicate active enrollments must be rejected with HTTP `400 Bad Request`.
- **Root Cause**: Missing lookup against `req.store.enrollments` before inserting.
- **Code Fix** (`server.js`):
```diff
+  const existingActive = req.store.enrollments.find(
+    (e) => e.campaignId === campaign.id && e.candidateId === candidateId && !e.replied
+  );
+  if (existingActive) {
+    return res.status(400).json({ error: 'Candidate already has an active enrollment in this campaign' });
+  }
```

---

### 5. POST /api/campaigns — Missing Boundary Check (Negative Day Offset)
- **Issue**: The campaign creation endpoint accepted negative `dayOffset` (e.g. `-1`).
- **Specification Requirement**: `dayOffset` must be greater than or equal to `0`.
- **Root Cause**: Validation only verified `typeof s.dayOffset !== 'number'`, omitting `>= 0`.
- **Code Fix** (`server.js`):
```diff
-  if (typeof s.dayOffset !== 'number' || !s.subject) {
+  if (typeof s.dayOffset !== 'number' || s.dayOffset < 0 || !s.subject) {
-    return res.status(400).json({ error: 'each step needs a numeric dayOffset and a non-empty subject' });
+    return res.status(400).json({ error: 'each step needs a non-negative numeric dayOffset and a non-empty subject' });
   }
```

---

### 6. UI — Wrong Date Format Display
- **Issue**: Schedule view rendered step dates in `YYYY-MM-DD` (e.g. `2026-09-10`).
- **Specification Requirement**: Schedule step dates must be displayed in `DD-MM-YYYY` format (e.g. `10-09-2026`).
- **Root Cause**: `public/app.js` directly interpolated raw `s.date` into table cells.
- **Code Fix** (`public/app.js`):
```diff
+function formatDate(dateStr) {
+  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return dateStr;
+  const [y, m, d] = dateStr.split('-');
+  return `${d}-${m}-${y}`;
+}

-  return `<tr><td>${s.subject}</td><td>${s.date}</td><td><span class="badge ${badgeClass}">${label}</span></td></tr>`;
+  return `<tr><td>${s.subject}</td><td>${formatDate(s.date)}</td><td><span class="badge ${badgeClass}">${label}</span></td></tr>`;
```

---

### 7. GET /api/schedule/:enrollmentId — Wrong Status Code for Nonexistent ID
- **Issue**: Requesting a nonexistent enrollment ID returned HTTP `200 OK` with payload `null`.
- **Specification Requirement**: Must return HTTP `404 Not Found`.
- **Root Cause**: Handler returned `res.status(200).json(null)`.
- **Code Fix** (`server.js`):
```diff
   const enrollment = req.store.enrollments.find((e) => e.id === Number(req.params.enrollmentId));
   if (!enrollment) {
-    return res.status(200).json(null);
+    return res.status(404).json({ error: 'Enrollment not found' });
   }
```

---

## 🧪 Verification & Test Results

Run all automated tests:
```bash
npm test
```

### Output:
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
