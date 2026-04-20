import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const userString = localStorage.getItem('insightflow_user');
    if (userString) {
       const user = JSON.parse(userString);
       if (user && user.email === 'vvelmurugan0011@gmail.com') {
         return true;
       }
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}
