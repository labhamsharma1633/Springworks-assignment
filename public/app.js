let campaignsCache = [];
let candidatesCache = [];
let enrollmentsCache = [];
let stepCount = 0;

function addStepRow() {
  stepCount += 1;
  const div = document.createElement('div');
  div.className = 'step-row';
  div.innerHTML = `
    <input type="number" class="dayOffset" placeholder="Day offset">
    <input type="text" class="subject" placeholder="Subject">
  `;
  document.getElementById('stepsList').appendChild(div);
}

document.getElementById('addStepBtn').addEventListener('click', addStepRow);
addStepRow();
addStepRow();

async function loadCampaigns() {
  campaignsCache = await fetch('/api/campaigns').then((r) => r.json());
  const sel = document.getElementById('campaignSelect');
  sel.innerHTML = campaignsCache.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadCandidates() {
  candidatesCache = await fetch('/api/candidates').then((r) => r.json());
  const sel = document.getElementById('candidateSelect');
  sel.innerHTML = candidatesCache.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadEnrollments() {
  enrollmentsCache = await fetch('/api/enrollments').then((r) => r.json());
  const rows = document.getElementById('enrollmentRows');
  rows.innerHTML = '';
  for (const e of enrollmentsCache) {
    const campaign = campaignsCache.find((c) => c.id === e.campaignId);
    const candidate = candidatesCache.find((c) => c.id === e.candidateId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.id}</td>
      <td>${campaign ? campaign.name : e.campaignId}</td>
      <td>${candidate ? candidate.name : e.candidateId}</td>
      <td>${e.enrolledOn}</td>
      <td>${e.replied ? 'Yes' : 'No'}</td>
      <td><button type="button" class="secondary viewBtn" data-id="${e.id}">View</button></td>
      <td><button type="button" class="secondary replyBtn" data-id="${e.id}">Mark Replied</button></td>
    `;
    rows.appendChild(tr);
  }
  document.querySelectorAll('.viewBtn').forEach((b) => b.addEventListener('click', () => viewSchedule(b.dataset.id)));
  document.querySelectorAll('.replyBtn').forEach((b) => {
    const enrollment = enrollmentsCache.find((e) => String(e.id) === b.dataset.id);
    b.disabled = false;
    b.addEventListener('click', () => markReplied(b.dataset.id));
  });
}

function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return dateStr;
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

async function viewSchedule(enrollmentId) {
  const res = await fetch(`/api/schedule/${enrollmentId}`);
  if (!res.ok) {
    const el = document.getElementById('scheduleView');
    el.textContent = 'Enrollment not found.';
    return;
  }
  const body = await res.json();
  const el = document.getElementById('scheduleView');
  if (!body) { el.textContent = 'Enrollment not found.'; return; }
  const today = new Date().toISOString().slice(0, 10);
  const rowsHtml = body.steps.map((s) => {
    let badgeClass = 'badge-upcoming';
    let label = 'Upcoming';
    if (body.nextDue && s.date === body.nextDue.date) { badgeClass = 'badge-next'; label = 'Next Due'; }
    else if (s.date < today) { badgeClass = 'badge-past'; label = 'Upcoming'; }
    return `<tr><td>${s.subject}</td><td>${formatDate(s.date)}</td><td><span class="badge ${badgeClass}">${label}</span></td></tr>`;
  }).join('');
  el.innerHTML = `
    <p>Replied: ${body.replied ? `Yes (on ${formatDate(body.repliedOn)})` : 'No'}</p>
    <p>Next due: ${body.nextDue ? formatDate(body.nextDue.date) : 'None'}</p>
    <table><thead><tr><th>Subject</th><th>Date</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>
  `;
}

async function markReplied(enrollmentId) {
  await fetch(`/api/enroll/${enrollmentId}/reply`, { method: 'POST' });
  loadEnrollments();
  viewSchedule(enrollmentId);
}

document.getElementById('campaignForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('campaignName').value;
  const steps = Array.from(document.querySelectorAll('.step-row')).map((row) => ({
    dayOffset: Number(row.querySelector('.dayOffset').value),
    subject: row.querySelector('.subject').value,
  }));
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, steps }),
  });
  if (res.ok) {
    document.getElementById('campaignName').value = '';
    document.getElementById('stepsList').innerHTML = '';
    addStepRow();
    addStepRow();
    loadCampaigns();
  }
});

document.getElementById('enrollForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    campaignId: document.getElementById('campaignSelect').value,
    candidateId: document.getElementById('candidateSelect').value,
    enrolledOn: document.getElementById('enrolledOn').value,
  };
  await fetch('/api/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
});

async function init() {
  await Promise.all([loadCampaigns(), loadCandidates()]);
  loadEnrollments();
}

// --- Tooling: reset button (not part of the app under test) ---
function showToolingToast(msg) {
  let toast = document.getElementById('toolingToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toolingToast';
    toast.className = 'tooling-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToolingToast._t);
  showToolingToast._t = setTimeout(() => toast.classList.remove('show'), 1500);
}

document.getElementById('resetBtn').addEventListener('click', async () => {
  await fetch('/api/reset', { method: 'POST' });
  await loadCampaigns();
  await loadEnrollments();
  document.getElementById('scheduleView').textContent = 'Select "View" on an enrollment above.';
  showToolingToast('Data reset');
});

init();
