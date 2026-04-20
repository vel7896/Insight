import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import * as XLSX from 'xlsx';

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class DatasetService {
  private http = inject(HttpClient);
  private apiUrl = '/api/datasets';

  private uploadsSubject = new BehaviorSubject<UploadProgress[]>([]);
  uploads$ = this.uploadsSubject.asObservable();

  uploadDataset(file: File): void {
    const newUpload: UploadProgress = {
      fileName: file.name,
      progress: 0,
      status: 'pending'
    };

    this.uploadsSubject.next([...this.uploadsSubject.value, newUpload]);
    this.updateStatus(file.name, 'uploading', 30);

    const extension = file.name.split('.').pop()?.toLowerCase();

    const postDataset = (parsedData: any) => {
      const token = localStorage.getItem('insightflow_token');
      const headers = { 'x-auth-token': token || '' };

      this.http.post(this.apiUrl + '/upload', {
        name: file.name,
        data: parsedData
      }, { headers }).pipe(
        tap(() => {
          this.updateStatus(file.name, 'success', 100);
        }),
        catchError((err) => {
          console.error('Upload failed:', err);
          this.updateStatus(file.name, 'error', 0);
          return of(null);
        })
      ).subscribe();
    };

    const reader = new FileReader();

    if (extension === 'xlsx' || extension === 'xls') {
      reader.onload = (e: any) => {
        this.updateStatus(file.name, 'uploading', 60);
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const parsedData = XLSX.utils.sheet_to_json(worksheet);
          postDataset(parsedData);
        } catch (error) {
          console.error('Excel parsing failed', error);
          this.updateStatus(file.name, 'error', 0);
        }
      };
      reader.onerror = () => this.updateStatus(file.name, 'error', 0);
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        this.updateStatus(file.name, 'uploading', 60);

        let parsedData: any;
        try {
          if (extension === 'json') {
            parsedData = JSON.parse(reader.result as string);
          } else if (extension === 'csv') {
            parsedData = this.parseCSV(reader.result as string);
          } else {
            // Unrecognized formats store as raw text
            parsedData = { raw: reader.result as string };
          }
        } catch (e) {
          parsedData = { raw: reader.result as string };
        }
        
        postDataset(parsedData);
      };
      reader.onerror = () => this.updateStatus(file.name, 'error', 0);
      reader.readAsText(file);
    }
  }

  getDatasets(): Observable<any[]> {
    const token = localStorage.getItem('insightflow_token');
    const headers = { 'x-auth-token': token || '' };
    return this.http.get<any[]>(this.apiUrl, { headers });
  }

  getDatasetById(id: string): Observable<any> {
    const token = localStorage.getItem('insightflow_token');
    const headers = { 'x-auth-token': token || '' };
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers });
  }

  getAiChart(id: string): Observable<any> {
    const token = localStorage.getItem('insightflow_token');
    const headers = { 'x-auth-token': token || '' };
    return this.http.get<any>(`${this.apiUrl}/${id}/ai-chart`, { headers });
  }

  deleteDataset(id: string): Observable<any> {
    const token = localStorage.getItem('insightflow_token');
    const headers = { 'x-auth-token': token || '' };
    return this.http.delete(`${this.apiUrl}/${id}`, { headers });
  }

  private parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });

    return rows;
  }

  private updateStatus(fileName: string, status: UploadProgress['status'], progress: number) {
    const currentUploads = this.uploadsSubject.value;
    const index = currentUploads.findIndex(u => u.fileName === fileName);
    if (index !== -1) {
      currentUploads[index] = { ...currentUploads[index], status, progress };
      this.uploadsSubject.next([...currentUploads]);
    }
  }

  clearUploads() {
    this.uploadsSubject.next([]);
  }
}
