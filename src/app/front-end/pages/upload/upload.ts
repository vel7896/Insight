import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatasetService, UploadProgress } from '../../../core/services/dataset.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.html',
  styleUrl: './upload.scss',
})
export class Upload {
  private datasetService = inject(DatasetService);
  
  isDragging = false;
  uploads$: Observable<UploadProgress[]> = this.datasetService.uploads$;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  private handleFiles(files: FileList) {
    Array.from(files).forEach(file => {
      // Validate file type
      const allowedTypes = ['.csv', '.xlsx', '.json'];
      const extension = ('.' + file.name.split('.').pop()).toLowerCase();
      
      if (allowedTypes.includes(extension)) {
        this.datasetService.uploadDataset(file);
      } else {
        alert(`${file.name} is not a supported file type.`);
      }
    });
  }

  clearUploads() {
    this.datasetService.clearUploads();
  }
}
