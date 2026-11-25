/* EcoConnect demo data — visual prototype only, no real records. */
const MOCK = {
  stats: { visitorsToday: 412, preRegistered: 335, activeGroups: 14, onSummit: 6 },

  slots: [
    { id: 's1', time: '5:00 AM', label: 'Sunrise trek', booked: 62, cap: 100 },
    { id: 's2', time: '6:00 AM', label: 'Early group', booked: 100, cap: 100 },
    { id: 's3', time: '7:00 AM', label: 'Peak slot', booked: 88, cap: 100 },
    { id: 's4', time: '8:00 AM', label: 'Mid-morning', booked: 54, cap: 100 },
    { id: 's5', time: '9:00 AM', label: 'Late morning', booked: 31, cap: 100 }
  ],

  guides: [
    { id: 'g1', name: 'Kuya Ramil D.', short: 'Ramil', initials: 'RD', cert: 'First Aid · 6 yrs', status: 'Available', week: 4, strong: true },
    { id: 'g2', name: 'Ate Marites S.', short: 'Marites', initials: 'MS', cert: 'First Aid · 4 yrs', status: 'Available', week: 11, strong: false },
    { id: 'g3', name: 'Jun-Jun P.', short: 'Jun-Jun', initials: 'JP', cert: 'First Aid · 3 yrs', status: 'On trail', week: 9, strong: false },
    { id: 'g4', name: 'Lorna M.', short: 'Lorna', initials: 'LM', cert: 'Wilderness · 5 yrs', status: 'On trail', week: 12, strong: false },
    { id: 'g5', name: 'Kuya Ben T.', short: 'Ben', initials: 'BT', cert: 'First Aid · 8 yrs', status: 'Available', week: 7, strong: true },
    { id: 'g6', name: 'Ate Cristy V.', short: 'Cristy', initials: 'CV', cert: 'First Aid · 4 yrs', status: 'On trail', week: 10, strong: false },
    { id: 'g7', name: 'Dodong R.', short: 'Dodong', initials: 'DR', cert: 'Porter · 3 yrs', status: 'Available', week: 6, strong: false },
    { id: 'g8', name: 'Inday L.', short: 'Inday', initials: 'IL', cert: 'First Aid · 2 yrs', status: 'Available', week: 8, strong: false },
    { id: 'g9', name: 'Kuya Nilo A.', short: 'Nilo', initials: 'NA', cert: 'Wilderness · 7 yrs', status: 'Available', week: 5, strong: false },
    { id: 'g10', name: 'Ate Grace B.', short: 'Grace', initials: 'GB', cert: 'First Aid · 3 yrs', status: 'Off duty', week: 9, strong: false }
  ],

  checkpoints: [
    { id: 'gate', name: 'Gate', km: 0, ping: '4s', rssi: -58, guides: 2, status: 'online' },
    { id: 'cp1', name: 'CP1 · Bamboo Grove', km: 1.2, ping: '9s', rssi: -64, guides: 3, status: 'online' },
    { id: 'cp2', name: 'CP2 · Pine Ridge', km: 2.6, ping: '11s', rssi: -71, guides: 2, status: 'online' },
    { id: 'cp3', name: 'CP3 · Mossy Forest', km: 3.8, ping: '12s', rssi: -87, guides: 1, status: 'weak' },
    { id: 'ridge', name: 'Ridge Summit', km: 4.5, ping: '6s', rssi: -69, guides: 2, status: 'online' }
  ],

  bookings: [
    { code: 'EC-2407-118', leader: 'Ramil D. Abas', pax: 8, slot: '7:00 AM', guide: 'Lorna M.', status: 'Confirmed' },
    { code: 'EC-2407-092', leader: 'Marites S. Cruz', pax: 12, slot: '6:00 AM', guide: 'Kuya Ramil D.', status: 'Checked-in' },
    { code: 'EC-2407-121', leader: 'Jun-Jun P. Reyes', pax: 6, slot: '7:00 AM', guide: 'Inday L.', status: 'Confirmed' },
    { code: 'EC-2407-124', leader: 'Cristy V. Lim', pax: 14, slot: '8:00 AM', guide: '', status: 'Pending – Manual Review' },
    { code: 'EC-2407-126', leader: 'Dodong R. Mendez', pax: 5, slot: '8:00 AM', guide: '', status: 'Pending' },
    { code: 'EC-2407-127', leader: 'Nilo A. Bautista', pax: 10, slot: '9:00 AM', guide: 'Kuya Ramil D.', status: 'Confirmed', heavy: true },
    { code: 'EC-2407-130', leader: 'Lorna M. Santos', pax: 9, slot: '9:00 AM', guide: '', status: 'Pending' },
    { code: 'EC-2407-131', leader: 'Ben T. Ubaldo', pax: 4, slot: '5:00 AM', guide: 'Kuya Ramil D.', status: 'Checked-in' },
    { code: 'EC-2407-133', leader: 'Grace B. Tolentino', pax: 11, slot: '5:00 AM', guide: 'Ate Marites S.', status: 'Confirmed' },
    { code: 'EC-2407-140', leader: 'Lorna M. Santos', pax: 9, slot: '5:00 AM', date: '2026-11-23', guide: 'Kuya Ramil D.', status: 'Confirmed' },
    { code: 'EC-2407-141', leader: 'Cristy V. Lim', pax: 6, slot: '6:00 AM', date: '2026-11-24', guide: 'Kuya Ramil D.', status: 'Confirmed', heavy: true }
  ],

  rules: [
    { id: 'R1', name: 'Capacity limit', desc: 'Block a slot once booked seats reach the cap.', threshold: 100, unit: 'pax/slot', on: true },
    { id: 'R2', name: 'Guide availability', desc: 'Assign only guides on duty and not already on trail.', threshold: null, unit: '', on: true },
    { id: 'R3', name: 'Group-to-guide ratio', desc: 'One guide for every 12 visitors in a group.', threshold: 12, unit: 'pax/guide', on: true },
    { id: 'R4', name: 'Heavy baggage', desc: 'Heavy baggage groups get senior certified guides.', threshold: 5, unit: 'kg/pax', on: true },
    { id: 'R5', name: 'Fair rotation', desc: 'Prefer the guide with the fewest weekly assignments.', threshold: null, unit: '', on: true },
    { id: 'R6', name: 'Overflow handling', desc: 'Send oversized or late groups to manual review.', threshold: 14, unit: 'pax/group', on: true }
  ],

  hourly: [42, 96, 88, 71, 63, 52, 38, 27],
  hourLabels: ['5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM'],

  checkins: [
    { time: '12:41 PM', leader: 'Ramil D. Abas', pax: 8, guide: 'Lorna M.' },
    { time: '12:22 PM', leader: 'Marites S. Cruz', pax: 12, guide: 'Kuya Ramil D.' },
    { time: '11:58 AM', leader: 'Nilo A. Bautista', pax: 10, guide: 'Ate Grace B.' },
    { time: '11:40 AM', leader: 'Dodong R. Mendez', pax: 5, guide: 'Inday L.' },
    { time: '11:12 AM', leader: 'Lorna M. Santos', pax: 9, guide: 'Kuya Ben T.' }
  ],

  syncLog: [
    { time: '12:41:08', code: 'EC-2407-118', leader: 'Ramil D. Abas', result: 'Synced' },
    { time: '12:41:22', code: 'EC-2407-092', leader: 'Marites S. Cruz', result: 'Duplicate – flagged' },
    { time: '12:42:03', code: 'EC-2407-127', leader: 'Nilo A. Bautista', result: 'Synced' },
    { time: '12:42:31', code: 'EC-2407-131', leader: 'Ben T. Ubaldo', result: 'Synced' },
    { time: '12:43:10', code: 'EC-2407-133', leader: 'Grace B. Tolentino', result: 'Synced' }
  ],

  sosActive: {
    id: 'SOS-004', person: 'Jun-Jun P. Reyes', role: 'Guide · group of 6',
    location: 'CP3 · Mossy Forest', coords: '8.2841° N, 125.0312° E',
    issue: 'Twisted ankle — cannot walk', time: '12:42 PM',
    battery: 34, rssi: -87, status: 'open'
  },

  pastSos: [
    { id: 'SOS-003', date: 'Nov 15, 2026', person: 'Lorna M. Santos', location: 'CP2 · Pine Ridge', issue: 'Dehydration', response: '8 min', status: 'Resolved' },
    { id: 'SOS-002', date: 'Nov 8, 2026', person: 'Kuya Ben T.', location: 'Ridge Summit', issue: 'Lost trail marker', response: '14 min', status: 'Resolved' },
    { id: 'SOS-001', date: 'Oct 30, 2026', person: 'Visitor · Jun-Jun R.', location: 'CP1 · Bamboo Grove', issue: 'Asthma attack', response: '6 min', status: 'Resolved' }
  ],

  responders: [
    { name: 'Ate Cristy V.', role: 'Guide · on site', eta: 'On site', distance: '0 m' },
    { name: 'Kuya Ben T.', role: 'Guide · CP2', eta: '6 min', distance: '400 m' },
    { name: 'Gate first-aid team', role: 'Rescue team', eta: '18 min', distance: '1.6 km' }
  ]
};

