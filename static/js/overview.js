// OVERVIEW DASHBOARD LOGIC
// Always reset so re-injection of the HTML doesn't block re-init
if (window.OverviewDashboard && window.OverviewDashboard.initialized) {
  window.OverviewDashboard.initialized = false;
}

const OverviewDashboard = {
  initialized: false,
  charts: {},
  lastPowerData: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[OverviewDashboard] Initialized');

    // Set Chart.js defaults for dark theme
    Chart.defaults.color = 'rgba(255, 255, 255, 0.55)';
    Chart.defaults.font.family = "'DM Sans', sans-serif";

    this.initCharts();
    this.initToggles();

    // Listen for FIN live data
    window.addEventListener('dashboard-event', (e) => {
      if (e.detail.event === 'fin-data-updated') {
        this.updateData(e.detail.data);
      }
    });
  },

  // ─── CHART CREATION ─────────────────────────────────────────
  initCharts() {
    this.charts.energyTrend = this.createBarChart('energyTrendChart', 'Energy (kWh)', 'rgba(0, 240, 255, 0.7)', '#00f0ff');
    this.charts.waterTrend  = this.createBarChart('waterTrendChart',  'Water (L)',    'rgba(59, 130, 246, 0.7)', '#3b82f6');
    this.charts.gasTrend    = this.createBarChart('gasTrendChart',    'Gas (Therms)', 'rgba(239, 68, 68, 0.7)',  '#ef4444');
    
    // View 2 Detailed Analysis Chart
    this.initUsageChart();
  },

  initUsageChart() {
    const ctx = document.getElementById('usageLineChart');
    if (!ctx) return;
    
    const datasets = [
      { label: 'AHU Usage', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, fill: true },
      { label: 'FCU Usage', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.4, fill: true },
      { label: 'Lighting Usage', data: [], borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', tension: 0.4, fill: true },
      { label: 'Power Usage', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
      { label: 'VAV Usage', data: [], borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.1)', tension: 0.4, fill: true },
      { label: 'Boiler Usage', data: [], borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)', tension: 0.4, fill: true },
      { label: 'Chiller Usage', data: [], borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', tension: 0.4, fill: true },
      { label: 'CT Usage', data: [], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', tension: 0.4, fill: true },
      { label: 'Pumps Usage', data: [], borderColor: '#d946ef', backgroundColor: 'rgba(217, 70, 239, 0.1)', tension: 0.4, fill: true }
    ];

    this.charts.usageLine = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(8, 16, 24, 0.92)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  },

  createBarChart(canvasId, label, bgColor, borderColor) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) { console.warn('[OverviewDashboard] Canvas not found:', canvasId); return null; }

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label,
          data: [],
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
          borderRadius: 4,
          hoverBackgroundColor: borderColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(8, 16, 24, 0.92)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { maxTicksLimit: 12, maxRotation: 0 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true
          }
        }
      }
    });
  },

  // ─── FORCE RE-PAINT (called when dashboard becomes visible) ──
  redrawCharts() {
    Object.values(this.charts).forEach(c => {
      if (!c) return;
      c.resize();
      c.update('none');
    });
    if (this.lastPowerData) {
      this.updateCharts(this.lastPowerData);
    }
  },

  // ─── TOGGLE BUTTONS ─────────────────────────────────────────
  initToggles() {
    document.querySelectorAll('.toggle-group').forEach(group => {
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          const chartId = group.dataset.targetChart;
          if (chartId) {
            document.getElementById(chartId).dataset.viewMode = e.target.textContent.trim().toLowerCase();
          }
          if (this.lastPowerData) this.updateCharts(this.lastPowerData);
        });
      });
    });
  },

  // ─── TOP METRICS UPDATE ───────────────────────────────────
  updateData(liveData) {
    if (!document.getElementById('overviewDashboard')) return;

    const power = liveData.power;
    if (!power) return;

    this.lastPowerData = power;

    const setText = (id, val, digits = 0) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) {
        el.textContent = parseFloat(val).toFixed(digits);
      }
    };

    setText('overview-val-power',         power.total_power,      2);
    setText('overview-val-current-month', power.current_month,    2);
    setText('overview-val-prev-month',    power.previous_month,   2);
    setText('overview-val-co2',           power.avg_co2,          2);
    setText('overview-val-carbon',        power.carbon_emission,  2);
    setText('overview-val-epr',           5.2,                    2);

    // Update View 2 KPIs based on facilityServices if available, else fallback
    const fs = power.facilityServices || {};
    // Calculate total waste from overnight + hvac + power factor + load imbalance (mocked for now since not in fs)
    const waste = (power.total_power * 0.15); // mock 15% waste
    const cost = waste * 0.44; // 0.44 AED per kWh
    
    setText('total-waste-kwh', waste, 0);
    setText('total-cost-aed', cost, 0);

    // Populate action item wastes
    const p15 = power.total_power * 0.15 * 0.15; // 15% of 15% waste
    const p5  = power.total_power * 0.15 * 0.05; // 5% of 15% waste
    const p27 = power.total_power * 0.15 * 0.27; // 27% of 15% waste
    
    setText('opt-overnight-kwh', p15, 0);
    setText('opt-overnight-aed', p15 * 0.44, 0);
    setText('opt-hvac-kwh', p15, 0);
    setText('opt-hvac-aed', p15 * 0.44, 0);
    setText('opt-power-kwh', p5, 0);
    setText('opt-power-aed', p5 * 0.44, 0);
    setText('opt-load-kwh', p27, 0);
    setText('opt-load-aed', p27 * 0.44, 0);

    this.updateCharts(power);
  },

  // ─── CHART DATA UPDATE ────────────────────────────────────
  updateCharts(power) {
    const history = power.power_history || {};

    const extractData = (hisData, mode) => {
      if (!hisData) return { labels: [], data: [] };
      const labels = [], data = [];

      if (mode === 'yearly') {
        for (const [year, months] of Object.entries(hisData)) {
          let sum = 0, count = 0;
          for (const days of Object.values(months))
            for (const hours of Object.values(days))
              for (const v of Object.values(hours))
                if (v !== null) { sum += parseFloat(v); count++; }
          if (count) { labels.push(year); data.push(+sum.toFixed(2)); }
        }
        return { labels, data };
      }

      const currentYear = new Date().getFullYear().toString();
      const yearData = hisData[currentYear] || Object.values(hisData)[0];
      if (!yearData) return { labels, data };

      if (mode === 'monthly') {
        for (const [month, days] of Object.entries(yearData)) {
          let sum = 0, count = 0;
          for (const hours of Object.values(days))
            for (const v of Object.values(hours))
              if (v !== null) { sum += parseFloat(v); count++; }
          if (count) { labels.push(month.substring(0, 3)); data.push(+sum.toFixed(2)); }
        }
      } else if (mode === 'daily') {
        const lastMonth = Object.keys(yearData).at(-1);
        for (const [day, hours] of Object.entries(yearData[lastMonth] || {})) {
          let sum = 0, count = 0;
          for (const v of Object.values(hours))
            if (v !== null) { sum += parseFloat(v); count++; }
          if (count) {
            // day is like "2026 Jan 01" — extract just day number
            labels.push(day.split(' ').at(-1));
            data.push(+sum.toFixed(2));
          }
        }
      } else if (mode === 'hourly') {
        const lastMonth = Object.keys(yearData).at(-1);
        const monthData = yearData[lastMonth] || {};
        const lastDay = Object.keys(monthData).at(-1);
        for (const [hour, v] of Object.entries(monthData[lastDay] || {})) {
          if (v !== null) { labels.push(hour); data.push(parseFloat(v)); }
        }
      }

      return { labels, data };
    };

    const updateOne = (chartKey, canvasId, historyKey) => {
      const chart = this.charts[chartKey];
      if (!chart) return;

      const mode = document.getElementById(canvasId)?.dataset.viewMode || 'monthly';

      if (!history[historyKey]) {
        // No data — show placeholder zeros
        chart.data.labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        chart.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
      } else {
        const { labels, data } = extractData(history[historyKey], mode);
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
      }
      chart.update();
    };

    updateOne('energyTrend', 'energyTrendChart', 'Total_Power_Consumption_his');
    updateOne('waterTrend',  'waterTrendChart',  'Water_Consumption_his');
    updateOne('gasTrend',    'gasTrendChart',    'Gas_Consumption_his');
    
    // Update Usage Chart with real FIN data
    if (this.charts.usageLine && history) {
        this.updateUsageChart(history);
    }
  },

  updateUsageChart(historyData) {
      if (!this.charts.usageLine || !historyData) return;
      
      const usageChart = this.charts.usageLine;
      const currentPeriod = window.currentUsagePeriod || 'today';

      const metricKeys = {
          'AHU Usage': 'AHU_Usage_his',
          'FCU Usage': 'FCU_Usage_his',
          'Lighting Usage': 'Lighting_Usage_his',
          'Power Usage': 'Power_Usage_his',
          'VAV Usage': 'VAV_Consumption_his',
          'Boiler Usage': 'BOILER_Usage_his',
          'Chiller Usage': 'CHILLER_Usage_his',
          'CT Usage': 'COOLING_TOWER_Usage_his',
          'Pumps Usage': 'PUMPs_Usage_his'
      };

      const labels = [];
      const fullLabels = [];
      const datasetsData = {
          'AHU Usage': [], 'FCU Usage': [], 'Lighting Usage': [], 'Power Usage': [],
          'VAV Usage': [], 'Boiler Usage': [], 'Chiller Usage': [], 'CT Usage': [], 'Pumps Usage': []
      };

      const hourOrder = ['12 am', '1 am', '2 am', '3 am', '4 am', '5 am', '6 am', '7 am', '8 am', '9 am', '10 am', '11 am',
          '12 pm', '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm', '7 pm', '8 pm', '9 pm', '10 pm', '11 pm'];
      const monthOrder = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

      if (currentPeriod === 'today' || currentPeriod === 'picker') {
          let y, m, dKey;
          if (currentPeriod === 'picker' && usageChart.targetDate) {
              const dateStr = usageChart.targetDate.includes('-') ? usageChart.targetDate.replace(/-/g, '\/') : usageChart.targetDate;
              const date = new Date(dateStr);
              y = date.getFullYear().toString();
              m = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
              dKey = `${m} ${date.getDate()}`;
          } else {
              const ref = historyData['Total_Power_Consumption_his'];
              if (!ref) return;
              const years = Object.keys(ref).sort().reverse();
              if (!years.length) return;
              y = years[0];
              const months = Object.keys(ref[y]).sort((a, b) => monthOrder.indexOf(b.toLowerCase()) - monthOrder.indexOf(a.toLowerCase()));
              m = months[0];
              const days = Object.keys(ref[y][m]).sort((a, b) => parseInt(b.split(' ')[1]) - parseInt(a.split(' ')[1]));
              dKey = days[0];
          }

          let maxHour = 24;
          const now = new Date();
          const todayM = now.toLocaleString('en-US', { month: 'long' }).toLowerCase();
          const todayDK = `${todayM} ${now.getDate()}`;
          if (currentPeriod === 'today' && y === now.getFullYear().toString() && dKey === todayDK) {
              maxHour = now.getHours() + 1;
          }

          for (let h = 0; h < maxHour; h++) {
              const hLabel = h.toString().padStart(2, '0') + ':00';
              labels.push(hLabel);
              fullLabels.push(`${hLabel} - ${dKey} ${y}`);
              const hourKey = hourOrder[h];
              
              for (const [label, jsonKey] of Object.entries(metricKeys)) {
                  const val = (historyData[jsonKey] && historyData[jsonKey][y] && historyData[jsonKey][y][m] && historyData[jsonKey][y][m][dKey])
                      ? parseFloat(historyData[jsonKey][y][m][dKey][hourKey]) || 0
                      : 0;
                  datasetsData[label].push(val);
              }
          }
          
          const statusEl = document.getElementById('usage-status');
          if (statusEl) statusEl.textContent = `SHOWING DATA FOR: ${dKey.toUpperCase()}, ${y}`;
          
      } else {
          // Week, Month, Range
          let start, end;
          if (currentPeriod === 'range' && usageChart.targetRange) {
              const startStr = usageChart.targetRange.start.includes('-') ? usageChart.targetRange.start.replace(/-/g, '\/') : usageChart.targetRange.start;
              const endStr = usageChart.targetRange.end.includes('-') ? usageChart.targetRange.end.replace(/-/g, '\/') : usageChart.targetRange.end;
              start = new Date(startStr);
              end = new Date(endStr);
          } else if (currentPeriod === 'week') {
              end = new Date();
              start = new Date();
              start.setDate(end.getDate() - 6);
          } else {
              const now = new Date();
              end = new Date();
              start = new Date(now.getFullYear(), now.getMonth(), 1);
          }

          const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          for (let i = 0; i < diff; i++) {
              const date = new Date(start);
              date.setDate(start.getDate() + i);
              const y = date.getFullYear().toString();
              const mName = date.toLocaleString('en-US', { month: 'long' }).toLowerCase();
              const dk = `${mName} ${date.getDate()}`;

              labels.push(date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
              fullLabels.push(date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }));

              for (const [label, jsonKey] of Object.entries(metricKeys)) {
                  let total = 0;
                  if (historyData[jsonKey] && historyData[jsonKey][y] && historyData[jsonKey][y][mName] && historyData[jsonKey][y][mName][dk]) {
                      total = Object.values(historyData[jsonKey][y][mName][dk]).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                  }
                  datasetsData[label].push(total);
              }
          }
          
          const statusEl = document.getElementById('usage-status');
          if (statusEl) {
              const opt = {month: 'short', day: 'numeric', year: 'numeric'};
              const startStr = start.toLocaleDateString('en-US', opt).toUpperCase();
              const endStr = end.toLocaleDateString('en-US', opt).toUpperCase();
              if (currentPeriod === 'month') {
                  statusEl.textContent = `SHOWING DATA FOR: ${start.toLocaleString('en-US', {month: 'long'}).toUpperCase()} ${start.getFullYear()}`;
              } else {
                  statusEl.textContent = `SHOWING DATA FOR: ${startStr} - ${endStr}`;
              }
          }
          
      }

      usageChart.data.labels = labels;
      usageChart.fullLabels = fullLabels;
      usageChart.data.datasets.forEach(ds => {
          if (datasetsData[ds.label]) {
              ds.data = datasetsData[ds.label];
              ds._fullData = [...ds.data];
          }
      });
      usageChart._fullData = { labels: [...labels], fullLabels: [...fullLabels] };
      usageChart.update('none');
  }
};

