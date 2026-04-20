import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  public authService = inject(AuthService);
  public userStats$!: Observable<any>;

  ngOnInit() {
    this.userStats$ = this.authService.getUserStats();
  }

  updateInformation() {
    console.log('Updating user information...');
  }

  changePassword() {
    console.log('Changing password...');
  }
}
