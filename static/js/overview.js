
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

    Chart.defaults.color = 'rgba(255, 255, 255, 0.55)';
    Chart.defaults.font.family = "'DM Sans', sans-serif";

    this.initCharts();
    this.initToggles();

    window.addEventListener('dashboard-event', (e) => {
      if (e.detail.event === 'fin-data-updated') {
        this.updateData(e.detail.data);
      }
    });
  },

// CHARTS
  initCharts() {
    const energyCtx = document.getElementById('energyTrendChart');
    if (energyCtx) {
      this.charts.energyTrend = new Chart(energyCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              display: true,
              position: 'bottom',
              labels: {
                color: 'rgba(255, 255, 255, 0.65)',
                usePointStyle: true,
                boxWidth: 6,
                padding: 12,
                font: { size: 11, family: "'DM Sans', sans-serif" }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(8, 16, 24, 0.92)',
              titleColor: '#fff',
              bodyColor: '#ccc',
              borderColor: 'rgba(255,255,255,0.12)',
              borderWidth: 1,
              padding: 12
            }
          },
          scales: {
            x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
          }
        }
      });
    }

    this.charts.waterTrend  = this.createBarChart('waterTrendChart',  'Water (L)',    'rgba(59, 130, 246, 0.7)', '#3b82f6');
    this.charts.gasTrend    = this.createBarChart('gasTrendChart',    'Gas (Therms)', 'rgba(239, 68, 68, 0.7)',  '#ef4444');
    
    this.initUsageChart();
    this.initLocChart();
  },

  initLocChart() {
    const ctx = document.getElementById('locChart');
    if (!ctx) return;
    
    this.charts.locChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#3b82f6', '#ef4444', '#f97316', '#10b981', '#06b6d4', 
            '#eab308', '#6366f1', '#8b5cf6', '#d946ef'
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        onClick: (event, elements, chart) => {
            if (elements && elements.length > 0) {
                const index = elements[0].index;
                const label = chart.data.labels[index];
                if (window.activeEquipmentFilter === label) {
                    window.activeEquipmentFilter = null;
                } else {
                    window.activeEquipmentFilter = label;
                }
            } else {
                window.activeEquipmentFilter = null;
            }
            if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
                window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
            }
        },
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
        }
      }
    });
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
            const subtitle = document.getElementById(`subtitle-${chartId}`);
            if (subtitle) subtitle.textContent = '';
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
    setText('overview-val-co2',           power.avg_co2,          2);
    setText('overview-val-carbon',        power.carbon_emission,  2);
    setText('overview-val-epr',           5.2,                    2);

    const setStatus = (id, currentVal, baselineVal) => {
      const el = document.getElementById(id);
      if (el) {
        if (currentVal > baselineVal) {
          el.textContent = 'Above';
          el.className = 'status-badge status-above';
        } else {
          el.textContent = 'Below';
          el.className = 'status-badge status-below';
        }
        el.style.visibility = 'visible';
        el.style.display = 'inline-flex';
      }
    };

    setStatus('overview-status-power', power.total_power, 250);
    setStatus('overview-status-co2', power.avg_co2, 600);

    const fs = power.facilityServices || {};
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

    const extractData = (hisData, mode, canvasId) => {
      if (!hisData) return { labels: [], data: [] };
      const labels = [], data = [];

      if (mode === 'date picker' || mode === 'start/end') {
        const canvas = document.getElementById(canvasId);
        if (mode === 'date picker' && canvas?.dataset.selectedDate) {
            const d = new Date(canvas.dataset.selectedDate);
            const y = d.getFullYear().toString();
            const m = d.toLocaleString('en-US', { month: 'long' }).toLowerCase();
            const dayKey = `${m} ${d.getDate()}`;
            
            const dayData = hisData[y]?.[m]?.[dayKey];
            if (dayData) {
                for (const [hour, v] of Object.entries(dayData)) {
                    if (v !== null) { labels.push(hour); data.push(parseFloat(v)); }
                }
                return { labels, data };
            }
        } else if (mode === 'start/end' && canvas?.dataset.selectedRange?.includes(' to ')) {
            const [startStr, endStr] = canvas.dataset.selectedRange.split(' to ');
            const s = new Date(startStr);
            const e = new Date(endStr);
            s.setHours(0,0,0,0);
            e.setHours(23,59,59,999);
            
            for (const [year, months] of Object.entries(hisData)) {
                for (const [month, days] of Object.entries(months)) {
                    for (const [dayKey, hours] of Object.entries(days)) {
                        const d = new Date(`${dayKey} ${year}`);
                        if (d >= s && d <= e) {
                            let sum = 0, count = 0;
                            for (const v of Object.values(hours)) {
                                if (v !== null) { sum += parseFloat(v); count++; }
                            }
                            if (count) {
                                labels.push(dayKey);
                                data.push(+sum.toFixed(2));
                            }
                        }
                    }
                }
            }
            if (labels.length > 0) return { labels, data };
        }
        // Fallback to defaults if no matching data found for the date
        mode = mode === 'date picker' ? 'hourly' : 'daily';
      }

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
        const { labels, data } = extractData(history[historyKey], mode, canvasId);
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
      }
      chart.update('none');
    };

    const updateEnergyTrend = () => {
      const chart = this.charts.energyTrend;
      if (!chart) return;
      
      const mode = document.getElementById('energyTrendChart')?.dataset.viewMode || 'monthly';
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
      const bgColors = [
          'rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(249, 115, 22, 0.7)', 
          'rgba(16, 185, 129, 0.7)', 'rgba(6, 182, 212, 0.7)', 'rgba(234, 179, 8, 0.7)', 
          'rgba(99, 102, 241, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(217, 70, 239, 0.7)'
      ];
      const borderColors = [
          '#3b82f6', '#ef4444', '#f97316', '#10b981', '#06b6d4', 
          '#eab308', '#6366f1', '#8b5cf6', '#d946ef'
      ];
      
      let globalLabels = [];
      const newDatasets = [];
      let i = 0;
      
      for (const [label, jsonKey] of Object.entries(metricKeys)) {
          const histData = history[jsonKey];
          if (!histData) {
              newDatasets.push({
                  label: label,
                  data: [0, 0, 0, 0, 0, 0],
                  backgroundColor: bgColors[i],
                  borderColor: borderColors[i],
                  borderWidth: 1,
                  hidden: window.activeEquipmentFilter ? window.activeEquipmentFilter !== label : false
              });
          } else {
              const { labels, data } = extractData(histData, mode, 'energyTrendChart');
              if (labels.length > globalLabels.length) globalLabels = labels;
              newDatasets.push({
                  label: label,
                  data: data,
                  backgroundColor: bgColors[i],
                  borderColor: borderColors[i],
                  borderWidth: 1,
                  hidden: window.activeEquipmentFilter ? window.activeEquipmentFilter !== label : false
              });
          }
          i++;
      }
      
      if (globalLabels.length === 0) globalLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      chart.data.labels = globalLabels;
      chart.data.datasets = newDatasets;
      
      // --- Update Top Metrics dynamically based on Energy Trend mode ---
      let currentTotal = 0;
      let prevTotal = 0;
      if (newDatasets.length > 0 && globalLabels.length > 0) {
          const lastIdx = globalLabels.length - 1;
          const prevIdx = globalLabels.length > 1 ? lastIdx - 1 : 0;
          
          newDatasets.forEach(ds => {
              if (ds.data[lastIdx]) currentTotal += ds.data[lastIdx];
              if (ds.data[prevIdx] && prevIdx !== lastIdx) prevTotal += ds.data[prevIdx];
          });
      }
      
      const currentLabelEl = document.getElementById('top-metric-current-label');
      const prevLabelEl = document.getElementById('top-metric-prev-label');
      
      if (currentLabelEl && prevLabelEl) {
          if (mode === 'hourly') {
              currentLabelEl.textContent = 'This Hour';
              prevLabelEl.textContent = 'Previous Hour';
          } else if (mode === 'daily') {
              currentLabelEl.textContent = 'Today';
              prevLabelEl.textContent = 'Yesterday';
          } else {
              currentLabelEl.textContent = 'This Month';
              prevLabelEl.textContent = 'Previous Month';
          }
      }
      
      const setTopVal = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = parseFloat(val).toFixed(2);
      };
      setTopVal('overview-val-current-month', currentTotal);
      setTopVal('overview-val-prev-month', prevTotal);
      // -----------------------------------------------------------------

      chart.update('none');

      const resetBtn = document.getElementById('reset-trend-btn');
      if (resetBtn) {
          resetBtn.style.display = window.activeEquipmentFilter ? 'inline-block' : 'none';
          if (!resetBtn.dataset.listenerAttached) {
              resetBtn.addEventListener('click', () => {
                  window.activeEquipmentFilter = null;
                  if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
                      window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
                  }
              });
              resetBtn.dataset.listenerAttached = 'true';
          }
      }
    };

    updateEnergyTrend();
    updateOne('waterTrend',  'waterTrendChart',  'Water_Consumption_his');
    updateOne('gasTrend',    'gasTrendChart',    'Gas_Consumption_his');
    
    if (this.charts.usageLine && history) {
        this.updateUsageChart(history);
    }
    
    if (this.charts.locChart && history) {
        this.updateLocChart(history);
    }
  },

  updateLocChart(historyData) {
    if (!this.charts.locChart || !historyData) return;

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

    const sumPeriod = (h) => {
        if (!h) return 0;
        
        const canvas = document.getElementById('energyTrendChart');
        let mode = canvas?.dataset.viewMode || 'monthly';
        const sDate = canvas?.dataset.selectedDate;
        const sRange = canvas?.dataset.selectedRange;

        let total = 0;
        const sumDay = (dayData) => {
            if (!dayData) return 0;
            let sum = 0;
            Object.values(dayData).forEach(v => {
                if (v !== null) sum += parseFloat(v) || 0;
            });
            return sum;
        };

        const now = new Date();
        const cy = String(now.getFullYear());

        if (mode === 'date picker' && sDate) {
            const d = new Date(sDate);
            const y = d.getFullYear().toString();
            const m = d.toLocaleString('en-US', { month: 'long' }).toLowerCase();
            const dayKey = `${m} ${d.getDate()}`;
            total = sumDay(h[y]?.[m]?.[dayKey]);
            if (total > 0) return total;
            mode = 'hourly'; // fallback
        } else if (mode === 'start/end' && sRange?.includes(' to ')) {
            const [startStr, endStr] = sRange.split(' to ');
            const s = new Date(startStr); s.setHours(0,0,0,0);
            const e = new Date(endStr); e.setHours(23,59,59,999);
            
            for (const [year, months] of Object.entries(h)) {
                for (const [month, days] of Object.entries(months)) {
                    for (const [dayKey, hours] of Object.entries(days)) {
                        const d = new Date(`${dayKey} ${year}`);
                        if (d >= s && d <= e) total += sumDay(hours);
                    }
                }
            }
            if (total > 0) return total;
            mode = 'daily'; // fallback
        }

        const yearData = h[cy] || Object.values(h).at(-1);
        if (!yearData) return 0;

        if (mode === 'yearly') {
            for (const months of Object.values(yearData)) {
                for (const days of Object.values(months)) {
                    total += sumDay(days);
                }
            }
            return total;
        }

        const lastMonthKey = Object.keys(yearData).at(-1);
        const monthData = yearData[lastMonthKey];
        if (!monthData) return 0;

        if (mode === 'monthly') {
            for (const days of Object.values(monthData)) {
                total += sumDay(days);
            }
            return total;
        }

        const lastDayKey = Object.keys(monthData).at(-1);
        const dayData = monthData[lastDayKey];
        if (!dayData) return 0;

        if (mode === 'daily') {
            return sumDay(dayData);
        }

        if (mode === 'hourly') {
            const hours = Object.keys(dayData);
            for (let i = hours.length - 1; i >= 0; i--) {
                const val = dayData[hours[i]];
                if (val !== null && val !== undefined) {
                    return parseFloat(val) || 0;
                }
            }
            return 0;
        }

        return 0;
    };

    const sortedLabels = [];
    const locData = [];
    let totalPmuEnergy = 0;
    const breakdownItems = [];
    const bgColors = this.charts.locChart.data.datasets[0].backgroundColor;

    let i = 0;
    for (const [label, jsonKey] of Object.entries(metricKeys)) {
        let val = sumPeriod(historyData[jsonKey]);
        sortedLabels.push(label);
        locData.push(val);
        totalPmuEnergy += val;
        breakdownItems.push({ label: label, val: val, color: bgColors[i % bgColors.length] });
        i++;
    }

    this.charts.locChart.data.labels = sortedLabels;
    this.charts.locChart.data.datasets[0].data = locData;
    this.charts.locChart.update('none');

    const breakdownContainer = document.getElementById('pmu-breakdown-container');
    if (breakdownContainer) {
        breakdownContainer.innerHTML = '';
        breakdownItems.sort((a,b) => b.val - a.val);
        
        breakdownItems.forEach(item => {
            const percentage = totalPmuEnergy > 0 ? ((item.val / totalPmuEnergy) * 100).toFixed(0) : 0;
            const displayVal = Number(item.val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kWh';
            
            const div = document.createElement('div');
            div.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            div.style.borderRadius = '6px';
            div.style.padding = '8px 12px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.border = '1px solid rgba(255,255,255,0.05)';
            div.style.borderLeft = `3px solid ${item.color}`;
            div.style.marginBottom = '6px';
            
            div.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-family: var(--font-display); font-size: 13px; font-weight: 500; color: #e2e8f0;">${item.label}</span>
                    <span style="font-family: var(--font-body); font-size: 11px; color: #94a3b8;">${percentage}% of Total</span>
                </div>
                <div style="font-family: var(--font-display); font-size: 13px; font-weight: 600; color: #fff;">
                    ${displayVal}
                </div>
            `;
            breakdownContainer.appendChild(div);
        });
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

window.setUsagePeriod = function(period) {
    window.currentUsagePeriod = period;

    document.querySelectorAll('.usage-btn').forEach(btn => {
        btn.classList.remove('active');
    });

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

    const slider = document.getElementById('usage-zoom-slider');
    if (slider) slider.value = 100;

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

    const resetBtn = document.getElementById('usage-reset-btn');
    if (resetBtn) {
        resetBtn.style.display = period === 'today' ? 'none' : 'flex';
    }

    if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
        window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
    }
};


//  POPUP PICKER FOR TREND CHARTS (VIEW 1)
window.openChartPopupPicker = function(event, btn, type, chartId) {
    if (event) {
        event.stopPropagation();
        event.stopImmediatePropagation(); // Prevent the generic toggle listener on the same element from running
    }

    const group = btn.closest('.toggle-group');
    
    // Remove any existing popup
    const existing = document.querySelector('.chart-date-popup');
    if (existing) existing.remove();

    // Create popup dialog
    const popup = document.createElement('div');
    popup.className = 'chart-date-popup';
    
    const isRange = type === 'range';
    popup.innerHTML = `
        <div class="chart-date-popup-overlay"></div>
        <div class="chart-date-popup-box">
            <div class="chart-date-popup-title">${isRange ? 'Select Date Range' : 'Select Date'}</div>
            <div class="chart-date-popup-inputs">
                ${isRange ? `
                    <label>Start Date<input type="date" id="chart-popup-start" /></label>
                    <label>End Date<input type="date" id="chart-popup-end" /></label>
                ` : `
                    <label>Date<input type="date" id="chart-popup-date" /></label>
                `}
            </div>
            <div class="chart-date-popup-actions">
                <button id="chart-popup-cancel">Cancel</button>
                <button id="chart-popup-apply">Apply</button>
            </div>
        </div>
    `;
    
    // Append to body to avoid Chrome backdrop-filter bugs with native date pickers
    const container = document.fullscreenElement || document.body;
    container.appendChild(popup);

    // Constrain the popup to visually cover ONLY the dashboard
    const dashboard = document.getElementById('overviewDashboard');
    if (dashboard) {
        const rect = dashboard.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = rect.top + 'px';
        popup.style.left = rect.left + 'px';
        popup.style.width = rect.width + 'px';
        popup.style.height = rect.height + 'px';
    }

    if (isRange) {
        const startInput = popup.querySelector('#chart-popup-start');
        const endInput = popup.querySelector('#chart-popup-end');
        if (startInput && endInput) {
            startInput.addEventListener('change', (e) => {
                if (e.target.value) endInput.min = e.target.value;
            });
            endInput.addEventListener('change', (e) => {
                if (e.target.value) startInput.max = e.target.value;
            });
        }
    }

    // Close on overlay click or cancel
    popup.querySelector('.chart-date-popup-overlay').addEventListener('click', () => popup.remove());
    popup.querySelector('#chart-popup-cancel').addEventListener('click', () => popup.remove());

    // Apply button
    popup.querySelector('#chart-popup-apply').addEventListener('click', () => {
        const canvas = document.getElementById(chartId);
        
        if (isRange) {
            let startVal = document.getElementById('chart-popup-start').value;
            let endVal = document.getElementById('chart-popup-end').value;
            if (!startVal || !endVal) return;
            
            if (new Date(startVal) > new Date(endVal)) {
                const temp = startVal;
                startVal = endVal;
                endVal = temp;
            }
            
            if (canvas) {
                canvas.dataset.viewMode = 'start/end';
                canvas.dataset.selectedRange = startVal + ' to ' + endVal;
            }
            const sDate = new Date(startVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const eDate = new Date(endVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const subtitle = document.getElementById(`subtitle-${chartId}`);
            if (subtitle) subtitle.textContent = `${sDate} - ${eDate}`;
        } else {
            const dateVal = document.getElementById('chart-popup-date').value;
            if (!dateVal) return;
            
            if (canvas) {
                canvas.dataset.viewMode = 'date picker';
                canvas.dataset.selectedDate = dateVal;
            }
            const dStr = new Date(dateVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const subtitle = document.getElementById(`subtitle-${chartId}`);
            if (subtitle) subtitle.textContent = dStr;
        }

        // Update active styling
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Trigger chart update
        if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
            window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
        }

        popup.remove();
    });
};

//  DATE PICKER
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
            setTimeout(() => { try { input.showPicker(); } catch(e) { input.focus(); } }, 50);
        }
    }
};


//  START/END RANGE 
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

        const startInput = document.getElementById('usage-start-date');
        const endInput   = document.getElementById('usage-end-date');
        
        if (startInput) {
            setTimeout(() => { try { startInput.focus(); } catch(e) {} }, 50);
        }
    }
};



window.handleUsageDateSelect = function(dateStr) {
    if (!dateStr) return;
    window.currentUsagePeriod = 'picker';

    document.querySelectorAll('.usage-btn').forEach(btn => btn.classList.remove('active'));
    const pickerBtn = document.getElementById('usage-picker-btn');
    if (pickerBtn) pickerBtn.classList.add('active');

    const resetBtn = document.getElementById('usage-reset-btn');
    if (resetBtn) resetBtn.style.display = 'flex';

    if (window.OverviewDashboard && window.OverviewDashboard.charts.usageLine) {
        window.OverviewDashboard.charts.usageLine.targetDate = dateStr;
    }
    if (window.OverviewDashboard && window.OverviewDashboard.lastPowerData) {
        window.OverviewDashboard.updateCharts(window.OverviewDashboard.lastPowerData);
    }
};


window.handleRangeSelect = function() {
    const startInput = document.getElementById('usage-start-date');
    const endInput   = document.getElementById('usage-end-date');
    let startStr = startInput?.value;
    let endStr   = endInput?.value;
    
    if (startStr && endInput) endInput.min = startStr;
    if (endStr && startInput) startInput.max = endStr;
    
    if (!startStr || !endStr) return;

    if (new Date(startStr) > new Date(endStr)) {
        const temp = startStr;
        startStr = endStr;
        endStr = temp;
    }

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


//  ZOOM SLIDER

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