MOCK.bookingsPerDay = { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [42, 51, 38, 60, 74, 96, 88] };

MOCK.lora = { gateway: 'Panimahawa Gateway 01', nodes: 3, delivery: 94, latency: 3.2, uptime: '99.1%', packets: 1284 };

MOCK.groups = [
  { id: 't1', name: 'Ridge trekkers', guide: 'Lorna M.', pax: 8, pos: 2, lastSeen: '9 min ago', rssi: -71, overdue: false, initials: 'RT' },
  { id: 't2', name: 'Sunrise group', guide: 'Kuya Ramil D.', pax: 12, pos: 1, lastSeen: '4 min ago', rssi: -64, overdue: false, initials: 'SG' },
  { id: 't3', name: 'Mossy forest group', guide: 'Jun-Jun P.', pax: 6, pos: 3, lastSeen: '41 min ago', rssi: -87, overdue: true, initials: 'MF' },
  { id: 't4', name: 'Summit group', guide: 'Kuya Ben T.', pax: 10, pos: 4, lastSeen: '2 min ago', rssi: -69, overdue: false, initials: 'SU' },
  { id: 't5', name: 'Bamboo group', guide: 'Ate Cristy V.', pax: 9, pos: 0, lastSeen: '6 min ago', rssi: -58, overdue: false, initials: 'BG' }
];

