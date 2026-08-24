(function () {
  'use strict';

  if (window.Dashboard && typeof window.Dashboard.destroy === 'function') {
    window.Dashboard.destroy();
  }

  const moduleConfig = {
    energy: {
      title: 'Energy',
      subtitle: '7-day trend and top opportunities',
      defaultView: 'landing',
      tabs: [
        ['power', 'Power'],
        ['water', 'Water'],
        ['anomaly', 'Flow and Trend Anomaly'],
      ],
    },
    hvac: {
      title: 'HVAC',
      subtitle: 'Live cooling topology and equipment state',
      defaultView: 'system',
      tabs: [],
    },
    spaces: {
      title: 'Spaces',
      subtitle: 'Data hall heat map',
      defaultView: 'heatmap',
      tabs: [['heatmap', 'Heat Map']],
    },
    maintenance: {
      title: 'Maintenance',
      subtitle: 'Maintenance planning and work execution',
      defaultView: 'landing',
      tabs: [['preventive', 'Preventive Maintenance']],
    },
    assets: {
      title: 'Assets',
      subtitle: 'Equipment records and lifecycle context',
      defaultView: 'landing',
      tabs: [
        ['registry', 'Registry'],
        ['workorders', 'Work Orders'],
        ['analytics', 'Analytics'],
        ['rfid', 'RFID'],
        ['documents', 'Documents'],
      ],
    },
    security: {
      title: 'Security',
      subtitle: 'CCTV and access-card operations',
      defaultView: 'cctv',
      tabs: [
        ['cctv', 'CCTV'],
        ['access', 'Access Cards'],
      ],
    },
  };

  const viewData = {
    'energy:power': {
      metrics: [
        ['CURRENT PUE', '1.44', 'Target 1.40 · trailing 15 minutes'],
        ['IT LOAD', '14.9 MW', '49.7% of design capacity'],
        ['FACILITY LOAD', '21.4 MW', 'Peak today 22.1 MW'],
      ],
      chart: ['FACILITY LOAD · LAST 24 HOURS', 'line'],
      bars: ['HOURLY CONSUMPTION · MWh', [42, 48, 51, 47, 54, 61, 68, 71, 66, 63, 75, 82, 76, 70, 65, 61, 58, 64]],
      table: [
        ['Distribution', 'Load', 'Capacity', 'Status'],
        [
          ['Utility incomer A', '10.9 MW', '15 MW', 'normal'],
          ['Utility incomer B', '10.5 MW', '15 MW', 'normal'],
          ['UPS distribution', '14.9 MW', '24 MW', 'normal'],
          ['Cooling plant', '5.2 MW', '8 MW', 'watch'],
        ],
      ],
    },
    'energy:water': {
      metrics: [
        ['WATER TODAY', '128 m³', 'Cooling makeup · to 13:00'],
        ['CURRENT FLOW', '8.7 m³/h', 'Within expected operating band'],
        ['WUE', '0.19 L/kWh', 'Target below 0.22 L/kWh'],
      ],
      chart: ['MAKEUP WATER · 7 DAY TREND', 'line'],
      bars: ['HOURLY FLOW PROFILE', [35, 38, 44, 51, 48, 55, 66, 58, 61, 70, 64, 57, 53, 49, 46, 44, 39, 36]],
      table: [
        ['Meter', 'Reading', 'Flow', 'Status'],
        [
          ['CW-MAIN-01', '18,428 m³', '6.1 m³/h', 'normal'],
          ['CT-MAKEUP-01', '7,911 m³', '2.6 m³/h', 'normal'],
          ['RO-PLANT-01', '2,184 m³', '1.4 m³/h', 'normal'],
          ['HALL-3-BRANCH', '1,040 m³', '0.9 m³/h', 'watch'],
        ],
      ],
    },
    'energy:anomaly': {
      metrics: [
        ['ACTIVE FINDINGS', '3', '1 critical · 2 high'],
        ['POINTS MONITORED', '8,412', '99.2% reporting'],
        ['AVOIDABLE LOAD', '182 kW', 'Estimated from current findings'],
      ],
      chart: ['DEVIATION FROM TYPICAL PROFILE', 'line'],
      bars: ['FINDINGS BY HOUR', [8, 6, 4, 7, 10, 15, 21, 18, 14, 11, 8, 6, 4, 5, 8, 12, 9, 5]],
      table: [
        ['Finding', 'Source', 'Severity', 'Age'],
        [
          ['Hall 3 inlet above model', 'CRAH-3-02', 'critical', '12 min'],
          ['Fuel level below policy', 'GEN-03', 'high', '1 h'],
          ['Approach temperature rising', 'CH-04', 'high', '3 h'],
          ['Night load outside profile', 'DB-H2-04', 'medium', '7 h'],
        ],
      ],
    },
    'hvac:overview': {
      metrics: [
        ['COOLING LOAD', '5.2 MW', '24.3% of facility load'],
        ['CHILLERS RUNNING', '5 / 6', 'One unit in standby'],
        ['AVERAGE COP', '5.8', 'Target 5.6 or better'],
      ],
      chart: ['COOLING DEMAND · LAST 24 HOURS', 'line'],
      bars: ['CHILLER LOAD DISTRIBUTION', [71, 68, 76, 73, 65, 0]],
      table: [
        ['System', 'State', 'Output', 'Efficiency'],
        [
          ['CH-01', 'running', '1.04 MW', 'COP 5.9'],
          ['CH-02', 'running', '1.08 MW', 'COP 5.8'],
          ['CH-03', 'running', '0.96 MW', 'COP 5.7'],
          ['CH-04', 'watch', '1.12 MW', 'COP 5.2'],
          ['CH-06', 'standby', '0 MW', 'ready'],
        ],
      ],
    },
    'hvac:live': {
      metrics: [
        ['LIVE EQUIPMENT', '186', '184 healthy · 2 in alarm'],
        ['SUPPLY AIR', '18.4 °C', 'Average across six halls'],
        ['RETURN AIR', '31.6 °C', 'Average delta 13.2 °C'],
      ],
      chart: ['SUPPLY AND RETURN TEMPERATURE', 'line'],
      bars: ['CRAH FAN SPEED', [62, 68, 71, 66, 73, 82, 78, 69, 65, 72, 74, 68]],
      table: [
        ['Equipment', 'Location', 'Reading', 'State'],
        [
          ['CRAH-3-02', 'Hall 3', '27.9 °C inlet', 'critical'],
          ['CRAH-3-04', 'Hall 3', '73% fan', 'normal'],
          ['PCHWP-02', 'Cooling plant', '42 Hz', 'normal'],
          ['CH-04', 'Cooling plant', '4.8 °C approach', 'watch'],
        ],
      ],
    },
    'spaces:heatmap': {
      metrics: [
        ['HOTTEST ZONE', '27.9 °C', 'Hall 3 · cold aisle 04'],
        ['COLDEST ZONE', '21.8 °C', 'Hall 5 · cold aisle 02'],
        ['SENSORS ONLINE', '288 / 290', 'Two awaiting inspection'],
      ],
      chart: ['COLD-AISLE TEMPERATURE PROFILE', 'line'],
      bars: ['ZONE TEMPERATURE DISTRIBUTION', [48, 52, 57, 62, 88, 64, 55, 51, 58, 67, 61, 54]],
      table: [
        ['Zone', 'Temperature', 'Humidity', 'Condition'],
        [
          ['Hall 1', '23.4 °C', '46%', 'normal'],
          ['Hall 2', '24.1 °C', '48%', 'normal'],
          ['Hall 3', '27.9 °C', '51%', 'critical'],
          ['Hall 4', '23.8 °C', '47%', 'normal'],
          ['Hall 5', '22.9 °C', '45%', 'normal'],
          ['Hall 6', '23.2 °C', '46%', 'normal'],
        ],
      ],
    },
    'spaces:comfort': {
      metrics: [
        ['COMPLIANCE', '94.8%', 'Against operating temperature band'],
        ['RELATIVE HUMIDITY', '47%', 'Estate average'],
        ['EXCURSIONS TODAY', '2', 'Both isolated to Hall 3'],
      ],
      chart: ['TEMPERATURE COMPLIANCE · 7 DAYS', 'line'],
      bars: ['COMPLIANT HOURS BY HALL', [96, 94, 72, 98, 99, 97]],
      table: [
        ['Hall', 'Within band', 'Excursions', 'Trend'],
        [
          ['H1', '99.1%', '0', 'stable'],
          ['H2', '97.8%', '0', 'stable'],
          ['H3', '78.4%', '2', 'declining'],
          ['H4', '98.6%', '0', 'stable'],
          ['H5', '99.4%', '0', 'stable'],
          ['H6', '96.2%', '0', 'improving'],
        ],
      ],
    },
    'maintenance:preventive': {
      metrics: [
        ['JOBS DUE', '26', 'Next 14 days'],
        ['OVERDUE', '8', 'Oldest 143 days · GEN-03'],
        ['ON-TIME RATE', '91.4%', '+2.7% vs previous month'],
      ],
      chart: ['PREVENTIVE COMPLETION RATE', 'line'],
      bars: ['DUE WORK BY SYSTEM', [84, 61, 44, 72, 37, 55]],
      table: [
        ['Work order', 'Asset', 'Due', 'Priority'],
        [
          ['PM-2028', 'GEN-03', '143 d overdue', 'critical'],
          ['PM-2140', 'CH-04', '18 d overdue', 'high'],
          ['PM-2173', 'UPS-2B', '6 d overdue', 'high'],
          ['PM-2210', 'CRAH-4-08', 'Tomorrow', 'medium'],
          ['PM-2241', 'ATS-01', '4 Aug', 'normal'],
        ],
      ],
    },
    'maintenance:schedules': {
      metrics: [
        ['SCHEDULED THIS WEEK', '18', 'Six jobs completed'],
        ['PLANNED DOWNTIME', '4.5 h', 'No IT load impact'],
        ['TECHNICIANS', '7', 'Five currently on site'],
      ],
      chart: ['SCHEDULE LOAD · NEXT 14 DAYS', 'line'],
      bars: ['JOBS PER DAY', [32, 58, 41, 76, 65, 28, 18, 47, 62, 55, 38, 72, 44, 21]],
      table: [
        ['Date', 'Window', 'System', 'Jobs'],
        [
          ['29 Jul', '06:00–08:00', 'Cooling', '3'],
          ['30 Jul', '09:00–13:00', 'Electrical', '4'],
          ['31 Jul', '07:00–11:30', 'Generators', '2'],
          ['1 Aug', '08:00–10:00', 'Security', '3'],
        ],
      ],
    },
    'assets:workorders': {
      metrics: [
        ['OPEN ORDERS', '34', '7 high priority'],
        ['MEAN AGE', '4.8 d', 'Down 0.6 days this month'],
        ['FIRST-TIME FIX', '87%', 'Target 90%'],
      ],
      chart: ['OPEN WORK ORDER TREND', 'line'],
      bars: ['ORDERS BY SYSTEM', [64, 48, 72, 37, 51, 29]],
      table: [
        ['Order', 'Asset', 'Description', 'Status'],
        [
          ['WO-4182', 'CRAH-3-02', 'Investigate high inlet', 'in progress'],
          ['WO-4176', 'GEN-03', 'Fuel system inspection', 'assigned'],
          ['WO-4161', 'CH-04', 'Check condenser approach', 'assigned'],
          ['WO-4148', 'CAM-L2-18', 'Replace camera housing', 'scheduled'],
        ],
      ],
    },
    'assets:analytics': {
      metrics: [
        ['REGISTERED ASSETS', '1,240', '1,228 currently reporting'],
        ['IN ALARM', '5', '0.4% of estate assets'],
        ['HEALTH INDEX', '92.7', '+1.8 points in 90 days'],
      ],
      chart: ['ASSET HEALTH INDEX', 'line'],
      bars: ['ASSETS BY CONDITION', [92, 71, 46, 18]],
      table: [
        ['Class', 'Count', 'Healthy', 'Attention'],
        [
          ['Cooling', '284', '96%', '11'],
          ['Electrical', '412', '98%', '8'],
          ['Life safety', '166', '100%', '0'],
          ['Security', '218', '97%', '6'],
          ['Other', '160', '94%', '9'],
        ],
      ],
    },
    'security:cctv': {
      metrics: [
        ['CAMERAS LIVE', '124 / 126', 'Two scheduled for service'],
        ['RECORDING', '100%', '30-day retention healthy'],
        ['ACTIVE EVENTS', '2', 'Both low priority'],
      ],
      chart: ['VIDEO SYSTEM AVAILABILITY', 'line'],
      bars: ['CAMERAS BY ZONE', [68, 74, 59, 81, 63, 48]],
      table: [
        ['Camera', 'Zone', 'State', 'Last event'],
        [
          ['CAM-G01-01', 'Gatehouse', 'live', '4 min'],
          ['CAM-YD-08', 'Generator yard', 'live', '31 min'],
          ['CAM-L2-18', 'Level 2', 'service', '2 h'],
          ['CAM-PLT-06', 'Cooling plant', 'live', '5 h'],
        ],
      ],
    },
    'security:access': {
      metrics: [
        ['DOORS ONLINE', '86 / 86', 'All controllers reporting'],
        ['ENTRIES TODAY', '312', '24 contractors on site'],
        ['DENIED EVENTS', '3', 'Reviewed · no escalation'],
      ],
      chart: ['ACCESS EVENTS · TODAY', 'line'],
      bars: ['ENTRIES BY HOUR', [8, 12, 19, 34, 71, 82, 65, 54, 43, 36, 29, 18]],
      table: [
        ['Point', 'Zone', 'State', 'Last event'],
        [
          ['DR-GATE-01', 'Main gate', 'online', '1 min'],
          ['DR-H3-02', 'Hall 3', 'online', '8 min'],
          ['DR-PLANT-04', 'Cooling plant', 'online', '12 min'],
          ['DR-UPS-01', 'UPS room', 'online', '27 min'],
        ],
      ],
    },
    'security:safety': {
      metrics: [
        ['ACTIVE ALARMS', '0', 'Fire and life safety'],
        ['DEVICES HEALTHY', '842 / 842', 'Last test 05:00 today'],
        ['MUSTER STATUS', 'Ready', 'All four points online'],
      ],
      chart: ['SYSTEM AVAILABILITY · 30 DAYS', 'line'],
      bars: ['DEVICES BY LOOP', [76, 82, 69, 88, 74, 79, 71, 84]],
      table: [
        ['System', 'State', 'Last test', 'Next service'],
        [
          ['Fire alarm panel', 'normal', 'Today 05:00', '15 Aug'],
          ['VESDA network', 'normal', 'Today 05:04', '22 Aug'],
          ['Emergency lighting', 'normal', '27 Jul', '2 Sep'],
          ['Muster system', 'normal', 'Today 05:10', '18 Aug'],
        ],
      ],
    },
  };

  const halls = [
    ['H1', '2.6 MW', '23.4°', 66, 'normal'],
    ['H2', '2.9 MW', '24.1°', 73, 'normal'],
    ['H3', '3.1 MW', '27.9°', 92, 'critical'],
    ['H4', '2.4 MW', '23.8°', 60, 'normal'],
    ['H5', '2.2 MW', '22.9°', 55, 'normal'],
    ['H6', '1.7 MW', '23.2°', 43, 'normal'],
  ];

  const assets = [
    { id: 'CRAH-3-02', name: 'CRAH Unit 3-02', system: 'Cooling', location: 'Hall 3', status: 'alarm', service: '18 Jun 2026', reading: '27.9 °C inlet', health: '61%' },
    { id: 'GEN-03', name: 'Standby Generator 03', system: 'Electrical', location: 'Generator yard', status: 'alarm', service: '8 Mar 2026', reading: 'Fuel 62%', health: '74%' },
    { id: 'CH-04', name: 'Centrifugal Chiller 04', system: 'Cooling', location: 'Cooling plant', status: 'alarm', service: '3 Jul 2026', reading: '4.8 °C approach', health: '78%' },
    { id: 'UPS-2B', name: 'UPS System 2B', system: 'Electrical', location: 'UPS room B', status: 'normal', service: '14 Jul 2026', reading: '96.4% efficiency', health: '96%' },
    { id: 'ATS-01', name: 'Automatic Transfer Switch 01', system: 'Electrical', location: 'Main LV room', status: 'normal', service: '21 Jul 2026', reading: 'Utility source A', health: '98%' },
    { id: 'CAM-L2-18', name: 'Fixed Camera L2-18', system: 'Security', location: 'Level 2 corridor', status: 'normal', service: '28 Jun 2026', reading: 'Live · 25 fps', health: '91%' },
    { id: 'PCHWP-02', name: 'Primary CHW Pump 02', system: 'Cooling', location: 'Cooling plant', status: 'normal', service: '11 Jul 2026', reading: '42 Hz', health: '95%' },
    { id: 'FACP-01', name: 'Fire Alarm Control Panel', system: 'Life safety', location: 'Security room', status: 'normal', service: '26 Jul 2026', reading: 'All loops normal', health: '100%' },
    { id: 'AHU-L3-01', name: 'Air Handling Unit L3-01', system: 'HVAC', location: 'Level 3', status: 'normal', service: '19 Jul 2026', reading: '13.0 °C supply', health: '94%' },
    { id: 'CHILLER-L3-01', name: 'Water-Cooled Chiller L3-01', system: 'Cooling', location: 'Plant L3', status: 'normal', service: '2 Jul 2026', reading: '71% load', health: '93%' },
    { id: 'AHU-A2-RF-01', name: 'Roof Air Handling Unit A2', system: 'HVAC', location: 'Roof A2', status: 'normal', service: '12 Jul 2026', reading: '62% fan', health: '91%' },
    { id: 'FCU-L1-02', name: 'Fan Coil Unit L1-02', system: 'HVAC', location: 'Level 1', status: 'alarm', service: '6 Jun 2026', reading: '15.6 °C supply', health: '69%' },
    { id: 'VAV-L2-03', name: 'VAV Terminal L2-03', system: 'HVAC', location: 'Level 2', status: 'alarm', service: '1 Jul 2026', reading: 'Stale 26 h', health: '58%' },
    { id: 'VAV-L3-02', name: 'VAV Terminal L3-02', system: 'HVAC', location: 'Level 3', status: 'alarm', service: '4 Jul 2026', reading: 'Damper 100%', health: '64%' },
    { id: 'CRAH-1-05', name: 'CRAH Unit 1-05', system: 'Cooling', location: 'Hall 1', status: 'normal', service: '17 Jul 2026', reading: '23.1 °C inlet', health: '96%' },
    { id: 'GEN-07', name: 'Standby Generator 07', system: 'Electrical', location: 'Generator yard', status: 'normal', service: '13 Jul 2026', reading: 'Fuel 88%', health: '97%' },
    { id: 'UPS-04', name: 'UPS System 04', system: 'Electrical', location: 'UPS room A', status: 'normal', service: '9 Jul 2026', reading: '97.1% efficiency', health: '98%' },
    { id: 'UPS-09', name: 'UPS System 09', system: 'Electrical', location: 'UPS room C', status: 'normal', service: '8 Jul 2026', reading: '96.8% efficiency', health: '97%' },
    { id: 'FP-01', name: 'Fire Pump 01', system: 'Fire protection', location: 'Pump room', status: 'normal', service: '22 Jul 2026', reading: 'Auto · ready', health: '99%' },
  ];

  const properties = [
    { name: 'Marsa Al Arab', city: 'Dubai', status: '3 faults', cost: 'AED 19.8K', epi: '184 kWh/m²', alarms: 3 },
    { name: 'Property Two', city: 'Dubai', status: '2 faults', cost: 'AED 24.2K', epi: '201 kWh/m²', alarms: 2 },
    { name: 'Property Three', city: 'Riyadh', status: 'normal', cost: 'AED 17.6K', epi: '167 kWh/m²', alarms: 0 },
    { name: 'Property Four', city: 'Abu Dhabi', status: '2 faults', cost: 'AED 22.7K', epi: '193 kWh/m²', alarms: 2 },
  ];

  const routeFixtures = {
    opportunities: [
      ['Chiller staging inefficiency', '1,532 kWh'],
      ['CRAH units fighting', '1,672 kWh'],
      ['Low delta-T syndrome', '980 kWh'],
    ],
    consumers: [
      ['Data Halls', '14.9 MW', 70, 'cyan'],
      ['Cooling Plant', '4.6 MW', 21, 'amber'],
      ['UPS and distribution losses', '1.2 MW', 6, 'green'],
      ['House loads', '0.7 MW', 3, 'pink'],
    ],
    anomalies: [
      { id: 'CRAH-3-02', title: 'Inlet temperature high', value: '+4.9°', place: 'Hall 3', since: '09:22', severity: 'critical' },
      { id: 'CH-04', title: 'Condenser approach rising', value: '+2.1°', place: 'Cooling plant', since: '08:11', severity: 'warning' },
      { id: 'GEN-03', title: 'Fuel below policy', value: '-18%', place: 'Generator yard', since: '06:40', severity: 'warning' },
    ],
    hvac: [
      { id: 'CH-01', type: 'Chiller', floor: 'Plant', value: '6.5°', state: 'normal', serves: 'Chilled-water loop' },
      { id: 'PUMP-CHW-1', type: 'Pump', floor: 'Plant', value: '48 Hz', state: 'normal', serves: 'Primary loop' },
      { id: 'PUMP-CHW-2', type: 'Pump', floor: 'Plant', value: '47 Hz', state: 'normal', serves: 'Secondary loop' },
      { id: 'FCU-GF-01', type: 'FCU', floor: 'GF', value: '12.9°', state: 'normal', serves: 'GF Lobby' },
      { id: 'FCU-GF-02', type: 'FCU', floor: 'GF', value: '13.1°', state: 'normal', serves: 'GF Café' },
      { id: 'FCU-L1-01', type: 'FCU', floor: 'L1', value: '13.2°', state: 'normal', serves: 'L1 Reception' },
      { id: 'FCU-L1-02', type: 'FCU', floor: 'L1', value: '15.6°', state: 'warning', serves: 'L1 Kitchen · L1 Dining' },
      { id: 'FCU-L2-01', type: 'FCU', floor: 'L2', value: '12.8°', state: 'normal', serves: 'L2 Guest E' },
      { id: 'FCU-L2-02', type: 'FCU', floor: 'L2', value: '13.0°', state: 'normal', serves: 'L2 Guest W' },
      { id: 'AHU-L3-01', type: 'AHU', floor: 'L3', value: '13.0°', state: 'normal', serves: 'Air distribution' },
      { id: 'VAV-L3-02', type: 'VAV', floor: 'L3', value: '100%', state: 'critical', serves: 'L3 Gym' },
      { id: 'VAV-L2-03', type: 'VAV', floor: 'L2', value: '26 h', state: 'stale', serves: 'L2 corridor' },
    ],
    documents: [
      ['AHU O&M Manual', 'PDF', 'HVAC', 'All spaces', '4.2 MB'],
      ['Chiller CH-2 Warranty Certificate', 'PDF', 'HVAC', 'Cooling plant', '1.1 MB'],
      ['L11 West As-Built Drawings', 'DWG', 'Architecture', 'Level 11 West', '18.6 MB'],
      ['Fire Alarm Cause and Effect Matrix', 'XLSX', 'Fire alarm', 'All spaces', '820 KB'],
      ['LV Panel Schedules', 'PDF', 'Electrical', 'LV rooms', '6.7 MB'],
    ],
    accessCards: [
      ['AC-10241', 'S. Khan', 'Facility engineer', 'Halls 1–6 / yards', '13:02', 'Active'],
      ['AC-10318', 'M. Al Rashed', 'Control room operator', 'Control room / halls', '12:47', 'Active'],
      ['AC-10355', 'A. Youssef', 'Site manager', 'All areas', '11:58', 'Active'],
      ['AC-10402', 'Contractor tech', 'Cooling contractor', 'Chiller yard only', '09:15', 'Suspended'],
      ['AC-10119', 'R. Fernandes', 'Security', 'Gates / perimeter', '13:11', 'Active'],
      ['AC-09984', 'K. Osman', 'Visitor', 'Reception only', 'yesterday', 'Expired'],
    ],
    cameras: [
      ['CAM-H3-01', 'Hall 3 cold aisle', '/static/images/eko/cam-hall-3-cold-aisle.png'],
      ['CAM-COR-01', 'Main corridor', '/static/images/eko/cam-main-corridor.png'],
      ['CAM-GT-01', 'Entrance gate', '/static/images/eko/cam-entrance-gate.png'],
      ['CAM-PER-01', 'Perimeter road', '/static/images/eko/cam-perimeter-road.png'],
    ],
    pmEquipment: ['CRAH-1-05', 'CRAH-3-02', 'CH-01', 'CH-04', 'GEN-03', 'GEN-07', 'UPS-04', 'UPS-09', 'FP-01', 'ATS-02'],
  };

  const searchItems = [
    { label: 'Overview', kind: 'Page', action: 'module', module: 'overview' },
    { label: 'Power', kind: 'Energy', action: 'subview', module: 'energy', view: 'power' },
    { label: 'Water', kind: 'Energy', action: 'subview', module: 'energy', view: 'water' },
    { label: 'Flow and Trend Anomaly', kind: 'Energy', action: 'subview', module: 'energy', view: 'anomaly' },
    { label: 'Heat Map', kind: 'Spaces', action: 'subview', module: 'spaces', view: 'heatmap' },
    { label: 'Registry', kind: 'Assets', action: 'subview', module: 'assets', view: 'registry' },
    { label: 'Documents', kind: 'Assets', action: 'subview', module: 'assets', view: 'documents' },
    { label: 'Preventive Maintenance', kind: 'Maintenance', action: 'subview', module: 'maintenance', view: 'preventive' },
    { label: 'CCTV', kind: 'Security', action: 'subview', module: 'security', view: 'cctv' },
    { label: 'Access Cards', kind: 'Security', action: 'subview', module: 'security', view: 'access' },
    { label: 'CRAH-3-02', kind: 'Critical alarm', action: 'equipment', equipment: 'CRAH-3-02' },
    { label: 'GEN-03', kind: 'High alarm', action: 'equipment', equipment: 'GEN-03' },
    { label: 'CH-04', kind: 'High alarm', action: 'equipment', equipment: 'CH-04' },
  ];

  const arabicText = {
    'Open portfolio': 'فتح المحفظة',
    'Breadcrumb': 'مسار التنقل',
    'Digital Twin': 'التوأم الرقمي',
    'Co-brand': 'الهوية المشتركة',
    'Overview': 'نظرة عامة',
    'Integrations 1/1': 'التكاملات 1/1',
    'Search': 'بحث',
    'Language': 'اللغة',
    'LIVE': 'مباشر',
    'Modules': 'الوحدات',
    'Reports library': 'مكتبة التقارير',
    'Account menu': 'قائمة الحساب',
    'Search assets': 'البحث في الأصول',
    'Search assets, alarms, pages…': 'ابحث في الأصول والتنبيهات والصفحات…',
    'Ask EKO': 'اسأل EKO',
    'Ask EKO: “why is the west tower above baseline?”': 'اسأل EKO: «لماذا البرج الغربي أعلى من خط الأساس؟»',
    'Ask a follow-up': 'اطرح سؤالاً إضافياً',
    'Ask EKO conversation': 'محادثة اسأل EKO',
    'Energy': 'الطاقة',
    'Facility consumption, efficiency and utility performance': 'استهلاك المنشأة وكفاءتها وأداء المرافق',
    'Power': 'الطاقة الكهربائية',
    'Water': 'المياه',
    'Flow and Trend Anomaly': 'شذوذ التدفق والاتجاه',
    'HVAC': 'التكييف',
    'Cooling plant and environmental control': 'محطة التبريد والتحكم البيئي',
    'Spaces': 'المساحات',
    'Environmental conditions across occupied zones': 'الظروف البيئية في المناطق المشغولة',
    'Heat Map': 'الخريطة الحرارية',
    'Maintenance': 'الصيانة',
    'Preventive work, schedules and service risk': 'الأعمال الوقائية والجداول ومخاطر الخدمة',
    'Preventive Maintenance': 'الصيانة الوقائية',
    'Assets': 'الأصول',
    'Equipment records, work orders and lifecycle performance': 'سجلات المعدات وأوامر العمل وأداء دورة الحياة',
    'Asset Register': 'سجل الأصول',
    'Registry': 'السجل',
    'Work Orders': 'أوامر العمل',
    'Analytics': 'التحليلات',
    'RFID': 'التعريف بموجات الراديو',
    'Documents': 'المستندات',
    'Security': 'الأمن',
    'CCTV, access control and life-safety status': 'حالة المراقبة والتحكم بالدخول وسلامة الأرواح',
    'CCTV': 'كاميرات المراقبة',
    'Access Cards': 'بطاقات الدخول',
    'Settings': 'الإعدادات',
    'Help': 'المساعدة',
    'Collapse': 'طي القائمة',
    'Facility metrics': 'مؤشرات المنشأة',
    'Khazna DC overview': 'نظرة عامة على خازنة',
    'CURRENT PUE': 'مؤشر PUE الحالي',
    'Open PUE analytics': 'فتح تحليلات PUE',
    'Open IT load analytics': 'فتح تحليلات حمل تقنية المعلومات',
    'Open facility power analytics': 'فتح تحليلات طاقة المنشأة',
    'Open energy analytics': 'فتح تحليلات الطاقة',
    'Open water analytics': 'فتح تحليلات المياه',
    'Open alarms': 'فتح التنبيهات',
    'above target': 'فوق الهدف',
    'target 1.40': 'الهدف 1.40',
    'IT LOAD': 'حمل تقنية المعلومات',
    'of 30 MW design': 'من قدرة تصميمية 30 ميجاواط',
    'FACILITY POWER': 'طاقة المنشأة',
    'ENERGY TODAY': 'الطاقة اليوم',
    'WATER TODAY': 'المياه اليوم',
    'cooling makeup': 'مياه تعويض التبريد',
    '114.1 t CO₂ · to 13:00': '114.1 طن CO₂ · حتى 13:00',
    'ALARMS': 'التنبيهات',
    '4 high · 12 medium · 0 life safety': '4 عالية · 12 متوسطة · 0 سلامة حيوية',
    'ALARMS BY SEVERITY': 'التنبيهات حسب الخطورة',
    'Facility insights': 'معلومات المنشأة',
    'critical': 'حرج',
    'high': 'عالٍ',
    'medium': 'متوسط',
    'inlet high': 'حرارة المدخل مرتفعة',
    'fuel below policy': 'الوقود دون المستوى',
    'approach rising': 'فرق الحرارة يرتفع',
    'Fire and life safety:': 'الحريق وسلامة الأرواح:',
    'active': 'نشط',
    'DATA HALLS': 'قاعات البيانات',
    'cold-aisle inlet vs 18–27 °C band': 'مدخل الممر البارد مقابل نطاق 18–27°م',
    'CRITICAL SYSTEMS': 'الأنظمة الحرجة',
    'Generators': 'المولدات',
    'Chillers': 'المبردات',
    'Viewer tools': 'أدوات العارض',
    'Data hall annotations': 'تعليقات قاعات البيانات',
    'Live 3D facility model': 'نموذج المنشأة ثلاثي الأبعاد المباشر',
    'H1–H6 chips show live IT load and cold-aisle inlet temp': 'تعرض شرائح H1–H6 حمل تقنية المعلومات وحرارة مدخل الممر البارد',
    'VIEWING HISTORY ·': 'عرض السجل ·',
    'History time': 'وقت السجل',
    'Timeline metric': 'مؤشر الخط الزمني',
    'Generators · standby ready': 'المولدات · الاستعداد جاهز',
    'UPS · online': 'وحدات UPS · متصلة',
    'Chillers · running / standby': 'المبردات · تشغيل / استعداد',
    'Preventive maintenance ·': 'الصيانة الوقائية ·',
    'overdue · oldest': 'متأخرة · الأقدم',
    'Portfolio Overview': 'نظرة عامة على المحفظة',
    'Portfolio overview': 'نظرة عامة على المحفظة',
    'Operating performance across connected properties': 'أداء التشغيل عبر المواقع المتصلة',
    'Sort portfolio': 'ترتيب المحفظة',
    'Attention': 'تحتاج انتباهاً',
    'Cost': 'التكلفة',
    'CONNECTED SITES': 'المواقع المتصلة',
    'FACILITY LOAD': 'حمل المنشأة',
    'OPEN ALARMS': 'التنبيهات المفتوحة',
    'ADMINISTRATION': 'الإدارة',
    'Site connections, preferences and audit records': 'اتصالات الموقع والتفضيلات وسجل التدقيق',
    'Settings sections': 'أقسام الإعدادات',
    'Integrations': 'التكاملات',
    'API & Webhooks': 'واجهة API وخطافات الويب',
    'Preferences': 'التفضيلات',
    'Notifications': 'الإشعارات',
    'Audit Trail': 'سجل التدقيق',
    'Connected systems': 'الأنظمة المتصلة',
    'Read-only operational connections for Khazna DC.': 'اتصالات تشغيلية للقراءة فقط في خازنة.',
    'Create webhook': 'إنشاء خطاف ويب',
    'Site API endpoint': 'عنوان واجهة API للموقع',
    'Webhook secret': 'رمز خطاف الويب',
    'Default landing view': 'صفحة البداية الافتراضية',
    'Theme': 'السمة',
    'Toggle light theme': 'تبديل السمة الفاتحة',
    'Metric units': 'وحدات القياس',
    'Report subscriptions': 'اشتراكات التقارير',
    'Subscribed': 'مشترك',
    'Subscribe': 'اشتراك',
    'Export': 'تصدير',
    'All status': 'كل الحالات',
    'In alarm': 'في حالة تنبيه',
    'Normal': 'طبيعي',
    'Compact density': 'عرض مدمج',
    'Comfortable density': 'عرض مريح',
    'Estate': 'المحفظة',
    'Operations': 'التشغيل',
    'More': 'المزيد',
    'More modules': 'وحدات إضافية',
    'Reports': 'التقارير',
    'Profile': 'الملف الشخصي',
    'Toggle theme': 'تبديل السمة',
    'Log out': 'تسجيل الخروج',
    'Help & shortcuts': 'المساعدة والاختصارات',
    'Navigate the EKO digital twin': 'التنقل في توأم EKO الرقمي',
    'Close panel': 'إغلاق اللوحة',
    'Reset viewer': 'إعادة ضبط العارض',
    'ASK EKO': 'اسأل EKO',
    'What is our PUE right now': 'ما هو مؤشر PUE الآن',
    'Why is Hall 3 hot': 'لماذا القاعة 3 حارة',
    'Generate the morning report': 'إنشاء التقرير الصباحي',
    'I can explain the static operational context shown in this reference build.': 'يمكنني شرح السياق التشغيلي الثابت المعروض في هذا النموذج.',
    'Send': 'إرسال',
    'Live': 'مباشر',
    'History': 'السجل',
    'Previous event': 'الحدث السابق',
    'Next event': 'الحدث التالي',
    'Back to live': 'العودة للمباشر',
    'Select': 'تحديد',
    'Toggle alerts': 'تبديل التنبيهات',
    'Filter severity': 'تصفية الخطورة',
    'Open hall interior': 'فتح القاعة',
    'Reset view': 'إعادة ضبط العرض',
    'View history': 'عرض السجل',
    'Module views': 'عروض الوحدة',
    'ACTIVE FINDINGS': 'النتائج النشطة',
    'POINTS MONITORED': 'النقاط المراقبة',
    'AVOIDABLE LOAD': 'الحمل القابل للتجنب',
    'CURRENT FLOW': 'التدفق الحالي',
    'WUE': 'كفاءة استخدام المياه',
    'COOLING LOAD': 'حمل التبريد',
    'CHILLERS RUNNING': 'المبردات العاملة',
    'AVERAGE COP': 'متوسط معامل الأداء',
    'LIVE EQUIPMENT': 'المعدات المباشرة',
    'SUPPLY AIR': 'هواء التغذية',
    'RETURN AIR': 'هواء الراجع',
    'HOTTEST ZONE': 'أعلى منطقة حرارة',
    'COLDEST ZONE': 'أدنى منطقة حرارة',
    'SENSORS ONLINE': 'المستشعرات المتصلة',
    'COMPLIANCE': 'الالتزام',
    'RELATIVE HUMIDITY': 'الرطوبة النسبية',
    'EXCURSIONS TODAY': 'التجاوزات اليوم',
    'JOBS DUE': 'الأعمال المستحقة',
    'OVERDUE': 'المتأخرة',
    'ON-TIME RATE': 'معدل الإنجاز في الوقت',
    'SCHEDULED THIS WEEK': 'المجدول هذا الأسبوع',
    'PLANNED DOWNTIME': 'التوقف المخطط',
    'TECHNICIANS': 'الفنيون',
    'OPEN ORDERS': 'الأوامر المفتوحة',
    'MEAN AGE': 'متوسط العمر',
    'FIRST-TIME FIX': 'الإصلاح من المرة الأولى',
    'REGISTERED ASSETS': 'الأصول المسجلة',
    'IN ALARM': 'في حالة تنبيه',
    'HEALTH INDEX': 'مؤشر الصحة',
    'CAMERAS LIVE': 'الكاميرات المباشرة',
    'RECORDING': 'التسجيل',
    'ACTIVE EVENTS': 'الأحداث النشطة',
    'DOORS ONLINE': 'الأبواب المتصلة',
    'ENTRIES TODAY': 'عمليات الدخول اليوم',
    'DENIED EVENTS': 'محاولات الدخول المرفوضة',
    'ACTIVE ALARMS': 'التنبيهات النشطة',
    'DEVICES HEALTHY': 'الأجهزة السليمة',
    'MUSTER STATUS': 'حالة التجمع',
    'FACILITY LOAD · LAST 24 HOURS': 'حمل المنشأة · آخر 24 ساعة',
    'HOURLY CONSUMPTION · MWh': 'الاستهلاك بالساعة · م.و.س',
    'MAKEUP WATER · 7 DAY TREND': 'مياه التعويض · اتجاه 7 أيام',
    'HOURLY FLOW PROFILE': 'نمط التدفق بالساعة',
    'DEVIATION FROM TYPICAL PROFILE': 'الانحراف عن النمط المعتاد',
    'FINDINGS BY HOUR': 'النتائج حسب الساعة',
    'COOLING DEMAND · LAST 24 HOURS': 'طلب التبريد · آخر 24 ساعة',
    'CHILLER LOAD DISTRIBUTION': 'توزيع حمل المبردات',
    'SUPPLY AND RETURN TEMPERATURE': 'درجة حرارة التغذية والراجع',
    'CRAH FAN SPEED': 'سرعة مراوح CRAH',
    'COLD-AISLE TEMPERATURE PROFILE': 'نمط حرارة الممر البارد',
    'ZONE TEMPERATURE DISTRIBUTION': 'توزيع درجات حرارة المناطق',
    'TEMPERATURE COMPLIANCE · 7 DAYS': 'الالتزام بدرجة الحرارة · 7 أيام',
    'COMPLIANT HOURS BY HALL': 'ساعات الالتزام حسب القاعة',
    'PREVENTIVE COMPLETION RATE': 'معدل إنجاز الصيانة الوقائية',
    'DUE WORK BY SYSTEM': 'الأعمال المستحقة حسب النظام',
    'SCHEDULE LOAD · NEXT 14 DAYS': 'حمل الجدول · 14 يوماً قادمة',
    'JOBS PER DAY': 'الأعمال يومياً',
    'OPEN WORK ORDER TREND': 'اتجاه أوامر العمل المفتوحة',
    'ORDERS BY SYSTEM': 'الأوامر حسب النظام',
    'ASSET HEALTH INDEX': 'مؤشر صحة الأصول',
    'ASSETS BY CONDITION': 'الأصول حسب الحالة',
    'VIDEO SYSTEM AVAILABILITY': 'توفر نظام الفيديو',
    'CAMERAS BY ZONE': 'الكاميرات حسب المنطقة',
    'ACCESS EVENTS · TODAY': 'أحداث الدخول · اليوم',
    'ENTRIES BY HOUR': 'عمليات الدخول حسب الساعة',
    'SYSTEM AVAILABILITY · 30 DAYS': 'توفر النظام · 30 يوماً',
    'DEVICES BY LOOP': 'الأجهزة حسب الحلقة',
    'Distribution': 'التوزيع',
    'Load': 'الحمل',
    'Capacity': 'السعة',
    'Status': 'الحالة',
    'Meter': 'العداد',
    'Reading': 'القراءة',
    'Flow': 'التدفق',
    'Finding': 'النتيجة',
    'Source': 'المصدر',
    'Severity': 'الخطورة',
    'Age': 'العمر',
    'System': 'النظام',
    'State': 'الحالة',
    'Output': 'الخرج',
    'Efficiency': 'الكفاءة',
    'Equipment': 'المعدة',
    'Location': 'الموقع',
    'Zone': 'المنطقة',
    'Temperature': 'درجة الحرارة',
    'Humidity': 'الرطوبة',
    'Condition': 'الحالة',
    'Hall': 'القاعة',
    'Within band': 'ضمن النطاق',
    'Excursions': 'التجاوزات',
    'Trend': 'الاتجاه',
    'Work order': 'أمر العمل',
    'Due': 'الاستحقاق',
    'Priority': 'الأولوية',
    'Date': 'التاريخ',
    'Window': 'الفترة',
    'Jobs': 'الأعمال',
    'Order': 'الأمر',
    'Description': 'الوصف',
    'Class': 'الفئة',
    'Count': 'العدد',
    'Healthy': 'سليم',
    'Camera': 'الكاميرا',
    'Last event': 'آخر حدث',
    'Point': 'النقطة',
    'Last test': 'آخر اختبار',
    'Next service': 'الخدمة القادمة',
    'Cooling': 'التبريد',
    'Electrical': 'الكهرباء',
    'Life safety': 'سلامة الأرواح',
    'Other': 'أخرى',
    'Cooling plant': 'محطة التبريد',
    'Generator yard': 'ساحة المولدات',
    'UPS room': 'غرفة UPS',
    'Gatehouse': 'مبنى البوابة',
    'Main gate': 'البوابة الرئيسية',
    'Level 2': 'المستوى 2',
    'Fire and life safety': 'الحريق وسلامة الأرواح',
    'Fire alarm panel': 'لوحة إنذار الحريق',
    'Emergency lighting': 'إنارة الطوارئ',
    'Muster system': 'نظام التجمع',
    'assigned': 'مسند',
    'in progress': 'قيد التنفيذ',
    'scheduled': 'مجدول',
    'service': 'صيانة',
    'online': 'متصل',
    'ready': 'جاهز',
    'live': 'مباشر',
    'stable': 'مستقر',
    'declining': 'يتراجع',
    'improving': 'يتحسن',
    'Target 1.40 · trailing 15 minutes': 'الهدف 1.40 · آخر 15 دقيقة',
    '49.7% of design capacity': '49.7% من القدرة التصميمية',
    'Peak today 22.1 MW': 'ذروة اليوم 22.1 ميجاواط',
    'Cooling makeup · to 13:00': 'مياه تعويض التبريد · حتى 13:00',
    'Within expected operating band': 'ضمن نطاق التشغيل المتوقع',
    'Target below 0.22 L/kWh': 'الهدف أقل من 0.22 لتر/ك.و.س',
    '1 critical · 2 high': '1 حرج · 2 عالٍ',
    '99.2% reporting': '99.2% تُبلغ',
    'Estimated from current findings': 'تقدير من النتائج الحالية',
    '24.3% of facility load': '24.3% من حمل المنشأة',
    'One unit in standby': 'وحدة واحدة في الاستعداد',
    'Target 5.6 or better': 'الهدف 5.6 أو أفضل',
    '184 healthy · 2 in alarm': '184 سليمة · 2 في حالة تنبيه',
    'Average across six halls': 'المتوسط عبر ست قاعات',
    'Average delta 13.2 °C': 'متوسط الفرق 13.2°م',
    'Hall 3 · cold aisle 04': 'القاعة 3 · الممر البارد 04',
    'Hall 5 · cold aisle 02': 'القاعة 5 · الممر البارد 02',
    'Two awaiting inspection': 'اثنان بانتظار الفحص',
    'Against operating temperature band': 'مقابل نطاق حرارة التشغيل',
    'Estate average': 'متوسط المنشأة',
    'Both isolated to Hall 3': 'كلاهما محصور في القاعة 3',
    'Next 14 days': 'خلال 14 يوماً القادمة',
    'Oldest 143 days · GEN-03': 'الأقدم 143 يوماً · GEN-03',
    '+2.7% vs previous month': '+2.7% مقارنة بالشهر السابق',
    'Six jobs completed': 'اكتملت ستة أعمال',
    'No IT load impact': 'دون تأثير على حمل تقنية المعلومات',
    'Five currently on site': 'خمسة في الموقع حالياً',
    '7 high priority': '7 بأولوية عالية',
    'Down 0.6 days this month': 'انخفاض 0.6 يوم هذا الشهر',
    'Target 90%': 'الهدف 90%',
    '1,228 currently reporting': '1,228 تُبلغ حالياً',
    '0.4% of estate assets': '0.4% من أصول المنشأة',
    '+1.8 points in 90 days': '+1.8 نقطة خلال 90 يوماً',
    'Two scheduled for service': 'اثنتان مجدولتان للصيانة',
    '30-day retention healthy': 'حفظ 30 يوماً بحالة سليمة',
    'Both low priority': 'كلاهما بأولوية منخفضة',
    'All controllers reporting': 'جميع وحدات التحكم تُبلغ',
    '24 contractors on site': '24 مقاولاً في الموقع',
    'Reviewed · no escalation': 'تمت المراجعة · دون تصعيد',
    'Fire and life safety': 'الحريق وسلامة الأرواح',
    'Last test 05:00 today': 'آخر اختبار اليوم 05:00',
    'All four points online': 'نقاط التجمع الأربع متصلة',
    'Hall 3 inlet above model': 'مدخل القاعة 3 أعلى من النموذج',
    'Fuel level below policy': 'مستوى الوقود دون السياسة',
    'Approach temperature rising': 'فرق درجة الحرارة يرتفع',
    'Night load outside profile': 'الحمل الليلي خارج النمط',
    'Investigate high inlet': 'فحص ارتفاع حرارة المدخل',
    'Fuel system inspection': 'فحص نظام الوقود',
    'Check condenser approach': 'فحص فرق حرارة المكثف',
    'Replace camera housing': 'استبدال غلاف الكاميرا',
    'Utility incomer A': 'مدخل المرفق A',
    'Utility incomer B': 'مدخل المرفق B',
    'UPS distribution': 'توزيع UPS',
    'All critical equipment': 'كل المعدات الحرجة',
    'Hall 3 assets': 'أصول القاعة 3',
    'Saved views': 'العروض المحفوظة',
    'Filter status': 'تصفية الحالة',
    'No assets match this filter.': 'لا توجد أصول تطابق عامل التصفية.',
    'Select an asset to inspect its current static record.': 'اختر أصلاً لفحص سجله الثابت الحالي.',
    'OPERATIONAL DETAIL': 'التفاصيل التشغيلية',
    'Static trend chart': 'مخطط اتجاه ثابت',
    'Asset': 'الأصل',
    'Last service': 'آخر صيانة',
    'Current reading': 'القراءة الحالية',
    'Health index': 'مؤشر الصحة',
    'Locate in viewer': 'تحديد في العارض',
    'Connected digital twin': 'توأم رقمي متصل',
    'facility load': 'حمل المنشأة',
    'energy today': 'الطاقة اليوم',
    'open alarms': 'التنبيهات المفتوحة',
    '1 critical': '1 حرج',
    '2 high': '2 عالية',
    'normal': 'طبيعي',
    'Building management and critical alarms': 'إدارة المبنى والتنبيهات الحرجة',
    'Point normalization and historian bridge': 'توحيد النقاط وربط السجل التاريخي',
    'Meters and electrical distribution': 'العدادات والتوزيع الكهربائي',
    'CCTV health and event metadata': 'حالة المراقبة وبيانات الأحداث',
    'Operational point gateway': 'بوابة النقاط التشغيلية',
    'BMS alarm source': 'مصدر تنبيهات BMS',
    'Weather service': 'خدمة الطقس',
    'Abu Dhabi station': 'محطة أبوظبي',
    'healthy': 'سليم',
    'Morning Operations Report': 'تقرير العمليات الصباحي',
    'Weekly Energy Performance': 'أداء الطاقة الأسبوعي',
    'Owner Report · July': 'تقرير المالك · يوليو',
    'Page': 'صفحة',
    'Critical alarm': 'تنبيه حرج',
    'High alarm': 'تنبيه عالٍ',
    'Data Hall 1': 'قاعة البيانات 1',
    'Data Hall 2': 'قاعة البيانات 2',
    'Data Hall 3': 'قاعة البيانات 3',
    'Data Hall 4': 'قاعة البيانات 4',
    'Data Hall 5': 'قاعة البيانات 5',
    'Data Hall 6': 'قاعة البيانات 6',
    'Hall 1': 'القاعة 1',
    'Hall 2': 'القاعة 2',
    'Hall 3': 'القاعة 3',
    'Hall 4': 'القاعة 4',
    'Hall 5': 'القاعة 5',
    'Hall 6': 'القاعة 6',
    'Critical temperature excursion': 'تجاوز حرج لدرجة الحرارة',
    'Operating within expected band': 'التشغيل ضمن النطاق المتوقع',
    'IT load': 'حمل تقنية المعلومات',
    'Cold-aisle inlet': 'مدخل الممر البارد',
    'Connected operational equipment': 'معدات تشغيلية متصلة',
    'Mode': 'الوضع',
    'read-only': 'للقراءة فقط',
    'ASSETS': 'الأصول',
    '1,240 registered assets · last synchronized 41 seconds ago': '1,240 أصلاً مسجلاً · آخر مزامنة قبل 41 ثانية',
    'alarm': 'تنبيه',
    '143 d overdue': 'متأخر 143 يوماً',
    '18 d overdue': 'متأخر 18 يوماً',
    '6 d overdue': 'متأخر 6 أيام',
    'Tomorrow': 'غداً',
    '4 min': '4 دقائق',
    '31 min': '31 دقيقة',
    '1 min': 'دقيقة واحدة',
    '8 min': '8 دقائق',
    '12 min': '12 دقيقة',
    '27 min': '27 دقيقة',
    '2 h': 'ساعتان',
    '3 h': '3 ساعات',
    '5 h': '5 ساعات',
    '7 h': '7 ساعات',
    '1 h': 'ساعة واحدة',
    'KHAZNA DC · LIVE · read-only via Desigo CC': 'خازنة · مباشر · للقراءة فقط عبر Desigo CC',
    '143 d · GEN-03': '143 يوماً · GEN-03',
    'connected · 41 s ago': 'متصل · قبل 41 ثانية',
    'connected · 38 s ago': 'متصل · قبل 38 ثانية',
    'connected · 52 s ago': 'متصل · قبل 52 ثانية',
    'connected · 1 min ago': 'متصل · قبل دقيقة',
    'Keys are masked and changes are recorded.': 'المفاتيح مخفية ويتم تسجيل التغييرات.',
    'Personal display and operation defaults.': 'إعدادات العرض والتشغيل الشخصية.',
    'Page shown after sign-in': 'الصفحة المعروضة بعد تسجيل الدخول',
    'Applies to this dashboard only': 'يطبق على لوحة المعلومات هذه فقط',
    'Temperature and consumption': 'درجة الحرارة والاستهلاك',
    'Scheduled reports are emailed and archived.': 'تُرسل التقارير المجدولة بالبريد وتُؤرشف.',
    'Morning operations report': 'تقرير العمليات الصباحي',
    'Daily · 06:00 GST · PDF': 'يومياً · 06:00 GST · PDF',
    'Weekly energy performance': 'أداء الطاقة الأسبوعي',
    'Mondays · 08:00 GST · PDF': 'الاثنين · 08:00 GST · PDF',
    'Append-only record. Entries cannot be edited or deleted.': 'سجل للإضافة فقط. لا يمكن تعديل الإدخالات أو حذفها.',
    'Timestamp': 'الوقت والتاريخ',
    'User': 'المستخدم',
    'Action': 'الإجراء',
    'Target': 'الهدف',
    'Report exported': 'تم تصدير التقرير',
    'Owner Report July': 'تقرير المالك لشهر يوليو',
    'Alarm acknowledged': 'تم تأكيد التنبيه',
    'system': 'النظام',
    'Integration healthy': 'التكامل سليم',
    'ESTATE': 'المحفظة',
    '3 operating normally': '3 تعمل بصورة طبيعية',
    'across the estate': 'عبر المحفظة',
    '1 critical · 7 high': '1 حرج · 7 عالية',
    '+3.1% vs typical': '+3.1% مقابل المعتاد',
    'ABU DHABI': 'أبوظبي',
    'DUBAI': 'دبي',
    'RIYADH': 'الرياض',
    'Property Two': 'العقار الثاني',
    'Property Three': 'العقار الثالث',
    '27.9 °C inlet': 'مدخل 27.9°م',
    '73% fan': 'سرعة المروحة 73%',
    '4.8 °C approach': 'فرق حرارة 4.8°م',
    'Ready': 'جاهز',
    'Today 05:00': 'اليوم 05:00',
    'Today 05:04': 'اليوم 05:04',
    'Today 05:10': 'اليوم 05:10',
    'warning': 'تحذير',
    'connected': 'متصل',
    'standby': 'استعداد',
    'running': 'يعمل',
    'watch': 'مراقبة',
    '7-day trend and top opportunities': 'اتجاه سبعة أيام وأهم الفرص',
    'TOP OPPORTUNITIES': 'أهم الفرص',
    'MODULES': 'الوحدات',
    'FACILITY LOAD NOW': 'حمل المنشأة الآن',
    'TODAY': 'اليوم',
    'AVOIDABLE': 'قابل للتجنب',
    'Open analytics': 'فتح التحليلات',
    'CONSUMERS': 'المستهلكون',
    'Power Factor': 'معامل القدرة',
    'Waste Prevention': 'منع الهدر',
    'Threshold outline': 'حد العتبة',
    'Sensor points': 'نقاط الاستشعار',
    'Labels': 'التسميات',
    'Values': 'القيم',
    'HALL RANKING': 'ترتيب القاعات',
    'SELECTED HALL': 'القاعة المحددة',
    'View Interior': 'عرض الداخل',
    'Open in HVAC': 'فتح في التكييف',
    'Engineering and operations library': 'مكتبة الهندسة والعمليات',
    'Search documents': 'بحث في المستندات',
    'Download': 'تنزيل',
    'POWER ANALYTICS': 'تحليلات الطاقة الكهربائية',
    'Back to split': 'العودة إلى العرض المقسم',
    'Model view': 'عرض النموذج',
    'Edit layout': 'تعديل التخطيط',
    'Save layout': 'حفظ التخطيط',
    'WASTE AND OPPORTUNITY': 'الهدر والفرص',
    'KEY INFLUENCERS': 'العوامل الرئيسية',
    'ENERGY TREND': 'اتجاه الطاقة',
    'PEAK DEMAND TREND': 'اتجاه ذروة الطلب',
    'TIME-OF-DAY PATTERN': 'نمط ساعات اليوم',
    'MAKEUP WATER TODAY': 'مياه التعويض اليوم',
    '7-DAY AVERAGE DRAW': 'متوسط السحب لسبعة أيام',
    'MAKEUP WATER STORAGE': 'تخزين مياه التعويض',
    'DAYS OF AUTONOMY': 'أيام الاستقلالية',
    'DAILY MAKEUP USAGE': 'استخدام مياه التعويض اليومي',
    "TODAY'S PROFILE": 'ملف اليوم',
    'LEAK MONITORING': 'مراقبة التسرب',
    'METER AND DATA HEALTH': 'سلامة العداد والبيانات',
    'OPEN ANOMALIES': 'الشذوذ المفتوح',
    'FLAGGED ENERGY TODAY': 'الطاقة المحددة اليوم',
    'POINTS MONITORED': 'النقاط المراقبة',
    'ACTIVE ANOMALIES': 'الشذوذ النشط',
    'Acknowledge': 'تأكيد',
    'Acknowledged': 'تم التأكيد',
    'Investigate': 'تحقيق',
    'DETECTION BASIS': 'أساس الاكتشاف',
    'ANOMALY EVIDENCE': 'أدلة الشذوذ',
    'TIME-OF-DAY DEVIATION': 'انحراف ساعات اليوم',
    'System': 'النظام',
    'Building': 'المبنى',
    'List': 'القائمة',
    'Chilled water': 'المياه المبردة',
    'Air': 'الهواء',
    'Show in Building': 'إظهار في المبنى',
    'Isolate branch': 'عزل الفرع',
    'Create work order': 'إنشاء أمر عمل',
    'PREVENTIVE MAINTENANCE': 'الصيانة الوقائية',
    'PM COMPLIANCE': 'امتثال الصيانة الوقائية',
    'OPEN PM TASKS': 'مهام الصيانة المفتوحة',
    'OLDEST OVERDUE': 'الأقدم تأخراً',
    'DUE NEXT 7 DAYS': 'مستحق خلال سبعة أيام',
    'PM MATRIX': 'مصفوفة الصيانة الوقائية',
    'COMPLETION TREND': 'اتجاه الإنجاز',
    'DUE THIS WEEK': 'مستحق هذا الأسبوع',
    'DATA BASIS': 'أساس البيانات',
    'Search assets': 'بحث في الأصول',
    'ACCESS CARDS': 'بطاقات الدخول',
    'ACTIVE CARDS': 'البطاقات النشطة',
    'SUSPENDED': 'المعلقة',
    'DOORS ONLINE': 'الأبواب المتصلة',
    'CARDHOLDERS': 'حاملو البطاقات',
    'Live load and distribution': 'الحمل والتوزيع المباشران',
    'design 30 MW': 'تصميم 30 ميجاواط',
    'PEAK TODAY': 'ذروة اليوم',
    'POWER FACTOR': 'معامل القدرة',
    'target 0.95': 'الهدف 0.95',
    'this month · no tariff': 'هذا الشهر · دون تعرفة',
    '2 waste warnings': 'تحذيران للهدر',
    'one critical': 'واحد حرج',
    'attributed to active windows': 'منسوبة إلى الفترات النشطة',
    'AVOIDABLE THIS MONTH': 'القابل للتجنب هذا الشهر',
    'three opportunities': 'ثلاث فرص',
    'six offline': 'ست نقاط غير متصلة',
    'sorted by severity': 'مرتبة حسب الخطورة',
    'Inlet temperature high': 'درجة حرارة المدخل مرتفعة',
    'Condenser approach rising': 'ارتفاع فرق حرارة المكثف',
    'Fuel below policy': 'الوقود دون السياسة',
    'Expected band': 'النطاق المتوقع',
    'four-week seasonal': 'نطاق موسمي لأربعة أسابيع',
    'Points online': 'النقاط المتصلة',
    'Model refresh': 'تحديث النموذج',
    'expected band': 'النطاق المتوقع',
    'detected window': 'فترة الاكتشاف',
    'expected operating profile': 'ملف التشغيل المتوقع',
    'Chiller Plant': 'محطة المبردات',
    'WATER': 'المياه',
    'makeup supply · live': 'إمداد التعويض · مباشر',
    'cooling makeup · to 13:00 · MW-01': 'مياه تعويض التبريد · حتى 13:00 · MW-01',
    'validated meter intervals': 'فترات عداد معتمدة',
    '96 of 120 m³ · refill at 25%': '96 من 120 م³ · إعادة التعبئة عند 25%',
    'days': 'أيام',
    'at current draw': 'وفق السحب الحالي',
    'last 14 days · m³': 'آخر 14 يوماً · م³',
    'Maximize': 'تكبير',
    'Restore': 'استعادة',
    'actual versus typical': 'الفعلي مقابل المعتاد',
    'four refills · current 80%': 'أربع عمليات تعبئة · الحالي 80%',
    'Current': 'الحالي',
    'Threshold': 'العتبة',
    'Last refill': 'آخر تعبئة',
    'Supply': 'الإمداد',
    'Municipal + storage': 'الشبكة البلدية + التخزين',
    'data-quality gate': 'بوابة جودة البيانات',
    'Not yet available': 'غير متاح بعد',
    'Leak detection will activate after seven consecutive days above 99% meter uptime.': 'سيُفعّل اكتشاف التسرب بعد سبعة أيام متتالية تتجاوز فيها جاهزية العداد 99%.',
    'Uptime': 'الجاهزية',
    'target 99%': 'الهدف 99%',
    'Intervals': 'الفترات',
    'Last reset': 'آخر إعادة ضبط',
    'Last reading': 'آخر قراءة',
    'Intermittent meter signal': 'إشارة العداد متقطعة',
    'Primary loop': 'الدائرة الأولية',
    'Secondary loop': 'الدائرة الثانوية',
    'Air distribution': 'توزيع الهواء',
    'warning branch': 'فرع تحذير',
    'SUPPLY TEMP, 24 H': 'حرارة الإمداد، 24 ساعة',
    '3 h gap': 'فجوة 3 ساعات',
    'Supply air': 'هواء الإمداد',
    'Setpoint': 'نقطة الضبط',
    'Valve': 'الصمام',
    'Fan': 'المروحة',
    'FAULT · Cooling coil not maintaining setpoint': 'عطل · ملف التبريد لا يحافظ على نقطة الضبط',
    'Est. impact ~620 kWh / mo': 'الأثر المقدر نحو 620 ك.و.س / شهر',
    'CAFM · last sync today 06:00': 'CAFM · آخر مزامنة اليوم 06:00',
    'target 90%': 'الهدف 90%',
    '8 overdue · 6 due this week · 4 scheduled': '8 متأخرة · 6 هذا الأسبوع · 4 مجدولة',
    'GEN-03 annual load-bank test': 'اختبار بنك الحمل السنوي لـ GEN-03',
    'across five equipment': 'عبر خمس معدات',
    'select a cell for record detail': 'حدد خلية لتفاصيل السجل',
    'Monthly': 'شهري',
    'Quarterly': 'ربع سنوي',
    'Semi-annual': 'نصف سنوي',
    'Annual': 'سنوي',
    'W1–W8 · target 90%': 'الأسبوع 1–8 · الهدف 90%',
    '90 target': 'الهدف 90',
    'six tasks across five equipment': 'ست مهام عبر خمس معدات',
    'Condenser tube clean': 'تنظيف أنابيب المكثف',
    'Test run': 'تشغيل اختباري',
    'Filter inspection': 'فحص المرشح',
    'Battery check': 'فحص البطارية',
    'Last sync': 'آخر مزامنة',
    'Records begin': 'بداية السجلات',
    'Hall energy and inlet temperature': 'طاقة القاعة ودرجة حرارة المدخل',
    'Cold-aisle inlet · latest validated reading': 'مدخل الممر البارد · أحدث قراءة معتمدة',
    'Hall Matrix': 'مصفوفة القاعات',
    'Temperature deviation by hall': 'انحراف الحرارة حسب القاعة',
    'Compact': 'مضغوط',
    'Comfortable': 'مريح',
    'Views': 'العروض',
    'All equipment ×': 'كل المعدات ×',
    'Reporting ×': 'المتصلة ×',
    'Floor': 'الطابق',
    'Open WOs': 'أوامر العمل المفتوحة',
    'Last WO': 'آخر أمر عمل',
    'Health': 'السلامة',
    '4 cameras · read-only via VMS': '4 كاميرات · للقراءة فقط عبر VMS',
    'Hall 3 cold aisle': 'الممر البارد في القاعة 3',
    'Main corridor': 'الممر الرئيسي',
    'Entrance gate': 'بوابة الدخول',
    'Perimeter road': 'طريق المحيط',
    'Simulated prototype feeds · no live video is transmitted': 'تغذية محاكاة للنموذج الأولي · لا يُنقل فيديو مباشر',
    'Khazna DC · read-only': 'خازنة · للقراءة فقط',
    'authorized credentials': 'بيانات اعتماد مصرح بها',
    'review required': 'تتطلب مراجعة',
    'all controllers reporting': 'كل وحدات التحكم متصلة',
    'latest six records': 'أحدث ستة سجلات',
    'Card': 'البطاقة',
    'Cardholder': 'حامل البطاقة',
    'Role': 'الدور',
    'Access': 'نطاق الدخول',
    'Last seen': 'آخر ظهور',
    'Facility engineer': 'مهندس المنشأة',
    'Halls 1–6 / yards': 'القاعات 1–6 / الساحات',
    'Active': 'نشطة',
    'Control room operator': 'مشغل غرفة التحكم',
    'Control room / halls': 'غرفة التحكم / القاعات',
    'Site manager': 'مدير الموقع',
    'All areas': 'كل المناطق',
    'Contractor tech': 'فني المقاول',
    'Cooling contractor': 'مقاول التبريد',
    'Chiller yard only': 'ساحة المبردات فقط',
    'Suspended': 'معلقة',
    'Gates / perimeter': 'البوابات / المحيط',
    'Visitor': 'زائر',
    'Reception only': 'الاستقبال فقط',
    'yesterday': 'أمس',
    'Expired': 'منتهية',
  };

  const panels = ['propertyMenu', 'systemsDrawer', 'reportsDrawer', 'notificationsDrawer', 'accountMenu', 'subscriptionsDrawer', 'searchPalette', 'reportModal', 'askDrawer', 'helpDialog', 'mobileMore'];
  const screenIds = {
    site: 'siteScreen',
    module: 'moduleScreen',
    portfolio: 'portfolioScreen',
    settings: 'settingsScreen',
    assets: 'assetScreen',
  };
  const state = {
    screen: 'site',
    module: 'overview',
    view: 'overview',
    nav: 'max',
    navTouched: false,
    expandedModule: null,
    theme: 'dark',
    language: 'en',
    history: false,
    historyPosition: 72,
    timelineDragging: false,
    scrollGesture: null,
    suppressClick: false,
    alerts: true,
    severity: 'all',
    activePanel: null,
    selectedAsset: null,
    selectedEntity: null,
    propertySort: 'faults',
    compactAssets: false,
    powerMode: 'split',
    layoutEditing: false,
    maximizedWidget: null,
    anomaly: 'CRAH-3-02',
    anomalyRange: '24h',
    anomalyAcknowledged: false,
    hvacTab: 'system',
    hvacLoop: 'water',
    hvacUnit: 'FCU-L1-02',
    heatLayer: 'temperature',
    heatThreshold: true,
    heatSensors: true,
    heatLabels: true,
    heatValues: true,
    heatHall: 'H3',
    pmCell: null,
    selectedDocumentSystem: 'all',
    selectedDocumentSpace: 'all',
    documentQuery: '',
    registryQuery: '',
    cctvFullscreen: null,
    assetDetailWide: false,
    assetDetailTab: 'status',
  };

  let root = null;
  let initialized = false;
  let controller = null;
  let clockTimer = null;
  let toastTimer = null;
  let returnFocus = null;
  let overviewInsightsMarkup = '';
  const pendingTimers = new Set();
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function query(selector, context) {
    return (context || root || document).querySelector(selector);
  }

  function queryAll(selector, context) {
    return Array.from((context || root || document).querySelectorAll(selector));
  }

  function translateValue(value) {
    if (!value) return value;
    const key = value.trim();
    const translation = arabicText[key];
    return translation ? value.replace(key, translation) : value;
  }

  function applyLanguage() {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !parent.closest('svg, script, style')) {
        if (state.language === 'ar') {
          const previous = originalText.get(node);
          const expected = previous === undefined ? null : translateValue(previous);
          if (previous === undefined || node.nodeValue !== expected) {
            originalText.set(node, node.nodeValue);
          }
          node.nodeValue = translateValue(originalText.get(node));
        } else if (originalText.has(node)) {
          node.nodeValue = originalText.get(node);
          originalText.delete(node);
        }
      }
      node = walker.nextNode();
    }
    queryAll('[placeholder], [aria-label], [title], [data-label]').forEach(function (element) {
      let sources = originalAttributes.get(element);
      if (!sources) {
        sources = new Map();
        originalAttributes.set(element, sources);
      }
      ['placeholder', 'aria-label', 'title', 'data-label'].forEach(function (attribute) {
        if (!element.hasAttribute(attribute)) return;
        if (state.language === 'ar') {
          const previous = sources.get(attribute);
          const current = element.getAttribute(attribute);
          const expected = previous === undefined ? null : translateValue(previous);
          if (previous === undefined || current !== expected) sources.set(attribute, current);
          element.setAttribute(attribute, translateValue(sources.get(attribute)));
        } else if (sources.has(attribute)) {
          element.setAttribute(attribute, sources.get(attribute));
          sources.delete(attribute);
        }
      });
    });
  }

  function dispatch(action, detail) {
    window.dispatchEvent(new CustomEvent('dashboard-event', {
      detail: Object.assign({ action: action }, detail || {}),
    }));
  }

  function delay(callback, duration) {
    const timer = window.setTimeout(function () {
      pendingTimers.delete(timer);
      callback();
    }, duration);
    pendingTimers.add(timer);
    return timer;
  }

  function closePanels(except, restoreFocus) {
    const focusTarget = returnFocus;
    panels.forEach(function (id) {
      if (id === except) return;
      const panel = query('#' + id);
      if (panel) panel.hidden = true;
      queryAll('[data-panel="' + id + '"]').forEach(function (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
    if (!except) {
      state.activePanel = null;
      returnFocus = null;
      if (restoreFocus && focusTarget && document.contains(focusTarget)) {
        delay(function () { focusTarget.focus(); }, 0);
      }
    }
  }

  function openPanel(id, trigger) {
    const panel = query('#' + id);
    if (!panel) return;
    if (!panel.hidden) {
      state.activePanel = id;
      return;
    }
    const mobileMoreTrigger = trigger instanceof HTMLElement && trigger.closest('#mobileMore')
      ? query('[data-panel="mobileMore"]')
      : null;
    closePanels();
    returnFocus = mobileMoreTrigger || (trigger instanceof HTMLElement ? trigger : null);
    panel.hidden = false;
    state.activePanel = id;
    queryAll('[data-panel="' + id + '"]').forEach(function (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    });
    if (id === 'searchPalette') {
      renderSearch('');
      delay(function () {
        const input = query('#globalSearch');
        if (input) input.focus();
      }, 0);
    }
    if (id === 'askDrawer') {
      delay(function () {
        const input = query('#askDrawerInput');
        if (input) input.focus();
      }, 0);
    }
    if (id !== 'searchPalette' && id !== 'askDrawer') {
      delay(function () {
        const focusable = panel.querySelector('button, input, select, [tabindex="0"]');
        if (focusable) focusable.focus();
      }, 0);
    }
    if (state.language === 'ar') applyLanguage();
  }

  function togglePanel(id, trigger) {
    const panel = query('#' + id);
    if (!panel) return;
    if (panel.hidden) openPanel(id, trigger);
    else closePanels(null, true);
  }

  function showScreen(name) {
    Object.keys(screenIds).forEach(function (screen) {
      const element = query('#' + screenIds[screen]);
      if (element) element.hidden = screen !== name;
    });
    state.screen = name;
    root.dataset.screen = name;
    closePanels();
  }

  function updateNavigation() {
    queryAll('.nav-item[data-module]').forEach(function (button) {
      const active = button.dataset.module === state.module && (state.screen === 'site' || state.screen === 'module' || state.screen === 'assets');
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const submenu = query('[data-submenu="' + button.dataset.module + '"]');
      if (submenu) {
        const expanded = button.dataset.module === state.expandedModule;
        submenu.hidden = !expanded;
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
    });
    queryAll('.nav-submenu button').forEach(function (button) {
      button.classList.toggle('active', button.dataset.module === state.module && button.dataset.view === state.view);
    });
    queryAll('.mobile-tabs button').forEach(function (button) {
      const active = state.screen === 'portfolio'
        ? button.dataset.action === 'portfolio'
        : button.dataset.module === state.module;
      button.classList.toggle('active', active);
    });
    const breadcrumb = query('#breadcrumbModule');
    if (breadcrumb) {
      if (state.screen === 'portfolio') breadcrumb.textContent = 'Portfolio';
      else if (state.screen === 'settings') breadcrumb.textContent = 'Settings';
      else if (state.screen === 'assets') breadcrumb.textContent = 'Asset Register';
      else if (state.module === 'overview') breadcrumb.textContent = 'Overview';
      else breadcrumb.textContent = moduleConfig[state.module].title;
    }
  }

  function renderHallRows() {
    const container = query('#hallRows');
    if (!container) return;
    container.innerHTML = halls.map(function (hall) {
      return '<button class="hall-row" type="button" data-action="hall" data-hall="' + hall[0] + '">' +
        '<code>' + hall[0] + '</code><span>' + hall[1] + '</span><i class="hall-bar"><span style="width:' + hall[3] + '%"></span></i>' +
        '<strong>' + hall[2] + '</strong><i class="hall-health ' + hall[4] + '"></i></button>';
    }).join('');
  }

  function renderProperties() {
    const container = query('#propertyCards');
    if (!container) return;
    const sorted = properties.slice().sort(function (a, b) {
      if (state.propertySort === 'energy') return parseFloat(b.epi) - parseFloat(a.epi);
      if (state.propertySort === 'cost') return parseFloat(b.cost.replace(/[^0-9.]/g, '')) - parseFloat(a.cost.replace(/[^0-9.]/g, ''));
      return b.alarms - a.alarms;
    });
    container.innerHTML = sorted.map(function (property) {
      const statusClass = property.alarms > 0 ? 'severity-chip high' : 'read-only';
      return '<article class="property-card" role="button" data-action="property" data-property="' + property.name + '" tabindex="0" aria-label="Open ' + property.name + '">' +
        '<header><div><span class="property-meta">' + property.city.toUpperCase() + '</span><h2>' + property.name + '</h2><p>Connected digital twin</p></div>' +
        '<span class="' + statusClass + '">' + property.status + '</span></header>' +
        '<div class="property-stats"><div><strong>' + property.cost + '</strong><span>avoidable cost</span></div>' +
        '<div><strong>' + property.epi + '</strong><span>energy intensity</span></div><div><strong>' + property.alarms + '</strong><span>critical faults</span></div></div></article>';
    }).join('');
  }

  function renderIntegrations() {
    const container = query('#integrationRows');
    if (!container) return;
    const integrations = [
      ['Desigo CC', 'Building management and critical alarms', 'connected · 41 s ago'],
      ['FIN Framework', 'Point normalization and historian bridge', 'connected · 38 s ago'],
      ['EcoStruxure Power', 'Meters and electrical distribution', 'connected · 52 s ago'],
      ['Milestone XProtect', 'CCTV health and event metadata', 'connected · 1 min ago'],
    ];
    container.innerHTML = integrations.map(function (item) {
      return '<div class="integration-row"><span><strong>' + item[0] + '</strong><small>' + item[1] + '</small></span>' +
        '<span class="read-only">' + item[2] + '</span></div>';
    }).join('');
  }

  function renderSystemRows() {
    const systems = [
      ['FIN Framework', 'Operational point gateway', 'healthy'],
      ['Desigo CC', 'BMS alarm source', 'healthy'],
      ['Historian', '8,412 points retained', 'healthy'],
      ['Weather service', 'Abu Dhabi station', 'healthy'],
    ];
    const reports = [
      ['Owner Report July', '28 Jul', 'PDF'],
      ["Al Sa'fat Submission Draft", '25 Jul', 'XLSX'],
      ['Energy Month Summary', '21 Jul', 'PDF'],
      ['Waste Prevention Opportunities', '18 Jul', 'PDF'],
    ];
    const systemRows = query('#systemRows');
    const reportRows = query('#reportRows');
    if (systemRows) {
      systemRows.innerHTML = systems.map(function (item) {
        return '<div class="drawer-row"><i></i><span><strong>' + item[0] + '</strong><small>' + item[1] + '</small></span><small>' + item[2] + '</small></div>';
      }).join('');
    }
    if (reportRows) {
      reportRows.innerHTML = reports.map(function (item, index) {
        return '<button class="drawer-row" type="button" data-action="report-download" data-report="' + index + '"><i></i><span><strong>' + item[0] + '</strong><small>' + item[1] + '</small></span><small>' + item[2] + '</small></button>';
      }).join('');
    }
  }

  function chartMarkup(type, values) {
    if (type === 'bars') {
      return '<div class="bar-chart">' + values.map(function (value) {
        return '<span style="--bar:' + value + '%" title="' + value + '"></span>';
      }).join('') + '</div>';
    }
    return '<div class="line-chart"><svg viewBox="0 0 720 200" preserveAspectRatio="none" aria-label="Static trend chart">' +
      '<path d="M0 142 C45 136 62 151 104 126 S164 104 210 119 S276 154 320 118 S382 74 426 92 S486 130 528 102 S590 48 632 63 S688 46 720 52"></path>' +
      '<path d="M0 158 C52 150 84 163 126 147 S205 129 254 139 S332 149 382 126 S460 105 512 116 S604 91 720 98" opacity=".32"></path></svg></div>';
  }

  function routeButton(label, action, className, attributes) {
    return '<button class="' + (className || '') + '" type="button" data-action="' + action + '" ' + (attributes || '') + '>' + label + '</button>';
  }

  function metricMarkup(label, value, unit, note, tone) {
    return '<article class="route-metric ' + (tone || '') + '"><h3>' + label + '</h3><p><strong>' + value + '</strong>' + (unit ? '<span>' + unit + '</span>' : '') + '</p><small>' + note + '</small></article>';
  }

  function widgetMarkup(id, title, caption, content, className) {
    return '<article class="route-widget ' + (className || '') + (state.maximizedWidget === id ? ' maximized' : '') + '" data-widget="' + id + '">' +
      '<header><div><h2>' + title + '</h2>' + (caption ? '<p>' + caption + '</p>' : '') + '</div><div class="widget-actions">' +
      routeButton('Ask EKO', 'route-ask', '', 'data-context="' + title + '" aria-label="Ask EKO about ' + title + '"') +
      routeButton(state.maximizedWidget === id ? 'Restore' : 'Maximize', 'widget-maximize', '', 'data-widget="' + id + '"') +
      '</div></header>' + content + '</article>';
  }

  function sparklineMarkup(tone) {
    return '<div class="route-spark"><svg viewBox="0 0 600 130" preserveAspectRatio="none" aria-label="Static operational trend"><path class="band" d="M0 82 C60 70 94 92 145 74 S230 48 286 67 S364 101 420 71 S515 38 600 52 L600 94 C520 82 472 108 420 99 S338 126 280 103 S185 87 130 102 S52 107 0 112Z"></path><path class="' + (tone || '') + '" d="M0 96 C58 84 102 105 154 75 S238 53 292 72 S372 112 430 76 S524 32 600 48"></path></svg></div>';
  }

  function horizontalRows(items) {
    return '<div class="route-bars">' + items.map(function (item) {
      return '<div><span><i class="' + (item[3] || '') + '"></i>' + item[0] + '</span><strong>' + item[1] + '</strong><b><i style="width:' + item[2] + '%"></i></b><small>' + item[2] + '%</small></div>';
    }).join('') + '</div>';
  }

  function renderSplitShell(panelMarkup, route, wide) {
    showScreen('site');
    root.dataset.route = route;
    root.dataset.layout = wide ? 'registry' : 'split';
    const kpis = query('.kpi-grid');
    if (kpis) kpis.hidden = true;
    const insights = query('.insights');
    if (insights) {
      insights.className = 'insights route-side-panel' + (wide ? ' wide' : '');
      insights.innerHTML = panelMarkup;
    }
    const timeline = query('#timeline');
    if (timeline) timeline.hidden = route === 'heatmap';
  }

  function restoreOverview() {
    root.dataset.route = 'overview';
    root.dataset.layout = 'overview';
    const kpis = query('.kpi-grid');
    if (kpis) kpis.hidden = false;
    const insights = query('.insights');
    if (insights) {
      insights.className = 'insights';
      insights.innerHTML = overviewInsightsMarkup;
    }
    renderHallRows();
  }

  function renderEnergyLanding() {
    const opportunities = routeFixtures.opportunities.map(function (item, index) {
      return '<button type="button" data-action="open-waste-widget"><span><i>' + (index + 1) + '</i>' + item[0] + '</span><strong>' + item[1] + '</strong></button>';
    }).join('');
    const modules = [
      ['Power', '21.4 MW now', 'energy', 'power'],
      ['Waste Prevention', '3,332 kWh open', 'energy', 'power'],
      ['Water', '128 m³ today', 'energy', 'water'],
      ['Flow and Trend Anomaly', '3 active', 'energy', 'anomaly'],
    ].map(function (item, index) {
      const action = index === 1 ? 'open-waste-widget' : 'subview';
      return '<button type="button" data-action="' + action + '" data-module="' + item[2] + '" data-view="' + item[3] + '"><span>' + item[0] + '</span><strong>' + item[1] + '</strong><i>›</i></button>';
    }).join('');
    renderSplitShell('<section class="split-panel energy-panel"><header><h1>Energy</h1><p>7-day trend and top opportunities</p></header><div class="split-metrics">' +
      metricMarkup('FACILITY LOAD NOW', '21.4', 'MW', 'of 30 MW design') + metricMarkup('TODAY', '278.4', 'MWh', 'to 13:00') +
      metricMarkup('PUE', '1.44', '', 'target 1.40') + metricMarkup('AVOIDABLE', '3,332', 'kWh', 'this month · no tariff', 'warning') +
      '</div><h2>TOP OPPORTUNITIES</h2><div class="opportunity-list">' + opportunities + '</div><h2>MODULES</h2><div class="module-link-list">' + modules + '</div></section>', 'energy');
  }

  function renderPowerSplit() {
    const consumers = horizontalRows(routeFixtures.consumers);
    renderSplitShell('<section class="split-panel power-panel"><header><div><h1>Power</h1><p>Live load and distribution</p></div>' +
      routeButton('Open analytics', 'open-power-analytics', 'primary') + '</header><div class="split-metrics">' +
      metricMarkup('FACILITY LOAD', '21.4', 'MW', 'design 30 MW') + metricMarkup('PEAK TODAY', '22.1', 'MW', 'design 30 MW') +
      metricMarkup('POWER FACTOR', '0.94', '', 'target 0.95', 'warning') + metricMarkup('AVOIDABLE', '3,332', 'kWh', 'this month · no tariff', 'warning') +
      '</div><h2>CONSUMERS</h2>' + consumers + '<div class="warning-strip"><span>2 waste warnings</span><strong>3,204 kWh</strong></div></section>', 'power');
  }

  function renderHeatMap() {
    const deviations = [['H1', '+0.4°', 38], ['H2', '+1.1°', 49], ['H3', '+4.9°', 100], ['H4', '+0.8°', 44], ['H5', '-0.1°', 28], ['H6', '+0.2°', 33]];
    const ranking = deviations.map(function (item) {
      return '<button class="' + (state.heatHall === item[0] ? 'active' : '') + '" type="button" data-action="heat-hall" data-hall="' + item[0] + '"><code>' + item[0] + '</code><b><i style="width:' + item[2] + '%"></i></b><strong>' + (state.heatLayer === 'temperature' ? item[1] : halls.find(function (hall) { return hall[0] === item[0]; })[1]) + '</strong></button>';
    }).join('');
    renderSplitShell('<section class="split-panel heat-panel"><header><div><h1>Heat Map</h1><p>Hall energy and inlet temperature</p></div></header>' +
      '<div class="segmented route-segment">' + routeButton('Energy', 'heat-layer', state.heatLayer === 'energy' ? 'active' : '', 'data-layer="energy"') + routeButton('Temperature', 'heat-layer', state.heatLayer === 'temperature' ? 'active' : '', 'data-layer="temperature"') + '</div>' +
      '<div class="toggle-list"><label><input type="checkbox" data-action="heat-toggle" data-setting="threshold" ' + (state.heatThreshold ? 'checked' : '') + '> Threshold outline</label><label><input type="checkbox" data-action="heat-toggle" data-setting="sensors" ' + (state.heatSensors ? 'checked' : '') + '> Sensor points</label><label><input type="checkbox" data-action="heat-toggle" data-setting="labels" ' + (state.heatLabels ? 'checked' : '') + '> Labels</label><label><input type="checkbox" data-action="heat-toggle" data-setting="values" ' + (state.heatValues ? 'checked' : '') + '> Values</label></div>' +
      '<h2>HALL RANKING</h2><div class="heat-ranking">' + ranking + '</div><article class="selected-hall"><span>SELECTED HALL</span><h2>' + state.heatHall + '</h2><strong>' + deviations.find(function (item) { return item[0] === state.heatHall; })[1] + ' vs 23.0 °C</strong><p>Cold-aisle inlet · latest validated reading</p><div>' + routeButton('View Interior', 'viewer-tool', '', 'data-tool="slice"') + routeButton('Open in HVAC', 'module', 'primary', 'data-module="hvac"') + '</div></article>' +
      widgetMarkup('heat-matrix', 'Hall Matrix', 'Temperature deviation by hall', '<div class="heat-matrix">' + deviations.map(function (item) { return '<span class="' + (item[0] === 'H3' ? 'critical' : '') + '"><b>' + item[0] + '</b>' + item[1] + '</span>'; }).join('') + '</div>', 'compact-widget') + '</section>', 'heatmap');
  }

  function renderPlaceholder(module, view) {
    const title = view && view !== 'landing' ? moduleConfig[module].tabs.find(function (tab) { return tab[0] === view; })[1] : moduleConfig[module].title;
    const mobileRoutes = module === 'assets' && view === 'landing'
      ? '<nav class="mobile-route-menu" aria-label="Asset views">' + moduleConfig.assets.tabs.map(function (tab) {
        return routeButton(tab[1], 'subview', '', 'data-module="assets" data-view="' + tab[0] + '"');
      }).join('') + '</nav>'
      : module === 'maintenance' && view === 'landing'
        ? '<nav class="mobile-route-menu" aria-label="Maintenance views">' + routeButton('Preventive Maintenance', 'subview', '', 'data-module="maintenance" data-view="preventive"') + '</nav>'
        : '';
    renderSplitShell('<section class="split-panel placeholder-panel"><header><h1>' + title + '</h1><p>' + moduleConfig[module].subtitle + '</p></header>' + mobileRoutes + '<div class="route-placeholder"><span>' + title + '</span><p>This reference module is ready for the next connected-data phase.</p></div></section>', module + '-' + view);
  }

  function renderDocuments() {
    const system = state.selectedDocumentSystem;
    const space = state.selectedDocumentSpace;
    const term = state.documentQuery.trim().toLowerCase();
    const filtered = routeFixtures.documents.filter(function (item) {
      return (!term || item.join(' ').toLowerCase().includes(term)) && (system === 'all' || item[2] === system) && (space === 'all' || item[3] === space);
    });
    const files = filtered.map(function (item) {
      return '<article class="document-card"><span class="file-type">' + item[1] + '</span><div><h2>' + item[0] + '</h2><p>' + item[2] + ' · ' + item[3] + '</p><small>' + item[4] + '</small></div>' + routeButton('Download', 'document-download', '', 'data-document="' + item[0] + '"') + '</article>';
    }).join('') || '<p class="route-empty">No documents match these filters.</p>';
    renderSplitShell('<section class="split-panel documents-panel"><header><h1>Documents</h1><p>Engineering and operations library</p></header><label class="route-search"><span>Search</span><input id="documentSearch" type="search" placeholder="Search documents" value="' + state.documentQuery + '"></label>' +
      '<div class="document-filters"><select id="documentSystem" aria-label="Filter by system"><option value="all">All systems</option><option>HVAC</option><option>Architecture</option><option>Fire alarm</option><option>Electrical</option></select><select id="documentSpace" aria-label="Filter by space"><option value="all">All spaces</option><option>Cooling plant</option><option>Level 11 West</option><option>LV rooms</option></select></div><div class="document-list">' + files + '</div></section>', 'documents');
    const systemSelect = query('#documentSystem');
    const spaceSelect = query('#documentSpace');
    if (systemSelect) systemSelect.value = system;
    if (spaceSelect) spaceSelect.value = space;
  }

  function renderRegistrySplit() {
    const visibleAssets = assets.filter(function (asset) { return !state.registryQuery || [asset.id, asset.name, asset.system, asset.location].join(' ').toLowerCase().includes(state.registryQuery.toLowerCase()); });
    const rows = visibleAssets.map(function (asset, index) {
      const selected = state.selectedAsset === asset.id;
      return '<tr class="' + (selected ? 'active' : '') + '" data-action="asset-select" data-asset="' + asset.id + '" tabindex="0"><td><strong>' + asset.id + '</strong><small>' + asset.name + '</small></td><td><span class="state-chip ' + (asset.status === 'alarm' ? 'warning' : 'normal') + '">' + asset.status + '</span></td><td>' + (index % 3 === 0 ? 'GF' : 'L' + (index % 3)) + '</td><td>' + asset.location + '</td><td>' + asset.system + '</td><td>' + (index % 4) + '</td><td>' + asset.service + '</td><td>' + asset.health + '</td></tr>';
    }).join('');
    const selected = assets.find(function (asset) { return asset.id === state.selectedAsset; });
    const detail = selected ? '<aside class="registry-detail ' + (state.assetDetailWide ? 'wide' : '') + '"><header><div><span>' + selected.system + '</span><h2>' + selected.id + '</h2><p>' + selected.name + '</p></div>' + routeButton('×', 'close-asset-detail', '', 'aria-label="Close asset details"') + '</header><div class="registry-tabs">' + ['status', 'alarms', 'activity', 'o&m', 'warranty', 'control'].map(function (tab) { return routeButton(tab.toUpperCase(), 'asset-detail-tab', state.assetDetailTab === tab ? 'active' : '', 'data-tab="' + tab + '"'); }).join('') + '</div><dl><div><dt>Current reading</dt><dd>' + selected.reading + '</dd></div><div><dt>Health index</dt><dd>' + selected.health + '</dd></div><div><dt>Last work order</dt><dd>' + selected.service + '</dd></div><div><dt>Location</dt><dd>' + selected.location + '</dd></div></dl><div class="detail-actions">' + routeButton('Locate', 'equipment', 'primary', 'data-equipment="' + selected.id + '"') + routeButton('Create WO', 'create-work-order', '', 'data-equipment="' + selected.id + '"') + routeButton('CAFM', 'static-feedback') + routeButton(state.assetDetailWide ? 'Narrow' : 'Wide', 'asset-detail-width') + '</div></aside>' : '';
    renderSplitShell('<section class="split-panel registry-panel"><header><div>' + routeButton('‹ Assets', 'module', '', 'data-module="assets"') + '<h1>Asset Register <span>' + visibleAssets.length + '</span></h1></div><div>' + routeButton(state.compactAssets ? 'Comfortable' : 'Compact', 'asset-density') + routeButton('Views', 'static-feedback') + '</div></header><div class="registry-toolbar"><label class="route-search"><span>Search assets</span><input id="registrySearch" type="search" placeholder="Search assets" value="' + state.registryQuery + '"></label><button type="button" class="filter-chip">All equipment ×</button><button type="button" class="filter-chip">Reporting ×</button></div><div class="registry-body"><div class="registry-table-wrap"><table class="registry-table ' + (state.compactAssets ? 'compact' : '') + '"><thead><tr><th>Asset</th><th>Status</th><th>Floor</th><th>Zone</th><th>System</th><th>Open WOs</th><th>Last WO</th><th>Health</th></tr></thead><tbody>' + (rows || '<tr><td colspan="8">No assets match this search.</td></tr>') + '</tbody></table></div>' + detail + '</div></section>', 'registry', true);
  }

  function dashboardHeader(title, context, extra) {
    return '<header class="route-dashboard-header"><div><h1>' + title + '</h1><span>' + context + '</span></div><div>' + (extra || '') + routeButton(state.layoutEditing ? 'Save layout' : 'Edit layout', 'edit-layout') + '</div></header>';
  }

  function renderPowerAnalytics(focusWaste) {
    const metrics = metricMarkup('FACILITY LOAD NOW', '21.4', 'MW', 'of 30 MW design') + metricMarkup('TODAY', '278.4', 'MWh', 'to 13:00') + metricMarkup('PEAK DEMAND', '22.1', 'MW', '74% of design') + metricMarkup('POWER FACTOR', '0.94', '', 'target above 0.95', 'warning') + metricMarkup('AVOIDABLE THIS MONTH', '3,332', 'kWh', 'no tariff configured', 'warning');
    const waste = routeFixtures.opportunities.concat([['Power factor', '70.5 kWh']]).map(function (item, index) {
      return '<button type="button" data-action="widget-detail" data-detail="' + item[0] + '"><span>' + item[0] + '</span><strong>' + item[1] + '</strong>' + (index < 2 ? '<i>warning</i>' : '') + '<b>›</b></button>';
    }).join('');
    const trendBars = '<div class="stacked-bars">' + [54, 59, 62, 57, 53, 60, 66, 70, 65, 63, 68, 72, 69].map(function (value) { return '<span style="--bar:' + value + '%"><i></i><b></b><em></em></span>'; }).join('') + '</div>';
    const influencers = horizontalRows([['Data Halls', '', 70], ['Cooling Plant', '', 21], ['Afternoons', '', 17], ['H3', '', 12], ['Summer ramp', '', 8]]);
    const timeRows = horizontalRows([['Early morning 00–06', '46.0', 48], ['Morning 06–11', '33.5', 34], ['Afternoon 11–15', '36.1', 38], ['Evening 15–19', '52.4', 58], ['Night 19–24', '68.2', 74]]);
    query('#moduleContent').innerHTML = '<div class="route-dashboard power-dashboard ' + (state.layoutEditing ? 'editing' : '') + '">' + dashboardHeader('POWER ANALYTICS', 'today · live', routeButton('Model view', 'viewer-tool', '', 'data-tool="reset"') + routeButton('Back to split', 'back-power-split', 'outline')) + '<div class="route-hero five">' + metrics + '</div><div class="route-widget-grid power-widget-grid">' +
      widgetMarkup('consumers', 'CONSUMERS', 'now · total 21.4 MW', horizontalRows(routeFixtures.consumers), 'consumers-widget') +
      widgetMarkup('waste', 'WASTE AND OPPORTUNITY', '3,332 kWh avoidable this month · no tariff configured', '<div class="waste-list">' + waste + '</div>', 'waste-widget' + (focusWaste ? ' focused-widget' : '')) +
      widgetMarkup('influencers', 'KEY INFLUENCERS', 'what is driving consumption · last 30 days', influencers, 'influencer-widget') +
      widgetMarkup('energy-trend', 'ENERGY TREND', 'MW per hour · today to 13:00 · stacked by consumer', trendBars, 'energy-trend-widget') +
      widgetMarkup('peak', 'PEAK DEMAND TREND', 'MW · today · 15-minute samples', sparklineMarkup(), 'peak-widget') +
      widgetMarkup('time', 'TIME-OF-DAY PATTERN', 'Nine-day operating pattern', timeRows, 'time-widget') + '</div></div>';
  }

  function renderWaterDashboard() {
    const metrics = metricMarkup('MAKEUP WATER TODAY', '128', 'm³', 'cooling makeup · to 13:00 · MW-01') + metricMarkup('7-DAY AVERAGE DRAW', '182', 'm³/day', 'validated meter intervals') + metricMarkup('MAKEUP WATER STORAGE', '80', '%', '96 of 120 m³ · refill at 25%') + metricMarkup('DAYS OF AUTONOMY', '0.5', 'days', 'at current draw');
    const storage = '<div class="storage-visual"><div><span style="height:80%"></span></div><dl><div><dt>Capacity</dt><dd>120 m³</dd></div><div><dt>Current</dt><dd>96 m³</dd></div><div><dt>Threshold</dt><dd>25% · 30 m³</dd></div><div><dt>Last refill</dt><dd>Aug 15, 09:40</dd></div><div><dt>Supply</dt><dd>Municipal + storage</dd></div></dl></div>';
    const health = '<dl class="health-grid"><div><dt>Uptime</dt><dd>94.2%</dd><small>target 99%</small></div><div><dt>Intervals</dt><dd>53 of 56</dd></div><div><dt>Last reset</dt><dd>Aug 13</dd></div><div><dt>Last reading</dt><dd>14:05</dd></div></dl><p class="warning-strip">Intermittent meter signal</p>';
    query('#moduleContent').innerHTML = '<div class="route-dashboard water-dashboard ' + (state.layoutEditing ? 'editing' : '') + '">' + dashboardHeader('WATER', 'makeup supply · live') + '<div class="route-hero four">' + metrics + '</div><div class="route-widget-grid water-widget-grid">' + widgetMarkup('daily-water', 'DAILY MAKEUP USAGE', 'last 14 days · m³', chartMarkup('bars', [56, 62, 59, 68, 72, 64, 77, 69, 81, 74, 79, 84, 78, 70]), 'wide-widget') + widgetMarkup('water-profile', "TODAY'S PROFILE", 'actual versus typical', sparklineMarkup(), '') + widgetMarkup('water-storage', 'MAKEUP WATER STORAGE', 'four refills · current 80%', storage, '') + widgetMarkup('leaks', 'LEAK MONITORING', 'data-quality gate', '<div class="data-gate"><strong>Not yet available</strong><p>Leak detection will activate after seven consecutive days above 99% meter uptime.</p></div>', '') + widgetMarkup('meter-health', 'METER AND DATA HEALTH', 'MW-01', health, '') + '</div></div>';
  }

  function renderAnomalyDashboard() {
    const active = routeFixtures.anomalies.find(function (item) { return item.id === state.anomaly; });
    const list = routeFixtures.anomalies.map(function (item) {
      return '<button class="anomaly-row ' + item.severity + (item.id === state.anomaly ? ' active' : '') + '" type="button" data-action="anomaly-select" data-anomaly="' + item.id + '"><span class="state-chip ' + item.severity + '">' + item.severity + '</span><div><strong>' + item.id + ' · ' + item.title + '</strong><small>' + item.place + ' · since ' + item.since + '</small></div><b>' + item.value + '</b></button>';
    }).join('');
    const ranges = ['24h', '7d', '30d'].map(function (range) { return routeButton(range, 'anomaly-range', state.anomalyRange === range ? 'active' : '', 'data-range="' + range + '"'); }).join('');
    const matrix = ['Hall 1', 'Hall 2', 'Hall 3', 'Chiller Plant'].map(function (name, row) { return '<div><strong>' + name + '</strong>' + Array.from({ length: 12 }, function (_, index) { const level = row === 2 && index > 6 ? ' hot' : row === 3 && index > 8 ? ' warn' : ''; return '<i class="' + level + '"></i>'; }).join('') + '</div>'; }).join('');
    const metrics = metricMarkup('OPEN ANOMALIES', '3', '', 'one critical', 'critical') + metricMarkup('FLAGGED ENERGY TODAY', '142', 'kWh', 'attributed to active windows') + metricMarkup('AVOIDABLE THIS MONTH', '3,332', 'kWh', 'three opportunities', 'warning') + metricMarkup('POINTS MONITORED', '412 / 418', '', 'six offline');
    query('#moduleContent').innerHTML = '<div class="route-dashboard anomaly-dashboard"><div class="route-hero four">' + metrics + '</div><div class="anomaly-layout"><section class="anomaly-sidebar">' + widgetMarkup('active-anomalies', 'ACTIVE ANOMALIES', 'sorted by severity', '<div class="anomaly-list">' + list + '</div><div class="anomaly-actions">' + routeButton(state.anomalyAcknowledged ? 'Acknowledged' : 'Acknowledge', 'anomaly-ack', state.anomalyAcknowledged ? 'active' : '') + routeButton('Investigate', 'anomaly-investigate', 'primary') + '</div>', '') + widgetMarkup('basis', 'DETECTION BASIS', '', '<dl class="basis-list"><div><dt>Expected band</dt><dd>four-week seasonal</dd></div><div><dt>Points online</dt><dd>412 / 418</dd></div><div><dt>Model refresh</dt><dd>04:00</dd></div></dl>', '') + '</section><section class="anomaly-evidence">' + widgetMarkup('evidence', 'ANOMALY EVIDENCE', active.id + ' · ' + active.title, '<div class="route-segment">' + ranges + '</div><div class="evidence-chart"><span>expected band</span><i>detected window</i>' + sparklineMarkup('critical') + '</div><p><strong>' + active.value + '</strong> deviation at ' + active.place + '. The detected window began at ' + active.since + ' and remains outside the seasonal band.</p>', 'wide-widget') + widgetMarkup('deviation', 'TIME-OF-DAY DEVIATION', 'expected operating profile', '<div class="deviation-matrix">' + matrix + '</div>', 'wide-widget') + '</section></div></div>';
  }

  function renderHvacDashboard() {
    const selected = routeFixtures.hvac.find(function (item) { return item.id === state.hvacUnit; }) || routeFixtures.hvac[6];
    const tabs = ['system', 'building', 'list'].map(function (tab) { return routeButton(tab[0].toUpperCase() + tab.slice(1), 'hvac-tab', state.hvacTab === tab ? 'active' : '', 'data-tab="' + tab + '"'); }).join('');
    const loop = '<div class="route-segment">' + routeButton('Chilled water', 'hvac-loop', state.hvacLoop === 'water' ? 'active' : '', 'data-loop="water"') + routeButton('Air', 'hvac-loop', state.hvacLoop === 'air' ? 'active' : '', 'data-loop="air"') + '</div>';
    const nodes = routeFixtures.hvac.slice(0, 11).map(function (unit, index) { return '<button class="topology-node n' + index + ' ' + unit.state + (unit.id === selected.id ? ' selected' : '') + '" type="button" data-action="hvac-select" data-unit="' + unit.id + '"><strong>' + unit.id + '</strong><span>' + unit.value + '</span><i></i><small>' + unit.serves + '</small></button>'; }).join('');
    const topology = '<div class="topology-canvas"><svg viewBox="0 0 1010 648" preserveAspectRatio="none" aria-hidden="true"><path d="M120 320H280V210H430V100H620M280 320H430V230H620M280 320H430V360H620M280 320H430V500H780"/><path class="warning" d="M620 230H800"/></svg>' + nodes + '<div class="topology-legend">→ flow direction · <span>warning branch</span> · supply side shown</div></div>';
    const building = '<div class="building-view"><div class="building-floor"><span>L3</span><button data-action="hvac-select" data-unit="AHU-L3-01">AHU-L3-01</button><button class="critical" data-action="hvac-select" data-unit="VAV-L3-02">VAV-L3-02</button></div><div class="building-floor"><span>L2</span><button class="stale" data-action="hvac-select" data-unit="VAV-L2-03">VAV-L2-03</button></div><div class="building-floor"><span>L1</span><button class="warning" data-action="hvac-select" data-unit="FCU-L1-02">FCU-L1-02</button></div><div class="building-floor"><span>GF</span><button data-action="hvac-select" data-unit="FCU-GF-01">FCU-GF-01</button></div></div>';
    const list = '<div class="table-scroll"><table class="data-table hvac-table"><thead><tr><th>Unit</th><th>Type</th><th>Floor</th><th>Value</th><th>State</th></tr></thead><tbody>' + routeFixtures.hvac.map(function (unit) { return '<tr data-action="hvac-select" data-unit="' + unit.id + '" tabindex="0"><td>' + unit.id + '</td><td>' + unit.type + '</td><td>' + unit.floor + '</td><td>' + unit.value + '</td><td><span class="state-chip ' + unit.state + '">' + unit.state + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    const content = state.hvacTab === 'system' ? loop + topology : state.hvacTab === 'building' ? building : list;
    const detail = '<aside class="hvac-detail"><header><h1>' + selected.id + ' <span class="state-chip ' + selected.state + '">' + selected.state + '</span></h1><p>' + selected.floor + ' · serves ' + selected.serves + '</p></header>' + widgetMarkup('hvac-trend', 'SUPPLY TEMP, 24 H', '3 h gap', sparklineMarkup(selected.state === 'warning' ? 'warning' : ''), 'compact-widget') + '<dl class="reading-list"><div><dt>Supply air</dt><dd>' + selected.value + '</dd></div><div><dt>Setpoint</dt><dd>13.0°</dd></div><div><dt>Valve</dt><dd>78%</dd></div><div><dt>Fan</dt><dd>62%</dd></div></dl>' + (selected.state === 'warning' ? '<article class="fault-card"><strong>FAULT · Cooling coil not maintaining setpoint</strong><p>rule fcu_coil_perf · first seen 02 Aug</p><span>Est. impact ~620 kWh / mo</span></article>' : '') + '<div class="detail-actions">' + routeButton('Show in Building', 'hvac-show-building', 'primary') + routeButton('Isolate branch', 'hvac-isolate') + routeButton('Create work order', 'create-work-order', '', 'data-equipment="' + selected.id + '"') + '</div></aside>';
    query('#moduleContent').innerHTML = '<div class="hvac-workspace"><section class="hvac-main"><nav class="hvac-tabs">' + tabs + '</nav>' + content + '</section>' + detail + '</div>';
  }

  function renderPreventiveDashboard() {
    const states = ['done', 'due', 'overdue', 'none', 'record'];
    const matrix = routeFixtures.pmEquipment.map(function (equipment, row) { return '<tr><th>' + equipment + '</th>' + ['Monthly', 'Quarterly', 'Semi-annual', 'Annual'].map(function (_, column) { const status = states[(row + column) % states.length]; const key = equipment + '-' + column; return '<td><button class="pm-cell ' + status + (state.pmCell === key ? ' active' : '') + '" type="button" data-action="pm-cell" data-cell="' + key + '" data-equipment="' + equipment + '" aria-label="' + equipment + ' ' + status + '">' + (status === 'done' ? '✓' : status === 'overdue' ? '!' : status === 'due' ? '•' : '—') + '</button>' + (state.pmCell === key ? '<div class="pm-popover"><strong>' + equipment + '</strong><p>' + status + ' maintenance record</p>' + routeButton('Create Work Order', 'create-work-order', 'primary', 'data-equipment="' + equipment + '"') + '</div>' : '') + '</td>'; }).join('') + '</tr>'; }).join('');
    const trend = '<div class="pm-trend"><span class="target-line">90 target</span>' + [68, 64, 58, 66, 61, 55, 59, 62].map(function (value, index) { return '<div><i style="height:' + value + '%"></i><strong>' + value + '%</strong><small>W' + (index + 1) + '</small></div>'; }).join('') + '</div>';
    const due = [['CH-04', 'Condenser tube clean', 'Aug 22'], ['GEN-07', 'Test run', 'Aug 24'], ['CRAH-1-05', 'Filter inspection', 'Aug 26'], ['UPS-09', 'Battery check', 'Aug 28']].map(function (item) { return '<button type="button" data-action="create-work-order" data-equipment="' + item[0] + '"><code>' + item[0] + '</code><span>' + item[1] + '</span><time>' + item[2] + '</time></button>'; }).join('');
    const metrics = metricMarkup('PM COMPLIANCE', '62', '%', 'target 90%', 'warning') + metricMarkup('OPEN PM TASKS', '18', '', '8 overdue · 6 due this week · 4 scheduled') + metricMarkup('OLDEST OVERDUE', '143', 'days', 'GEN-03 annual load-bank test', 'critical') + metricMarkup('DUE NEXT 7 DAYS', '6', '', 'across five equipment');
    query('#moduleContent').innerHTML = '<div class="route-dashboard preventive-dashboard ' + (state.layoutEditing ? 'editing' : '') + '">' + dashboardHeader('PREVENTIVE MAINTENANCE', 'CAFM · last sync today 06:00') + '<div class="route-hero four">' + metrics + '</div><div class="route-widget-grid pm-widget-grid">' + widgetMarkup('pm-matrix', 'PM MATRIX', 'select a cell for record detail', '<div class="table-scroll"><table class="pm-matrix"><thead><tr><th>Equipment</th><th>Monthly</th><th>Quarterly</th><th>Semi-annual</th><th>Annual</th></tr></thead><tbody>' + matrix + '</tbody></table></div>', 'wide-widget') + widgetMarkup('pm-trend', 'COMPLETION TREND', 'W1–W8 · target 90%', trend, '') + widgetMarkup('due-week', 'DUE THIS WEEK', 'six tasks across five equipment', '<div class="due-list">' + due + '</div>', '') + widgetMarkup('data-basis', 'DATA BASIS', '', '<dl class="basis-list"><div><dt>Source</dt><dd>CAFM</dd></div><div><dt>Last sync</dt><dd>today 06:00</dd></div><div><dt>Records begin</dt><dd>Mar 2026</dd></div></dl>', '') + '</div></div>';
  }

  function renderCctvDashboard() {
    const feeds = routeFixtures.cameras.map(function (camera) { return '<article class="camera-feed"><img src="' + camera[2] + '" alt="Simulated view from ' + camera[1] + '"><header><div><strong>' + camera[0] + '</strong><span>' + camera[1] + '</span></div><div><i></i>LIVE <time data-camera-clock>08:04:59</time>' + routeButton('⛶', 'camera-fullscreen', '', 'data-camera="' + camera[0] + '" aria-label="Fullscreen ' + camera[0] + '"') + '</div></header></article>'; }).join('');
    const selected = routeFixtures.cameras.find(function (camera) { return camera[0] === state.cctvFullscreen; });
    query('#moduleContent').innerHTML = '<div class="cctv-dashboard"><header><div><h1>CCTV</h1><p>4 cameras · read-only via VMS</p></div><span><i></i>LIVE</span></header><div class="camera-grid">' + feeds + '</div><footer>Simulated prototype feeds · no live video is transmitted</footer>' + (selected ? '<div class="camera-modal" role="dialog" aria-modal="true" aria-label="' + selected[0] + ' fullscreen"><button type="button" data-action="camera-close" aria-label="Close fullscreen">×</button><img src="' + selected[2] + '" alt="Simulated fullscreen view from ' + selected[1] + '"><div><strong>' + selected[0] + '</strong><span>' + selected[1] + '</span></div></div>' : '') + '</div>';
  }

  function renderAccessDashboard() {
    const rows = routeFixtures.accessCards.map(function (row) { return '<tr><td><code>' + row[0] + '</code></td><td><strong>' + row[1] + '</strong></td><td>' + row[2] + '</td><td>' + row[3] + '</td><td>' + row[4] + '</td><td><span class="state-chip ' + row[5].toLowerCase() + '">' + row[5] + '</span></td></tr>'; }).join('');
    query('#moduleContent').innerHTML = '<div class="route-dashboard access-dashboard"><header class="route-dashboard-header"><div><h1>ACCESS CARDS</h1><span>Khazna DC · read-only</span></div></header><div class="route-hero three">' + metricMarkup('ACTIVE CARDS', '412', '', 'authorized credentials') + metricMarkup('SUSPENDED', '3', '', 'review required', 'warning') + metricMarkup('DOORS ONLINE', '24 / 24', '', 'all controllers reporting') + '</div>' + widgetMarkup('access-list', 'CARDHOLDERS', 'latest six records', '<div class="table-scroll"><table class="data-table access-table"><thead><tr><th>Card</th><th>Cardholder</th><th>Role</th><th>Access</th><th>Last seen</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'wide-widget') + '</div>';
  }

  function prepareFullRoute(route) {
    showScreen('module');
    root.dataset.route = route;
    root.dataset.layout = 'full';
    query('#moduleTitle').textContent = moduleConfig[state.module].title;
    query('#moduleSubtitle').textContent = moduleConfig[state.module].subtitle;
    query('#moduleTabs').innerHTML = '';
  }

  function renderModuleView(options) {
    const key = state.module + ':' + state.view;
    if (key === 'energy:landing') return renderEnergyLanding();
    if (key === 'energy:power' && state.powerMode === 'split') return renderPowerSplit();
    if (key === 'spaces:heatmap') return renderHeatMap();
    if (key === 'maintenance:landing' || key === 'assets:landing' || key === 'assets:workorders' || key === 'assets:analytics' || key === 'assets:rfid') return renderPlaceholder(state.module, state.view);
    if (key === 'assets:registry') return renderRegistrySplit();
    if (key === 'assets:documents') return renderDocuments();
    prepareFullRoute(key.replace(':', '-'));
    if (key === 'energy:power') renderPowerAnalytics(options && options.focusWaste);
    else if (key === 'energy:water') renderWaterDashboard();
    else if (key === 'energy:anomaly') renderAnomalyDashboard();
    else if (key === 'hvac:system') renderHvacDashboard();
    else if (key === 'maintenance:preventive') renderPreventiveDashboard();
    else if (key === 'security:cctv') renderCctvDashboard();
    else if (key === 'security:access') renderAccessDashboard();
  }

  function openModule(module, view, navigationMode) {
    if (module === 'overview') {
      state.module = 'overview';
      state.view = 'overview';
      state.expandedModule = null;
      root.dataset.module = state.module;
      showScreen('site');
      restoreOverview();
      updateNavigation();
      return;
    }
    const config = moduleConfig[module];
    if (!config) return;
    state.module = module;
    state.view = view || config.defaultView;
    if (module === 'energy' && state.view === 'power') state.powerMode = 'split';
    state.expandedModule = config.tabs.length ? (navigationMode === 'toggle' && state.expandedModule === module ? null : module) : null;
    root.dataset.module = state.module;
    renderModuleView();
    updateNavigation();
    if (state.language === 'ar') applyLanguage();
  }

  function renderAssets() {
    const term = (query('#assetSearch').value || '').trim().toLowerCase();
    const status = query('#assetStatus').value;
    const view = query('#assetView').value;
    const filtered = assets.filter(function (asset) {
      const matchesTerm = !term || [asset.id, asset.name, asset.system, asset.location].join(' ').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || asset.status === status;
      const matchesView = view === 'critical' && asset.status === 'alarm'
        || view === 'cooling' && asset.location === 'Cooling plant'
        || view === 'hall3' && asset.location === 'Hall 3';
      return matchesTerm && matchesStatus && matchesView;
    });
    const rows = query('#assetRows');
    rows.innerHTML = filtered.map(function (asset) {
      const statusClass = asset.status === 'alarm' ? 'severity-chip high' : 'read-only';
      return '<tr data-action="asset-select" data-asset="' + asset.id + '" class="' + (state.selectedAsset === asset.id ? 'active' : '') + '" tabindex="0" aria-label="Inspect ' + asset.id + '">' +
        '<td><strong>' + asset.id + '</strong><br><small>' + asset.name + '</small></td><td>' + asset.system + '</td><td>' + asset.location + '</td>' +
        '<td><span class="' + statusClass + '">' + asset.status + '</span></td><td>' + asset.service + '</td><td>›</td></tr>';
    }).join('');
    if (!filtered.length) {
      rows.innerHTML = '<tr><td colspan="6">No assets match this filter.</td></tr>';
    }
    const table = query('.asset-table');
    if (table) table.classList.toggle('compact', state.compactAssets);
  }

  function selectAsset(id) {
    const asset = assets.find(function (item) { return item.id === id; });
    if (!asset) return;
    state.selectedAsset = id;
    renderAssets();
    query('#assetDetail').innerHTML = '<span class="eyebrow">' + asset.system.toUpperCase() + '</span><h2>' + asset.id + '</h2><p>' + asset.name + '</p>' +
      '<dl><div><dt>Location</dt><dd>' + asset.location + '</dd></div><div><dt>Status</dt><dd>' + asset.status + '</dd></div>' +
      '<div><dt>Current reading</dt><dd>' + asset.reading + '</dd></div><div><dt>Health index</dt><dd>' + asset.health + '</dd></div>' +
      '<div><dt>Last service</dt><dd>' + asset.service + '</dd></div></dl>' +
      '<button type="button" data-action="equipment" data-equipment="' + asset.id + '">Locate in viewer</button>';
  }

  function renderSearch(term) {
    const value = (term || '').trim().toLowerCase();
    const matches = searchItems.filter(function (item) {
      return !value || (item.label + ' ' + item.kind).toLowerCase().includes(value);
    });
    const container = query('#searchResults');
    if (!container) return;
    container.innerHTML = matches.map(function (item, index) {
      const attributes = [
        'data-action="' + item.action + '"',
        item.module ? 'data-module="' + item.module + '"' : '',
        item.view ? 'data-view="' + item.view + '"' : '',
        item.equipment ? 'data-equipment="' + item.equipment + '"' : '',
      ].filter(Boolean).join(' ');
      return '<button class="' + (index === 0 ? 'active' : '') + '" type="button" ' + attributes + '><span>' + item.label + '</span><small>' + item.kind + '</small></button>';
    }).join('');
    if (!matches.length) container.innerHTML = '<p class="search-empty">No matching pages or assets.</p>';
  }

  function showEntity(type, id) {
    let title = id;
    let description = 'Live model context';
    let details = [];
    if (type === 'hall') {
      const hall = halls.find(function (item) { return item[0] === id; });
      if (!hall) return;
      title = 'Data Hall ' + id.slice(1);
      description = id === 'H3' ? 'Critical temperature excursion' : 'Operating within expected band';
      details = [['IT load', hall[1]], ['Cold-aisle inlet', hall[2]], ['Condition', hall[4]]];
    } else {
      const asset = assets.find(function (item) { return item.id === id; });
      title = id;
      description = asset ? asset.name : 'Connected operational equipment';
      details = asset ? [['Location', asset.location], ['Reading', asset.reading], ['Condition', asset.status]] : [['Status', 'active'], ['Source', 'Desigo CC'], ['Mode', 'read-only']];
    }
    const card = query('#entityCard');
    card.innerHTML = '<header><div><span class="eyebrow">' + type.toUpperCase() + '</span><h3>' + title + '</h3></div><button type="button" data-action="close-entity" aria-label="Close">×</button></header>' +
      '<p>' + description + '</p><dl>' + details.map(function (detail) {
        return '<div><dt>' + detail[0] + '</dt><dd>' + detail[1] + '</dd></div>';
      }).join('') + '</dl>';
    card.hidden = false;
    state.selectedEntity = id;
    dispatch('focus-entity', { type: type, id: id });
  }

  function setHistory(enabled) {
    state.history = enabled;
    root.dataset.history = enabled ? '1' : '0';
    query('#historyBanner').hidden = !enabled;
    query('#timeline').hidden = !enabled;
    if (enabled) {
      state.module = 'overview';
      state.view = 'overview';
      state.expandedModule = null;
      root.dataset.module = state.module;
      showScreen('site');
      updateNavigation();
      updateHistoryPosition(state.historyPosition);
      dispatch('history-mode', { enabled: true });
    } else {
      dispatch('history-mode', { enabled: false });
    }
  }

  function updateHistoryPosition(position) {
    state.historyPosition = Math.max(3, Math.min(97, position));
    const cursor = query('.timeline-cursor');
    if (cursor) cursor.style.left = state.historyPosition + '%';
    const track = query('.timeline-track');
    if (track) track.setAttribute('aria-valuenow', String(Math.round(state.historyPosition)));
    const minutes = Math.round((state.historyPosition / 100) * 24 * 60);
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    query('#historyTime').textContent = (state.language === 'ar' ? 'أمس، ' : 'Yesterday, ') + hours + ':' + mins;
    dispatch('history-seek', { position: state.historyPosition });
  }

  function seekTimeline(track, event) {
    const bounds = track.getBoundingClientRect();
    updateHistoryPosition(((event.clientX - bounds.left) / bounds.width) * 100);
  }

  function sendAsk(text) {
    const value = (text || '').trim();
    if (!value) return;
    openPanel('askDrawer', document.activeElement);
    const messages = query('#askMessages');
    const userMessage = document.createElement('p');
    userMessage.className = 'user-message';
    userMessage.textContent = value;
    messages.appendChild(userMessage);
    const response = document.createElement('p');
    response.className = 'assistant-message';
    const arabic = state.language === 'ar';
    if (/pue|كفاءة الطاقة/i.test(value)) {
      response.textContent = arabic
        ? 'مؤشر PUE الحالي هو 1.44، أي أعلى من الهدف 1.40 بمقدار 0.04. يعرض النموذج الثابت حملاً للمنشأة قدره 21.4 ميجاواط وحملاً لتقنية المعلومات قدره 14.9 ميجاواط.'
        : 'Current PUE is 1.44, which is 0.04 above the 1.40 target. The static reference indicates a 21.4 MW facility load and 14.9 MW IT load.';
    } else if (/hall 3|hot|القاعة 3|حارة/i.test(value)) {
      response.textContent = arabic
        ? 'درجة حرارة القاعة 3 هي 27.9°م. يرتبط التنبيه الحرج بوحدة CRAH-3-02، كما تُظهر CH-04 ارتفاعاً في فرق درجة الحرارة.'
        : 'Hall 3 is at 27.9 °C. CRAH-3-02 is the linked critical finding, with CH-04 also showing a rising approach temperature.';
    } else if (/report|تقرير/i.test(value)) {
      response.textContent = arabic
        ? 'تقرير العمليات الصباحي جاهز في هذا النموذج الثابت. سيتم ربط إنشاء التقارير المباشرة في مرحلة تكامل البيانات.'
        : 'The morning operations report is ready in this static prototype. Live report generation will be connected in the data integration phase.';
    } else {
      response.textContent = arabic
        ? 'يستخدم هذا النموذج بيانات تشغيلية ثابتة. يمكنني إرشادك إلى الصفحة أو الأصل أو سياق لوحة المعلومات ذي الصلة.'
        : 'This reference build uses static operational fixtures. I can still guide you to the related page, asset, or current dashboard context.';
    }
    delay(function () {
      messages.appendChild(response);
      messages.scrollTop = messages.scrollHeight;
    }, 180);
  }

  function toast(message) {
    const element = query('#toast');
    if (!element) return;
    window.clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = window.setTimeout(function () {
      element.hidden = true;
    }, 2400);
  }

  function setLanguage(language) {
    state.language = language === 'ar' ? 'ar' : 'en';
    root.lang = state.language;
    root.dir = state.language === 'ar' ? 'rtl' : 'ltr';
    queryAll('[data-action="language"]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.language === state.language ? 'true' : 'false');
    });
    applyLanguage();
    toast(state.language === 'ar' ? 'تم تفعيل التخطيط من اليمين إلى اليسار' : 'English layout enabled');
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = state.theme;
    if (state.language === 'ar') {
      toast(state.theme === 'dark' ? 'تم تفعيل السمة الداكنة' : 'تم تفعيل السمة الفاتحة');
    } else {
      toast(state.theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled');
    }
  }

  function updateClock() {
    const clock = query('#liveClock');
    if (!clock) return;
    clock.dateTime = new Date().toISOString();
    clock.textContent = new Intl.DateTimeFormat(state.language === 'ar' ? 'ar-AE' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
    queryAll('[data-camera-clock]').forEach(function (element) {
      element.dateTime = clock.dateTime;
      element.textContent = clock.textContent;
    });
  }

  function syncResponsiveNav() {
    if (state.navTouched) return;
    state.nav = window.innerWidth >= 760 && window.innerWidth <= 1359 ? 'min' : 'max';
    root.dataset.nav = state.nav;
  }

  function handleAction(element, event) {
    const action = element.dataset.action;
    if (action === 'module') openModule(element.dataset.module, undefined, 'toggle');
    else if (action === 'subview') openModule(element.dataset.module, element.dataset.view);
    else if (action === 'open-power-analytics' || action === 'open-waste-widget') {
      state.module = 'energy';
      state.view = 'power';
      state.powerMode = 'analytics';
      state.expandedModule = 'energy';
      root.dataset.module = 'energy';
      prepareFullRoute('energy-power');
      renderPowerAnalytics(action === 'open-waste-widget');
      updateNavigation();
    } else if (action === 'back-power-split') {
      state.powerMode = 'split';
      renderPowerSplit();
      updateNavigation();
    } else if (action === 'edit-layout') {
      state.layoutEditing = !state.layoutEditing;
      renderModuleView();
      toast(state.layoutEditing ? 'Layout editing enabled' : 'Layout saved locally');
    } else if (action === 'widget-maximize') {
      state.maximizedWidget = state.maximizedWidget === element.dataset.widget ? null : element.dataset.widget;
      renderModuleView();
    } else if (action === 'widget-detail') {
      toast(element.dataset.detail + ' detail selected');
    } else if (action === 'route-ask') {
      sendAsk('Explain ' + element.dataset.context);
    } else if (action === 'anomaly-select') {
      state.anomaly = element.dataset.anomaly;
      state.anomalyAcknowledged = false;
      renderAnomalyDashboard();
    } else if (action === 'anomaly-range') {
      state.anomalyRange = element.dataset.range;
      renderAnomalyDashboard();
    } else if (action === 'anomaly-ack') {
      state.anomalyAcknowledged = !state.anomalyAcknowledged;
      renderAnomalyDashboard();
      toast(state.anomalyAcknowledged ? 'Anomaly acknowledged locally' : 'Acknowledgement cleared');
    } else if (action === 'anomaly-investigate') {
      toast(state.anomaly + ' evidence focused');
      const evidence = query('[data-widget="evidence"]');
      if (evidence) evidence.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action === 'hvac-tab') {
      state.hvacTab = element.dataset.tab;
      renderHvacDashboard();
    } else if (action === 'hvac-loop') {
      state.hvacLoop = element.dataset.loop;
      renderHvacDashboard();
    } else if (action === 'hvac-select') {
      state.hvacUnit = element.dataset.unit;
      renderHvacDashboard();
    } else if (action === 'hvac-show-building') {
      state.hvacTab = 'building';
      renderHvacDashboard();
    } else if (action === 'hvac-isolate') {
      element.classList.toggle('active');
      toast(element.classList.contains('active') ? 'Branch isolated in the static topology' : 'Branch isolation cleared');
    } else if (action === 'create-work-order') {
      toast('Work order draft created for ' + (element.dataset.equipment || 'selected item'));
    } else if (action === 'heat-layer') {
      state.heatLayer = element.dataset.layer;
      renderHeatMap();
    } else if (action === 'heat-toggle') {
      const key = 'heat' + element.dataset.setting[0].toUpperCase() + element.dataset.setting.slice(1);
      state[key] = element.checked;
      root.dataset[element.dataset.setting] = element.checked ? '1' : '0';
    } else if (action === 'heat-hall') {
      state.heatHall = element.dataset.hall;
      renderHeatMap();
    } else if (action === 'pm-cell') {
      state.pmCell = state.pmCell === element.dataset.cell ? null : element.dataset.cell;
      renderPreventiveDashboard();
    } else if (action === 'document-download') {
      toast(element.dataset.document + ' download prepared');
    } else if (action === 'camera-fullscreen') {
      state.cctvFullscreen = element.dataset.camera;
      renderCctvDashboard();
      const modal = query('.camera-modal button');
      if (modal) modal.focus();
    } else if (action === 'camera-close') {
      state.cctvFullscreen = null;
      renderCctvDashboard();
    } else if (action === 'close-asset-detail') {
      state.selectedAsset = null;
      renderRegistrySplit();
    } else if (action === 'asset-detail-width') {
      state.assetDetailWide = !state.assetDetailWide;
      renderRegistrySplit();
    } else if (action === 'asset-detail-tab') {
      state.assetDetailTab = element.dataset.tab;
      renderRegistrySplit();
    } else if (action === 'static-feedback') {
      toast('Static reference action completed');
    }
    else if (action === 'portfolio') {
      state.module = 'overview';
      state.expandedModule = null;
      root.dataset.module = state.module;
      showScreen('portfolio');
      renderProperties();
      updateNavigation();
    } else if (action === 'settings') {
      state.expandedModule = null;
      showScreen('settings');
      updateNavigation();
    } else if (action === 'settings-section') {
      queryAll('[data-settings-pane]').forEach(function (pane) {
        pane.hidden = pane.dataset.settingsPane !== element.dataset.section;
      });
      queryAll('[data-action="settings-section"]').forEach(function (button) {
        button.classList.toggle('active', button === element);
      });
    } else if (action === 'toggle-panel') togglePanel(element.dataset.panel, element);
    else if (action === 'close-panel') closePanels(null, true);
    else if (action === 'toggle-nav') {
      state.navTouched = true;
      state.nav = state.nav === 'max' ? 'min' : 'max';
      root.dataset.nav = state.nav;
    } else if (action === 'language') setLanguage(element.dataset.language);
    else if (action === 'theme') toggleTheme();
    else if (action === 'co-brand') {
      const active = element.getAttribute('aria-pressed') !== 'true';
      element.setAttribute('aria-pressed', active ? 'true' : 'false');
      element.textContent = active ? 'EKO · Partner' : 'Co-brand';
    } else if (action === 'viewer-tool') {
      if (element.dataset.tool === 'select') {
        queryAll('[data-action="viewer-tool"]').forEach(function (button) { button.classList.remove('active'); });
        element.classList.add('active');
      } else if (element.dataset.tool === 'slice') {
        element.classList.toggle('active');
      }
      dispatch('viewer-tool', { tool: element.dataset.tool });
      if (element.dataset.tool === 'reset') toast('Viewer camera reset requested');
      if (element.dataset.tool === 'slice') toast('Section view request sent to the viewer');
    } else if (action === 'alerts-layer') {
      state.alerts = !state.alerts;
      root.dataset.alerts = state.alerts ? '1' : '0';
      element.classList.toggle('active', state.alerts);
      element.setAttribute('aria-pressed', state.alerts ? 'true' : 'false');
      dispatch(action, { enabled: state.alerts });
    } else if (action === 'severity') {
      const levels = ['all', 'critical', 'high'];
      state.severity = levels[(levels.indexOf(state.severity) + 1) % levels.length];
      root.dataset.severity = state.severity;
      element.classList.toggle('active', state.severity !== 'all');
      element.setAttribute('aria-label', state.language === 'ar' ? 'تصفية الخطورة: ' + state.severity : 'Severity filter: ' + state.severity);
      toast(state.language === 'ar' ? 'تصفية التنبيهات: ' + state.severity : 'Alert filter: ' + state.severity);
      dispatch(action, { severity: state.severity });
    } else if (action === 'hall') {
      showEntity('hall', element.dataset.hall);
    } else if (action === 'equipment') {
      closePanels();
      state.module = 'overview';
      state.expandedModule = null;
      root.dataset.module = state.module;
      showScreen('site');
      updateNavigation();
      showEntity('equipment', element.dataset.equipment);
    } else if (action === 'close-entity') {
      query('#entityCard').hidden = true;
      state.selectedEntity = null;
    } else if (action === 'history') setHistory(true);
    else if (action === 'back-live') setHistory(false);
    else if (action === 'previous-event') updateHistoryPosition(state.historyPosition - 18);
    else if (action === 'next-event') updateHistoryPosition(state.historyPosition + 18);
    else if (action === 'timeline-seek') seekTimeline(element, event);
    else if (action === 'ask-prompt') {
      if (/generate|report|تقرير/i.test(element.textContent)) openPanel('reportModal', element);
      else sendAsk(element.textContent);
    } else if (action === 'generate-report') {
      element.disabled = true;
      element.textContent = 'Generating…';
      delay(function () {
        closePanels();
        toast('Report saved to the library');
        element.disabled = false;
        element.textContent = 'Generate report';
      }, 650);
    }
    else if (action === 'ask-context') {
      const title = moduleConfig[state.module].title;
      sendAsk(state.language === 'ar' ? 'اشرح عرض ' + (arabicText[title] || title) + ' الحالي' : 'Explain the current ' + title + ' view');
    }
    else if (action === 'portfolio-sort') {
      state.propertySort = element.dataset.sort;
      queryAll('[data-action="portfolio-sort"]').forEach(function (button) { button.classList.toggle('active', button === element); });
      renderProperties();
    } else if (action === 'property') {
      query('.property-trigger strong').textContent = element.dataset.property;
      closePanels();
      state.module = 'overview';
      showScreen('site');
      updateNavigation();
      toast(element.dataset.property + ' selected');
      dispatch('property-change', { property: element.dataset.property });
    } else if (action === 'asset-select') {
      state.selectedAsset = element.dataset.asset;
      if (state.module === 'assets' && state.view === 'registry') renderRegistrySplit();
      else selectAsset(element.dataset.asset);
    }
    else if (action === 'asset-density') {
      state.compactAssets = !state.compactAssets;
      element.textContent = state.compactAssets ? 'Comfortable density' : 'Compact density';
      if (state.module === 'assets' && state.view === 'registry') renderRegistrySplit();
      else renderAssets();
    } else if (action === 'asset-export') toast('Static asset register export prepared');
    else if (action === 'report-download') toast('Report download prepared');
    else if (action === 'placeholder') {
      toast(state.language === 'ar' ? 'هذا الإجراء غير متاح في النموذج الثابت.' : element.dataset.message || 'This action is not available in the static reference.');
    }
    else if (action === 'toggle-subscription') {
      const active = !element.classList.contains('active');
      element.classList.toggle('active', active);
      element.textContent = active ? 'Subscribed' : 'Subscribe';
    }
  }

  function handleClick(event) {
    if (state.suppressClick) {
      state.suppressClick = false;
      event.preventDefault();
      return;
    }
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement || !root.contains(actionElement)) {
      if (state.activePanel && !event.target.closest('#' + state.activePanel)) closePanels();
      return;
    }
    handleAction(actionElement, event);
    if (state.language === 'ar') applyLanguage();
  }

  function handlePointerDown(event) {
    const track = event.target.closest('[data-action="timeline-seek"]');
    if (track) {
      state.timelineDragging = true;
      track.setPointerCapture(event.pointerId);
      seekTimeline(track, event);
      return;
    }
    if (event.pointerType !== 'touch' || !(event.target instanceof Element)) return;
    const scroller = event.target.closest('.site-scroll');
    if (!scroller || event.target.closest('.model-stage')) return;
    state.scrollGesture = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: scroller.scrollTop,
      scroller: scroller,
      target: event.target,
      moved: false,
    };
    event.target.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (state.timelineDragging) {
      const track = query('.timeline-track');
      if (track) seekTimeline(track, event);
      return;
    }
    const gesture = state.scrollGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const distance = gesture.startY - event.clientY;
    if (Math.abs(distance) > 4) gesture.moved = true;
    gesture.scroller.scrollTop = gesture.scrollTop + distance;
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (state.timelineDragging) {
      state.timelineDragging = false;
      const track = query('.timeline-track');
      if (track && track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      return;
    }
    const gesture = state.scrollGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    state.suppressClick = gesture.moved && event.type !== 'pointercancel';
    if (gesture.target.hasPointerCapture(event.pointerId)) gesture.target.releasePointerCapture(event.pointerId);
    state.scrollGesture = null;
  }

  function handleWheel(event) {
    if (!(event.target instanceof Element) || event.target.closest('.model-stage')) return;
    const scroller = event.target.closest('.site-scroll');
    if (!scroller) return;
    const next = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + event.deltaY));
    if (next === scroller.scrollTop) return;
    scroller.scrollTop = next;
    event.preventDefault();
  }

  function handleOutsidePointer(event) {
    if (!state.activePanel || !(event.target instanceof Element)) return;
    const panel = query('#' + state.activePanel);
    const trigger = event.target.closest('[data-panel="' + state.activePanel + '"]');
    if (panel && !panel.contains(event.target) && !trigger) closePanels();
  }

  function handleInput(event) {
    if (event.target.id === 'globalSearch') renderSearch(event.target.value);
    if (event.target.id === 'assetSearch' || event.target.id === 'assetStatus' || event.target.id === 'assetView') renderAssets();
    if (event.target.id === 'documentSearch') {
      state.documentQuery = event.target.value;
      renderDocuments();
      const input = query('#documentSearch');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    if (event.target.id === 'documentSystem') {
      state.selectedDocumentSystem = event.target.value;
      renderDocuments();
    }
    if (event.target.id === 'documentSpace') {
      state.selectedDocumentSpace = event.target.value;
      renderDocuments();
    }
    if (event.target.id === 'registrySearch') {
      state.registryQuery = event.target.value;
      renderRegistrySplit();
      const input = query('#registrySearch');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    if (state.language === 'ar') applyLanguage();
  }

  function handleSubmit(event) {
    if (event.target.id !== 'askForm' && event.target.id !== 'askDrawerForm') return;
    event.preventDefault();
    const input = event.target.id === 'askForm' ? query('#askInput') : query('#askDrawerInput');
    sendAsk(input.value);
    input.value = '';
  }

  function handleKeydown(event) {
    if (!root.contains(event.target)) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName);
    const searchOpen = state.activePanel === 'searchPalette';
    if (state.activePanel && event.key === 'Tab') {
      const panel = query('#' + state.activePanel);
      const focusable = panel ? queryAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]', panel).filter(function (element) {
        return element.getClientRects().length > 0;
      }) : [];
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel('searchPalette', document.activeElement);
    } else if (searchOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const results = queryAll('#searchResults button');
      const activeIndex = results.findIndex(function (button) { return button.classList.contains('active'); });
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (activeIndex + offset + results.length) % results.length;
      results.forEach(function (button, index) { button.classList.toggle('active', index === nextIndex); });
    } else if (searchOpen && event.key === 'Enter') {
      const activeResult = query('#searchResults button.active');
      if (activeResult) {
        event.preventDefault();
        activeResult.click();
      }
    } else if (event.key === 'Escape') {
      if (state.cctvFullscreen) {
        state.cctvFullscreen = null;
        renderCctvDashboard();
      }
      if (state.maximizedWidget) {
        state.maximizedWidget = null;
        renderModuleView();
      }
      closePanels(null, true);
      const entity = query('#entityCard');
      if (entity) entity.hidden = true;
    } else if (!typing && (event.key === 'Enter' || event.key === ' ') && event.target.matches('.property-card[data-action], [data-action="asset-select"]')) {
      event.preventDefault();
      handleAction(event.target, event);
    } else if (event.target.matches('.timeline-track') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      updateHistoryPosition(state.historyPosition + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 18 : 2));
    } else if (event.target.matches('.timeline-track') && event.key === 'Home') {
      event.preventDefault();
      updateHistoryPosition(3);
    } else if (event.target.matches('.timeline-track') && event.key === 'End') {
      event.preventDefault();
      setHistory(false);
    } else if (!typing && event.key === '[') {
      state.navTouched = true;
      state.nav = state.nav === 'max' ? 'min' : 'max';
      root.dataset.nav = state.nav;
    } else if (!typing && event.key.toLowerCase() === 't') {
      toggleTheme();
    } else if (!typing && event.shiftKey && event.key.toLowerCase() === 'r') {
      setLanguage(state.language === 'ar' ? 'en' : 'ar');
    } else if (!typing && event.key.toLowerCase() === 'r') {
      dispatch('viewer-tool', { tool: 'reset' });
      toast('Viewer camera reset requested');
    } else if (!typing && event.key === '?') {
      openPanel('helpDialog', document.activeElement);
    }
  }

  function init() {
    if (initialized) return;
    root = document.querySelector('#ekoDashboard');
    if (!root) return;
    initialized = true;
    controller = new AbortController();
    root.addEventListener('click', handleClick, { signal: controller.signal });
    root.addEventListener('pointerdown', handlePointerDown, { signal: controller.signal });
    root.addEventListener('pointermove', handlePointerMove, { signal: controller.signal });
    root.addEventListener('pointerup', handlePointerUp, { signal: controller.signal });
    root.addEventListener('pointercancel', handlePointerUp, { signal: controller.signal });
    root.addEventListener('wheel', handleWheel, { passive: false, signal: controller.signal });
    root.addEventListener('input', handleInput, { signal: controller.signal });
    root.addEventListener('change', handleInput, { signal: controller.signal });
    root.addEventListener('submit', handleSubmit, { signal: controller.signal });
    document.addEventListener('pointerdown', handleOutsidePointer, { capture: true, signal: controller.signal });
    document.addEventListener('keydown', handleKeydown, { signal: controller.signal });
    window.addEventListener('resize', syncResponsiveNav, { signal: controller.signal });
    const overviewInsights = query('.insights');
    overviewInsightsMarkup = overviewInsights ? overviewInsights.innerHTML : '';
    syncResponsiveNav();
    renderHallRows();
    renderProperties();
    renderIntegrations();
    renderSystemRows();
    renderSearch('');
    renderAssets();
    updateNavigation();
    updateClock();
    clockTimer = window.setInterval(updateClock, 1000);
  }

  function destroy() {
    if (controller) controller.abort();
    window.clearInterval(clockTimer);
    window.clearTimeout(toastTimer);
    pendingTimers.forEach(function (timer) { window.clearTimeout(timer); });
    pendingTimers.clear();
    controller = null;
    clockTimer = null;
    toastTimer = null;
    state.timelineDragging = false;
    state.scrollGesture = null;
    state.suppressClick = false;
    initialized = false;
    if (root) closePanels();
    root = null;
  }

  window.Dashboard = {
    init: init,
    destroy: destroy,
    navigate: openModule,
    setHistory: setHistory,
  };

  window.queueMicrotask(init);
}());