window.OverviewDashboard = OverviewDashboard;

window.currentUsagePeriod = 'today';

// ──────────────────────────────────────────────
//  USAGE PERIOD BUTTON CONTROL
// ──────────────────────────────────────────────
window.setUsagePeriod = function(period) {
    window.currentUsagePeriod = period;

    // Update active states on all .usage-btn
    document.querySelectorAll('.usage-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Match by text content
    document.querySelectorAll('.usage-btn').forEach(btn => {
        const t = btn.textContent.trim().toLowerCase();
        let match = false;
        if (period === 'today' && t === 'today') match = true;
        else if (period === 'week' && t.includes('week')) match = true;
        else if (period === 'month' && t.includes('month')) match = true;
        else if (period === 'picker' && (t.includes('date') || t.includes('picker'))) match = true;
        else if (period === 'range' && t.includes('start')) match = true;
        if (match) btn.classList.add('active');
    });

    // Reset zoom slider
    const slider = document.getElementById('usage-zoom-slider');
    if (slider) slider.value = 100;

    // Handle range/picker input visibility and reset
    if (period !== 'range') {
        const rangeEl = document.getElementById('range-inputs');
        if (rangeEl) rangeEl.style.display = 'none';
        const sDate = document.getElementById('usage-start-date');
        const eDate = document.getElementById('usage-end-date');
        if (sDate) { sDate.value = ''; if(sDate._flatpickr) sDate._flatpickr.clear(); }
        if (eDate) { eDate.value = ''; if(eDate._flatpickr) eDate._flatpickr.clear(); }
    }
    
    if (period !== 'picker') {
        const pickerEl = document.getElementById('date-picker-input');
        if (pickerEl) pickerEl.style.display = 'none';
        const dateInput = document.getElementById('usage-date-input');
        if (dateInput) { dateInput.value = ''; if(dateInput._flatpickr) dateInput._flatpickr.clear(); }
    }

    // Show/hide reset button
    const resetBtn = document.getElementById('usage-reset-btn');
    if (resetBtn) {
        resetBtn.style.display = period === 'today' ? 'none' : 'flex';
    }

    if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
        window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
    }
};

