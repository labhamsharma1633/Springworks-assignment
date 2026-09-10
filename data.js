// In-memory seed data. makeSeed() returns a fresh clone for each student's store.
function makeSeed() {
  const candidates = [
    { id: 'C1', name: 'Aarav Gupta' },
    { id: 'C2', name: 'Ishaan Reddy' },
    { id: 'C3', name: 'Diya Rao' },
  ];

  const campaigns = [
    {
      id: 1,
      name: 'Standard Reference Check',
      steps: [
        { dayOffset: 0, subject: 'Initial Request' },
        { dayOffset: 3, subject: 'Reminder 1' },
        { dayOffset: 7, subject: 'Reminder 2' },
      ],
    },
  ];

  const enrollments = [];

  return {
    candidates,
    campaigns,
    enrollments,
    nextCampaignId: campaigns.length + 1,
    nextEnrollmentId: 1,
  };
}

module.exports = { makeSeed };
