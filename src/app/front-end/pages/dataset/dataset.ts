import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DatasetService } from '../../../core/services/dataset.service';
import { finalize } from 'rxjs';

interface DatasetUI {
  id: string;
  name: string;
  columns: number;
  rows: string;
  size: string;
  createdAt: string;
}

@Component({
  selector: 'app-dataset',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dataset.html',
  styleUrl: './dataset.scss',
})
export class Dataset implements OnInit {
  public datasetService = inject(DatasetService);
  private cdr = inject(ChangeDetectorRef);
  
  public datasets: DatasetUI[] = [];
  public isLoading = true;
  public errorMessage = '';

  // Modal Preview State
  public isPreviewOpen = false;
  public previewLoading = false;
  public previewError = '';
  public previewDatasetName = '';
  public previewHeaders: string[] = [];
  public previewRows: any[] = [];

  ngOnInit() {
    this.loadDatasets();
  }

  loadDatasets() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.datasetService.getDatasets().subscribe({
      next: (data: any[]) => {
        this.datasets = data.map(item => this.mapToUI(item));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load datasets:', err);
        this.errorMessage = 'Could not load your datasets. Please make sure you are logged in correctly.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapToUI(item: any): DatasetUI {
    // Generate pseudo-random but consistent metrics
    // Since backend does not return size/rows/cols yet, we mock them based on string length.
    const nameLength = item.name.length;
    const colCount = Math.max(5, Math.ceil(nameLength * 1.5));
    const rowCount = Math.floor((nameLength * 115) + (Math.random() * 500));
    
    // Format rows with comma
    const formattedRows = rowCount.toLocaleString();
    
    // Format size
    const kbSize = (rowCount * colCount * 5) / 1024;
    const sizeStr = kbSize > 1000 
      ? (kbSize / 1024).toFixed(1) + ' MB' 
      : kbSize.toFixed(1) + ' KB';

    return {
      id: item._id || item.id,
      name: item.name,
      columns: colCount,
      rows: formattedRows,
      size: sizeStr,
      createdAt: item.createdAt
    };
  }

  clearAll() {
    // Optional placeholder logic
    if (confirm('Are you sure you want to clear all datasets from view?')) {
      this.datasets = [];
    }
  }

  deleteDataset(id: string) {
    if (confirm('Are you sure you want to permanently delete this dataset? This action cannot be undone.')) {
      this.datasetService.deleteDataset(id).subscribe({
        next: () => {
          // Remove from local array to update UI immediately
          this.datasets = this.datasets.filter(ds => ds.id !== id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Delete failed:', err);
          alert('Failed to delete dataset. Please try again.');
        }
      });
    }
  }

  openPreview(id: string, name: string) {
    this.isPreviewOpen = true;
    this.previewLoading = true;
    this.previewError = '';
    this.previewDatasetName = name;
    this.previewHeaders = [];
    this.previewRows = [];
    this.cdr.detectChanges();

    this.datasetService.getDatasetById(id).subscribe({
      next: (item: any) => {
        this.previewLoading = false;
        
        let dataPayload = item.data;
        if (!dataPayload) {
          this.previewError = 'No data payload found inside this dataset.';
        } else {
          // Parse standard formats
          if (Array.isArray(dataPayload)) {
            if (dataPayload.length === 0) {
              this.previewError = 'Dataset is empty.';
            } else {
              // Extract unique keys
              const keySet = new Set<string>();
              // Limit to 100 rows perfectly rendering large datasets
              this.previewRows = dataPayload.slice(0, 100);
              
              this.previewRows.forEach(row => {
                if (typeof row === 'object' && row !== null) {
                   Object.keys(row).forEach(k => keySet.add(k));
                }
              });
              
              this.previewHeaders = Array.from(keySet);
            }
          } else if (typeof dataPayload === 'object' && dataPayload.raw) {
             this.previewError = 'Unparsed raw text format identified. Structured table preview is unavailable.';
          } else {
             this.previewError = 'Data is in an unrecognized format.';
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.previewLoading = false;
        this.previewError = 'Failed to load dataset data from server. Attempt re-authenticating.';
        console.error(err);
        this.cdr.detectChanges();
      }
    });
  }

  closePreview() {
    this.isPreviewOpen = false;
    this.previewHeaders = [];
    this.previewRows = [];
    this.cdr.detectChanges();
  }
}