// ──────────────────────────────────────────────
//  DATE PICKER TOGGLE (flatpickr if available)
// ──────────────────────────────────────────────
window.toggleDatePicker = function() {
    const pickerEl = document.getElementById('date-picker-input');
    const rangeEl  = document.getElementById('range-inputs');
    if (!pickerEl) return;

    const isVisible = pickerEl.style.display !== 'none' && pickerEl.style.display !== '';
    if (isVisible) {
        pickerEl.style.display = 'none';
    } else {
        pickerEl.style.display = 'flex';
        if (rangeEl) rangeEl.style.display = 'none';

        document.querySelectorAll('.usage-btn').forEach(btn => btn.classList.remove('active'));
        const pickerBtn = document.getElementById('usage-picker-btn');
        if (pickerBtn) pickerBtn.classList.add('active');
        const resetBtn = document.getElementById('usage-reset-btn');
        if (resetBtn) resetBtn.style.display = 'flex';

        const input = document.getElementById('usage-date-input');
        if (input) {
            // Use flatpickr if loaded, else native
            if (window.flatpickr && !input._flatpickr) {
                window.flatpickr(input, {
                    dateFormat: 'Y-m-d',
                    theme: 'dark',
                    defaultDate: 'today',
                    onChange: function(selectedDates, dateStr) {
                        window.handleUsageDateSelect(dateStr);
                    }
                });
            } else if (input._flatpickr) {
                input._flatpickr.open();
            } else {
                // native date input fallback
                setTimeout(() => { try { input.showPicker(); } catch(e) { input.focus(); } }, 50);
            }
        }
    }
};

