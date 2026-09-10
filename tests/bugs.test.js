/**
 * Test Suite: Automated Bug Verification for Campaign Cadence Engine (App 15)
 * 
 * Each test corresponds directly to one of the 7 confirmed bugs from Phase 1.
 * As required by Phase 2, each test asserts expected specification behavior
 * and FAILS against the unpatched codebase.
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../server');

describe('Campaign Cadence Engine - Phase 2 Bug Catching Suite', () => {

  /**
   * Bug 1: POST /api/enroll — wrong-status-code
   * Expected: HTTP 201 Created on successful enrollment creation.
   * Actual: HTTP 200 OK.
   */
  describe('1. POST /api/enroll — wrong-status-code', () => {
    it('should return HTTP 201 Created when a new enrollment is successfully created', async () => {
      const client = request.agent(app);
      const res = await client.post('/api/enroll').send({
        campaignId: 1,
        candidateId: 'C1',
        enrolledOn: '2026-07-20',
      });

      // Specification requires 201 Created for POST /api/enroll
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.campaignId).toBe(1);
    });
  });

  /**
   * Bug 2: GET /api/schedule/:enrollmentId — wrong-date-time-handling
   * Expected: Step date = enrolledOn + dayOffset days (e.g. 2026-09-10 + 0 => 2026-09-10).
   * Actual: Calculates dates one day later (2026-09-11 for dayOffset 0).
   */
  describe('2. GET /api/schedule/:enrollmentId — wrong-date-time-handling', () => {
    it('should calculate step dates starting on enrolledOn date without adding an off-by-one extra day', async () => {
      const client = request.agent(app);
      const enrollRes = await client.post('/api/enroll').send({
        campaignId: 1,
        candidateId: 'C2',
        enrolledOn: '2026-09-10',
      });
      const enrollmentId = enrollRes.body.id;

      const res = await client.get(`/api/schedule/${enrollmentId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('steps');
      expect(res.body.steps.length).toBeGreaterThanOrEqual(3);

      // Campaign 1 steps have dayOffset: 0, 3, 7
      // For enrolledOn = 2026-09-10:
      // dayOffset 0 => 2026-09-10
      // dayOffset 3 => 2026-09-13
      // dayOffset 7 => 2026-09-17
      expect(res.body.steps[0].date).toBe('2026-09-10');
      expect(res.body.steps[1].date).toBe('2026-09-13');
      expect(res.body.steps[2].date).toBe('2026-09-17');
    });
  });

  /**
   * Bug 3: POST /api/enroll — missing-boundary-check
   * Expected: Reject future enrolledOn date with HTTP 400 Bad Request.
   * Actual: Accepts future date and returns HTTP 200 OK.
   */
  describe('3. POST /api/enroll — missing-boundary-check', () => {
    it('should reject an enrollment with an enrolledOn date in the future with HTTP 400 Bad Request', async () => {
      const client = request.agent(app);
      const res = await client.post('/api/enroll').send({
        campaignId: 1,
        candidateId: 'C3',
        enrolledOn: '2099-12-31',
      });

      // Future dates are invalid according to specification
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  /**
   * Bug 4: POST /api/enroll — missing-reference-or-state-check
   * Expected: Reject duplicate active enrollment for same candidate and campaign with HTTP 400.
   * Actual: Allows duplicate enrollment with HTTP 200 OK.
   */
  describe('4. POST /api/enroll — missing-reference-or-state-check', () => {
    it('should reject enrolling a candidate who already has an active enrollment in the same campaign with HTTP 400', async () => {
      const client = request.agent(app);

      // Create initial active enrollment
      await client.post('/api/enroll').send({
        campaignId: 1,
        candidateId: 'C1',
        enrolledOn: '2026-07-20',
      });

      // Attempt duplicate enrollment while previous is still active (replied = false)
      const duplicateRes = await client.post('/api/enroll').send({
        campaignId: 1,
        candidateId: 'C1',
        enrolledOn: '2026-07-21',
      });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body).toHaveProperty('error');
    });
  });

  /**
   * Bug 5: POST /api/campaigns — missing-boundary-check
   * Expected: Reject negative dayOffset (< 0) with HTTP 400 Bad Request.
   * Actual: Accepts negative dayOffset and returns HTTP 201 Created.
   */
  describe('5. POST /api/campaigns — missing-boundary-check', () => {
    it('should reject campaign creation if any step has dayOffset < 0 with HTTP 400 Bad Request', async () => {
      const client = request.agent(app);
      const res = await client.post('/api/campaigns').send({
        name: 'Invalid Campaign with Negative Offset',
        steps: [
          { dayOffset: -1, subject: 'Negative Offset Step' },
        ],
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  /**
   * Bug 6: UI — wrong-format-display
   * Expected: Schedule step dates displayed in DD-MM-YYYY format (e.g. 10-09-2026).
   * Actual: Displays dates in YYYY-MM-DD format (e.g. 2026-09-10).
   */
  describe('6. UI — wrong-format-display', () => {
    it('should display schedule step dates in DD-MM-YYYY format instead of YYYY-MM-DD in UI schedule view', async () => {
      const appJsContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

      const createMockElement = () => ({
        innerHTML: '',
        textContent: '',
        value: '',
        appendChild: () => {},
        addEventListener: () => {},
        querySelectorAll: () => [],
      });

      const mockScheduleElement = createMockElement();

      const mockDoc = {
        getElementById: (id) => (id === 'scheduleView' ? mockScheduleElement : createMockElement()),
        createElement: () => createMockElement(),
        querySelectorAll: () => [],
      };

      const mockScheduleData = {
        enrollmentId: 1,
        replied: false,
        repliedOn: null,
        steps: [
          { dayOffset: 0, subject: 'Initial Request', date: '2026-09-10' },
        ],
        nextDue: { dayOffset: 0, subject: 'Initial Request', date: '2026-09-10' },
      };

      const mockFetch = jest.fn().mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/schedule/')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockScheduleData,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      });

      // Avoid auto-executing init() at the end during test evaluation
      const sanitizedJs = appJsContent.replace(/\binit\(\);?\s*$/, '');
      const contextFn = new Function('document', 'fetch', `
        ${sanitizedJs}
        return viewSchedule;
      `);

      const viewScheduleFn = contextFn(mockDoc, mockFetch);
      await viewScheduleFn(1);

      // Extract the rendered date from the generated HTML table
      const dateMatch = mockElement => mockElement.innerHTML.match(/<td>(.*?)<\/td><td>(.*?)<\/td><td>/);
      const match = dateMatch(mockScheduleElement);
      expect(match).not.toBeNull();
      const renderedDate = match[2].trim();

      // The UI specification mandates DD-MM-YYYY format (e.g. "10-09-2026")
      // Fails on buggy UI because it renders "2026-09-10"
      expect(renderedDate).toMatch(/^\d{2}-\d{2}-\d{4}$/);
      expect(renderedDate).toBe('10-09-2026');
    });
  });

  /**
   * Bug 7: GET /api/schedule/:enrollmentId — wrong-status-code
   * Expected: HTTP 404 Not Found for nonexistent enrollment.
   * Actual: HTTP 200 OK with body null.
   */
  describe('7. GET /api/schedule/:enrollmentId — wrong-status-code', () => {
    it('should return HTTP 404 Not Found when requested enrollment does not exist', async () => {
      const client = request.agent(app);
      const res = await client.get('/api/schedule/99999');

      expect(res.status).toBe(404);
    });
  });

});