MOCK.metrics = {
  dispatch: 96, sync: 100, dashboardMs: 180,
  deliveryByCp: [98, 96, 95, 84, 97],
  rssiByCp: [-58, -64, -71, -87, -69],
  latencyByAlert: [2.8, 3.1, 3.2, 2.6, 3.4],
  health: [
    { name: 'API gateway', value: '99.9% uptime', ok: true },
    { name: 'Offline sync queue', value: '0 pending', ok: true },
    { name: 'LoRa node battery', value: 'CP3 · 34%', ok: false },
    { name: 'Last backup', value: 'Today · 6:00 AM', ok: true }
  ]
};

MOCK.guideWeek = [
  { day: 'Mon', status: 'assigned' },
  { day: 'Tue', status: 'off' },
  { day: 'Wed', status: 'assigned' },
  { day: 'Thu', status: 'leave' },
  { day: 'Fri', status: 'off' },
  { day: 'Sat', status: 'assigned' },
  { day: 'Sun', status: 'assigned' }
];

MOCK.guideNotices = [
  { id: 'N-001', guide: 'Dodong R.', date: '2026-11-22', type: 'Sick', reason: 'Fever and body ache', status: 'Pending' },
  { id: 'N-002', guide: 'Inday L.', date: '2026-11-24', type: 'Off-duty', reason: 'Family commitment', status: 'Pending' },
  { id: 'N-003', guide: 'Kuya Ramil D.', date: '2026-11-19', type: 'Leave', reason: 'Barangay health appointment', status: 'Approved' }
];

MOCK.calendar = { capPerDay: 500, loadByWeekday: [97, 55, 61, 68, 74, 82, 94] };

MOCK.trailNodes = [
  { id: 'gw', type: 'gateway', name: 'Gateway', lat: 8.2790, lng: 125.0280, radius: 0, x: 68, y: 358, km: 0 },
  { id: 'n1', type: 'node', name: 'Node 1', lat: 8.2806, lng: 125.0294, radius: 120, x: 300, y: 340, km: 1.2 },
  { id: 'n2', type: 'node', name: 'Node 2', lat: 8.2822, lng: 125.0309, radius: 100, x: 188, y: 214, km: 2.4 },
  { id: 'n3', type: 'node', name: 'Node 3', lat: 8.2838, lng: 125.0323, radius: 80, x: 455, y: 152, km: 3.6 }
];

MOCK.trailSettings = { lostContact: 30 };

MOCK.trailGuides = [
  { id: 'tg1', name: 'Lorna M.', initials: 'LM', pointId: 'n1', minutesAgo: 9 },
  { id: 'tg2', name: 'Kuya Ramil D.', initials: 'RD', pointId: 'n3', minutesAgo: 4 }
];

MOCK.sosHistory = [
  { id: 'SOS-003', time: 'Nov 15 · 9:12 AM', guide: 'Lorna M.', node: 'Near Node 2', gps: 'Yes', status: 'Resolved', responseSec: 160 },
  { id: 'SOS-002', time: 'Nov 8 · 4:05 PM', guide: 'Kuya Ben T.', node: 'Near Node 3', gps: 'Yes', status: 'Resolved', responseSec: 180 },
  { id: 'SOS-001', time: 'Oct 30 · 7:48 AM', guide: 'Ate Cristy V.', node: 'Near Node 1', gps: 'No – unavailable', status: 'Resolved', responseSec: 140 },
  { id: 'SOS-000', time: 'Oct 21 · 10:20 AM', guide: 'Jun-Jun P.', node: 'Near Node 3', gps: 'Yes', status: 'Resolved', responseSec: 200 },
  { id: 'SOS-00A', time: 'Oct 12 · 6:02 AM', guide: 'Kuya Ramil D.', node: 'Near Node 1', gps: 'Yes', status: 'Resolved', responseSec: 120 }
];

window.MOCK = MOCK;