// ──────────────────────────────────────────────
//  START/END RANGE TOGGLE (flatpickr if available)
// ──────────────────────────────────────────────
window.toggleRangeInputs = function() {
    const rangeEl  = document.getElementById('range-inputs');
    const pickerEl = document.getElementById('date-picker-input');
    if (!rangeEl) return;

    const isVisible = rangeEl.style.display !== 'none' && rangeEl.style.display !== '';
    if (isVisible) {
        rangeEl.style.display = 'none';
    } else {
        rangeEl.style.display = 'flex';
        if (pickerEl) pickerEl.style.display = 'none';

        document.querySelectorAll('.usage-btn').forEach(btn => btn.classList.remove('active'));
        const rangeBtn = document.getElementById('usage-range-btn');
        if (rangeBtn) rangeBtn.classList.add('active');
        const resetBtn = document.getElementById('usage-reset-btn');
        if (resetBtn) resetBtn.style.display = 'flex';

        // Init flatpickr on range inputs if available
        const startInput = document.getElementById('usage-start-date');
        const endInput   = document.getElementById('usage-end-date');
        if (window.flatpickr) {
            if (startInput && !startInput._flatpickr) {
                window.flatpickr(startInput, {
                    dateFormat: 'Y-m-d',
                    theme: 'dark',
                    onChange: function() { window.handleRangeSelect(); }
                });
            }
            if (endInput && !endInput._flatpickr) {
                window.flatpickr(endInput, {
                    dateFormat: 'Y-m-d',
                    theme: 'dark',
                    onChange: function() { window.handleRangeSelect(); }
                });
            }
        }
        if (startInput && !startInput._flatpickr) {
            setTimeout(() => { try { startInput.focus(); } catch(e) {} }, 50);
        }
    }
};

