import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatasetService } from '../../../core/services/dataset.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, ChartOptions, Chart, registerables } from 'chart.js';
import { FormsModule } from '@angular/forms';
import JSZip from 'jszip';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private datasetService = inject(DatasetService);
  private cdr = inject(ChangeDetectorRef);

  public datasets: any[] = [];
  public selectedDatasetId: string = '';
  public selectedDatasetName: string = '';
  
  public isLoading: boolean = false;
  public errorMessage: string = '';

  // KPI mappings
  public kpis: any = null;

  // Chart Mappings
  public barChartData: ChartConfiguration<'bar'>['data'] | null = null;
  public pieChartData: any = null;
  public lineChartData: ChartConfiguration<'line'>['data'] | null = null;
  public scatterChartData: ChartConfiguration<'scatter'>['data'] | null = null;
  public histogramChartData: ChartConfiguration<'bar'>['data'] | null = null;
  public stackedBarChartData: ChartConfiguration<'bar'>['data'] | null = null;
  public rangeChartData: ChartConfiguration<'bar'>['data'] | null = null;
  public semicircleChartData: any = null;

  public activeChartTypes: string[] = ['bar', 'pie', 'line', 'scatter', 'bar', 'pie'];
  
  // Interaction Filters State
  public selectedFilterLabel: string | null = null;
  public availableFilters: string[] = [];
  public baseColors = ['#0bc184', '#6633cc', '#ff9900', '#00b4d8', '#ff4d4f', '#0bc184'];

  public exportMenuOpen: boolean = false;

  // Global styling options for sleek dark mode charts
  public globalChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8c92a0',
    onClick: (event, elements, chart) => this.onChartClick(event, elements, chart),
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#8c92a0', usePointStyle: true, boxWidth: 6 }
      }
    },
    scales: {
      x: { 
        border: { display: false },
        grid: { display: false }, 
        ticks: { color: '#8c92a0' } 
      },
      y: { 
        border: { display: false, dash: [5, 5] },
        grid: { color: 'rgba(255,255,255,0.1)' }, 
        ticks: { color: '#8c92a0' }, 
        beginAtZero: true 
      }
    }
  };

  public pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8c92a0',
    onClick: (event, elements, chart) => this.onChartClick(event, elements, chart),
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8c92a0', usePointStyle: true, boxWidth: 6 } }
    }
  };

  public doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8c92a0',
    onClick: (event, elements, chart) => this.onChartClick(event, elements, chart),
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8c92a0', usePointStyle: true, boxWidth: 6 } }
    },
    cutout: '60%' // creates Donut shape matching mockup
  };

  public stackedBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8c92a0',
    onClick: (event, elements, chart) => this.onChartClick(event, elements, chart),
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8c92a0', usePointStyle: true, boxWidth: 6 } }
    },
    scales: {
      x: { stacked: true, border: { display: false }, grid: { display: false }, ticks: { color: '#8c92a0' } },
      y: { stacked: true, border: { display: false, dash: [5, 5] }, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#8c92a0' }, beginAtZero: true }
    }
  };

  public semicircleOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8c92a0',
    onClick: (event, elements, chart) => this.onChartClick(event, elements, chart),
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8c92a0', usePointStyle: true, boxWidth: 6 } }
    },
    cutout: '60%',
    circumference: 180,
    rotation: 270
  };

  ngOnInit() {
    this.fetchDatasets();
  }

  fetchDatasets() {
    this.datasetService.getDatasets().subscribe({
      next: (res) => {
        this.datasets = res || [];
        if (this.datasets.length > 0) {
          this.selectDataset(this.datasets[0]);
        }
      },
      error: (err) => console.error(err)
    });
  }

  onDatasetSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    const ds = this.datasets.find(d => d._id === target.value || d.id === target.value);
    if (ds) this.selectDataset(ds);
  }

  selectDataset(ds: any) {
    this.selectedDatasetId = ds._id || ds.id;
    this.selectedDatasetName = ds.name;
    this.loadAiCharts();
  }

  loadAiCharts() {
    if (!this.selectedDatasetId) return;
    this.isLoading = true;
    this.errorMessage = '';
    
    this.datasetService.getAiChart(this.selectedDatasetId).subscribe({
      next: (res) => {
        this.kpis = res.kpis;
        this.mapChartData(res.charts);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to successfully trigger the Python analytics processing engine endpoint (GET /:id/ai-chart).';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  setChartType(index: number | any, type: string) {
    this.activeChartTypes[index] = type;
    this.cdr.detectChanges();
  }

  // --- INTERACTION LOGIC --- //
  hexToRgba(hex: string, alpha: number) {
    if (!hex) return 'rgba(0,0,0,0.1)';
    if (hex.startsWith('rgba')) return hex.replace(/[\d\.]+\)$/g, `${alpha})`);
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }

  getHighlightColors(labels: any[], baseColors: string | string[], filterLabel: string | null): string | string[] {
    if (!filterLabel) return baseColors;
    return labels.map((l, i) => {
      const bColor = Array.isArray(baseColors) ? baseColors[i % baseColors.length] : baseColors;
      if (l === filterLabel) {
        return bColor; 
      } else {
        return this.hexToRgba(bColor, 0.2); 
      }
    });
  }

  onFilterSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    const label = target.value;
    this.applyFilter(label === '' ? null : label);
  }

  clearFilter() {
    this.applyFilter(null);
  }

  applyFilter(label: string | null) {
    this.selectedFilterLabel = label;
    
    if (this.barChartData && this.barChartData.datasets[0] && this.barChartData.labels) {
      this.barChartData.datasets[0].backgroundColor = this.getHighlightColors(this.barChartData.labels as any, this.baseColors, label);
      this.barChartData = { ...this.barChartData };
    }

    if (this.pieChartData && this.pieChartData.datasets[0] && this.pieChartData.labels) {
      this.pieChartData.datasets[0].backgroundColor = this.getHighlightColors(this.pieChartData.labels as any, this.baseColors, label);
      this.pieChartData = { ...this.pieChartData };
    }

    if (this.lineChartData && this.lineChartData.datasets[0] && this.lineChartData.labels) {
       const lineColors = this.getHighlightColors(this.lineChartData.labels as any, '#2eb89e', label);
       this.lineChartData.datasets[0].pointBackgroundColor = lineColors;
       this.lineChartData.datasets[0].pointBorderColor = lineColors;
       this.lineChartData.datasets[0].pointRadius = (this.lineChartData.labels as any[]).map(l => l === label ? 8 : 4);
       this.lineChartData = { ...this.lineChartData };
    }

    if (this.histogramChartData && this.histogramChartData.datasets[0] && this.histogramChartData.labels) {
      this.histogramChartData.datasets[0].backgroundColor = this.getHighlightColors(this.histogramChartData.labels as any, this.baseColors, label);
      this.histogramChartData = { ...this.histogramChartData };
    }

    if (this.stackedBarChartData && this.stackedBarChartData.datasets && this.stackedBarChartData.labels) {
      this.stackedBarChartData.datasets.forEach(ds => {
        ds.backgroundColor = this.getHighlightColors(this.stackedBarChartData!.labels as any, typeof ds.backgroundColor === 'string' ? ds.backgroundColor : this.baseColors, label);
      });
      this.stackedBarChartData = { ...this.stackedBarChartData };
    }

    if (this.rangeChartData && this.rangeChartData.datasets[0] && this.rangeChartData.labels) {
      this.rangeChartData.datasets[0].backgroundColor = this.getHighlightColors(this.rangeChartData.labels as any, this.baseColors, label);
      this.rangeChartData = { ...this.rangeChartData };
    }

    if (this.semicircleChartData && this.semicircleChartData.datasets[0] && this.semicircleChartData.labels) {
      this.semicircleChartData.datasets[0].backgroundColor = this.getHighlightColors(this.semicircleChartData.labels as any, this.baseColors, label);
      this.semicircleChartData = { ...this.semicircleChartData };
    }

    this.cdr.detectChanges();
  }

  onChartClick(event: any, elements: any[], chart: Chart) {
    if (elements && elements.length > 0) {
      const index = elements[0].index;
      const label = chart.data.labels ? (chart.data.labels[index] as string) : null;
      if (label) {
        this.applyFilter(label === this.selectedFilterLabel ? null : label);
      }
    } else {
      this.applyFilter(null);
    }
  }

  aggregateByYearIfDate(labels: string[], data: number[]) {
    if (!labels || labels.length === 0) return { labels, data };

    const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/; // roughly YYYY-MM-DD or DD/MM/YYYY
    const hasDates = labels.some(l => dateRegex.test(String(l)));

    if (!hasDates) {
      return { labels, data };
    }

    const yearMap = new Map<string, number>();
    
    labels.forEach((label, i) => {
      let strLabel = String(label);
      let yearLabel = strLabel;
      if (dateRegex.test(strLabel)) {
        const d = new Date(strLabel);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth() + 1;
          yearLabel = `${d.getFullYear()}-${m.toString().padStart(2, '0')}`;
        }
      }
      
      const val = data[i] || 0;
      if (yearMap.has(yearLabel)) {
        yearMap.set(yearLabel, yearMap.get(yearLabel)! + val);
      } else {
        yearMap.set(yearLabel, val);
      }
    });

    const aggregatedLabels = Array.from(yearMap.keys()).sort();
    const aggregatedData = aggregatedLabels.map(y => yearMap.get(y)!);

    return { labels: aggregatedLabels, data: aggregatedData };
  }

  mapChartData(charts: any) {
    if (!charts) return;

    // Build slicer filter pool from all available label arrays
    const labelPool = new Set<string>();
    ['bar', 'pie', 'line', 'doughnut', 'histogram', 'semicircle', 'range']
      .forEach(k => { if (charts[k]?.labels) charts[k].labels.forEach((l: string) => labelPool.add(l)); });
    this.availableFilters = Array.from(labelPool);

    // ── 1. BAR ──────────────────────────────────────────────────────────────
    if (charts.bar) {
      this.barChartData = {
        labels: charts.bar.labels,
        datasets: [{
          data: charts.bar.data,
          label: charts.bar.title,
          backgroundColor: this.baseColors,
          borderWidth: 0,
          borderRadius: 4
        }]
      };
    }

    // ── 2. PIE (Distribution / Area) ────────────────────────────────────────
    if (charts.pie) {
      this.pieChartData = {
        labels: charts.pie.labels,
        datasets: [{
          data: charts.pie.data,
          backgroundColor: this.baseColors,
          borderWidth: 0
        }]
      };
    }

    // ── 3. LINE (Product vs int) ─────────────────────────────────────────────
    if (charts.line) {
      this.lineChartData = {
        labels: charts.line.labels,
        datasets: [{
          data: charts.line.data,
          label: charts.line.title,
          borderColor: '#2eb89e',
          backgroundColor: '#2eb89e',
          pointBackgroundColor: '#2eb89e',
          pointBorderColor: '#2eb89e',
          pointRadius: 4,
          borderWidth: 3,
          fill: false,
          tension: 0.4
        }]
      };
    }

    // ── 4. SCATTER (Variance Correlation) ────────────────────────────────────
    if (charts.scatter) {
      this.scatterChartData = {
        datasets: [{
          data: charts.scatter.data,
          label: charts.scatter.title,
          backgroundColor: '#00b4d8',
          pointRadius: 5
        }]
      };
    }

    // ── 5. DOUGHNUT (Profit / Revenue) — real data from Python ────────────────
    if (charts.doughnut) {
      this.pieChartData = {
        labels: charts.doughnut.labels,
        datasets: [{
          data: charts.doughnut.data,
          backgroundColor: this.baseColors,
          borderWidth: 0
        }]
      };
    }

    // ── 6. HISTOGRAM (Expected density buckets) ──────────────────────────────
    if (charts.histogram) {
      this.histogramChartData = {
        labels: charts.histogram.labels,
        datasets: [{
          data: charts.histogram.data,
          label: charts.histogram.title,
          backgroundColor: this.baseColors,
          borderWidth: 1,
          borderColor: '#1C1E26',
          barPercentage: 1.0,
          categoryPercentage: 1.0
        }]
      };
    } else if (charts.bar) {
      // Fallback: use bar data as histogram if Python doesn't send it
      this.histogramChartData = {
        labels: charts.bar.labels,
        datasets: [{
          data: charts.bar.data,
          label: 'Distribution Density',
          backgroundColor: this.baseColors,
          borderWidth: 1,
          borderColor: '#1C1E26',
          barPercentage: 1.0,
          categoryPercentage: 1.0
        }]
      };
    }

    // ── 7. SEMICIRCLE (Product Comparison) ──────────────────────────────────
    if (charts.semicircle) {
      this.semicircleChartData = {
        labels: charts.semicircle.labels,
        datasets: [{
          data: charts.semicircle.data,
          backgroundColor: this.baseColors,
          borderWidth: 0
        }]
      };
    } else if (charts.pie) {
      this.semicircleChartData = {
        labels: charts.pie.labels.slice(0, 5),
        datasets: [{
          data: charts.pie.data.slice(0, 5),
          backgroundColor: this.baseColors,
          borderWidth: 0
        }]
      };
    }

    // ── 8. RANGE (Date-driven [min, max] intervals from Python) ─────────────
    if (charts.range) {
      this.rangeChartData = {
        labels: charts.range.labels,
        datasets: [{
          data: charts.range.data,
          label: charts.range.title,
          backgroundColor: this.baseColors,
          borderRadius: 4,
          borderWidth: 0
        }]
      };
    } else if (charts.bar) {
      // Fallback: synthetic ±20% window from bar data when no date present
      this.rangeChartData = {
        labels: charts.bar.labels,
        datasets: [{
          data: charts.bar.data.map((v: number) => [Math.max(0, Math.floor(v * 0.8)), Math.ceil(v * 1.2)]),
          label: 'Expected Range',
          backgroundColor: this.baseColors,
          borderRadius: 4,
          borderWidth: 0
        }]
      };
    }

    // ── Stacked Bar stays as derived mock (no dedicated Python key) ──────────
    if (charts.bar) {
      this.stackedBarChartData = {
        labels: charts.bar.labels,
        datasets: [
          {
            data: charts.bar.data.map((v: number) => Math.floor(v * 0.6)),
            label: 'Segment A',
            backgroundColor: this.baseColors[0],
            borderWidth: 0
          },
          {
            data: charts.bar.data.map((v: number) => Math.floor(v * 0.4)),
            label: 'Segment B',
            backgroundColor: this.baseColors[1],
            borderWidth: 0
          }
        ]
      };
    }
  }



  toggleExportMenu() {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  exportPdf() {
    this.exportMenuOpen = false;
    window.print();
  }

  async exportPbix() {
    this.exportMenuOpen = false;

    const zip = new JSZip();
    const datasetName = this.selectedDatasetName || 'dashboard';
    const safeFileName = datasetName.replace(/[^a-z0-9]/gi, '_');

    // 1. Report meta
    const reportMeta = {
      name: datasetName,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      generator: 'InsightFlow Analytics',
    };
    zip.file('report.json', JSON.stringify(reportMeta, null, 2));

    // 2. Chart data model
    const dataModel: any = {};
    if (this.barChartData)      dataModel.bar       = this.barChartData;
    if (this.pieChartData)      dataModel.pie       = this.pieChartData;
    if (this.lineChartData)     dataModel.line      = this.lineChartData;
    if (this.scatterChartData)  dataModel.scatter   = this.scatterChartData;
    if (this.histogramChartData) dataModel.histogram = this.histogramChartData;
    if (this.stackedBarChartData) dataModel.stackedBar = this.stackedBarChartData;
    if (this.rangeChartData)    dataModel.range     = this.rangeChartData;
    if (this.semicircleChartData) dataModel.semicircle = this.semicircleChartData;
    zip.file('DataModel/model.json', JSON.stringify(dataModel, null, 2));

    // 3. KPI Summary
    if (this.kpis) {
      zip.file('DataModel/kpis.json', JSON.stringify(this.kpis, null, 2));
    }

    // 4. Report summary text
    const summary = [
      `InsightFlow PBIX Export`,
      `========================`,
      `Dataset: ${datasetName}`,
      `Exported: ${new Date().toLocaleString()}`,
      ``,
      `Charts Included:`,
      this.barChartData       ? `  - Bar Chart: ${(this.barChartData.labels ?? []).length} categories`       : '',
      this.pieChartData       ? `  - Pie Chart: ${(this.pieChartData.labels ?? []).length} segments`         : '',
      this.lineChartData      ? `  - Line Chart: ${(this.lineChartData.labels ?? []).length} data points`    : '',
      this.scatterChartData   ? `  - Scatter Chart`                                                          : '',
      this.histogramChartData ? `  - Histogram`                                                              : '',
      this.stackedBarChartData ? `  - Stacked Bar Chart`                                                     : '',
      this.rangeChartData     ? `  - Range Chart`                                                            : '',
      this.semicircleChartData ? `  - Semicircle Gauge`                                                      : '',
    ].filter(Boolean).join('\n');
    zip.file('Summary/report_summary.txt', summary);

    // 5. Generate and download
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}_insightflow.pbix`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
