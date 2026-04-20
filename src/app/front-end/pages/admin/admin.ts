import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin implements OnInit {
  analytics: any = null;
  usersStorage: any[] = [];
  loading = true;

  constructor(private adminService: AdminService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.adminService.getAnalytics().subscribe({
      next: (data) => {
        this.analytics = data;
        this.checkLoading();
      },
      error: (err) => {
        console.error('Error fetching analytics', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.adminService.getUsersStorage().subscribe({
      next: (data) => {
         this.usersStorage = data;
         this.checkLoading();
      },
      error: (err) => {
         console.error('Error fetching users storage', err);
         this.loading = false;
         this.cdr.detectChanges();
      }
    });
  }
  
  checkLoading() {
      if(this.analytics && this.usersStorage) {
         this.loading = false;
         this.cdr.detectChanges();
      }
  }

  formatBytes(bytes: number, decimals = 2) {
      if (bytes === undefined || bytes === null || isNaN(bytes)) return 'Unknown';
      if (+bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  deleteUser(id: string, name: string) {
    if (confirm(`Are you sure you want to permanently delete user "${name}"? This action cannot be undone and will delete all their datasets and reports.`)) {
      this.adminService.deleteUser(id).subscribe({
        next: () => {
          this.usersStorage = this.usersStorage.filter(u => u._id !== id);
          if (this.analytics) {
             this.analytics.totalUsers = Math.max(0, this.analytics.totalUsers - 1);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting user', err);
          alert('Failed to delete user.');
          this.cdr.detectChanges();
        }
      });
    }
  }
}