// ──────────────────────────────────────────────
//  HANDLE DATE SELECTION
// ──────────────────────────────────────────────
window.handleUsageDateSelect = function(dateStr) {
    if (!dateStr) return;
    window.currentUsagePeriod = 'picker';

    document.querySelectorAll('.usage-btn').forEach(btn => btn.classList.remove('active'));
    const pickerBtn = document.getElementById('usage-picker-btn');
    if (pickerBtn) pickerBtn.classList.add('active');

    const resetBtn = document.getElementById('usage-reset-btn');
    if (resetBtn) resetBtn.style.display = 'flex';

    // Store target date on chart for data update
    if (window.OverviewDashboard && window.OverviewDashboard.charts.usageLine) {
        window.OverviewDashboard.charts.usageLine.targetDate = dateStr;
    }
    if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
        window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
    }
};

// ──────────────────────────────────────────────
//  HANDLE START/END RANGE SELECTION
// ──────────────────────────────────────────────
window.handleRangeSelect = function() {
    const startStr = document.getElementById('usage-start-date')?.value;
    const endStr   = document.getElementById('usage-end-date')?.value;
    if (!startStr || !endStr) return;

    window.currentUsagePeriod = 'range';

    document.querySelectorAll('.usage-btn').forEach(btn => btn.classList.remove('active'));
    const rangeBtn = document.getElementById('usage-range-btn');
    if (rangeBtn) rangeBtn.classList.add('active');

    const resetBtn = document.getElementById('usage-reset-btn');
    if (resetBtn) resetBtn.style.display = 'flex';

    if (window.OverviewDashboard && window.OverviewDashboard.charts.usageLine) {
        window.OverviewDashboard.charts.usageLine.targetRange = { start: startStr, end: endStr };
    }
    if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
        window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
    }
};

// ──────────────────────────────────────────────
//  ZOOM SLIDER
// ──────────────────────────────────────────────
window.handleUsageZoom = function(val) {
    const chart = window.OverviewDashboard && window.OverviewDashboard.charts.usageLine;
    if (!chart || !chart._fullData) return;

    const total = chart._fullData.labels.length;
    const count = Math.max(2, Math.floor((val / 100) * total));

    chart.data.labels = chart._fullData.labels.slice(0, count);
    chart.data.datasets.forEach(ds => {
        ds.data = (ds._fullData || ds.data).slice(0, count);
    });
    chart.update('none');
};

// ──────────────────────────────────────────────
//  TOGGLE DATASET VISIBILITY
// ──────────────────────────────────────────────
window.toggleUsageDataset = function(label, legendItem) {
    const chart = window.OverviewDashboard && window.OverviewDashboard.charts.usageLine;
    if (!chart) return;

    const dsIndex = chart.data.datasets.findIndex(ds => ds.label === label);
    if (dsIndex > -1) {
        const meta = chart.getDatasetMeta(dsIndex);
        meta.hidden = meta.hidden === null ? !chart.data.datasets[dsIndex].hidden : null;
        chart.update();
        legendItem.classList.toggle('hidden');
    }
};
