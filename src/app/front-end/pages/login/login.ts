import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  loginData = {
    email: '',
    password: ''
  };

  onSubmit() {
    alert('Please try to login with Google.');
    /*
    this.authService.login(this.loginData).subscribe({
      next: (res) => {
        console.log('User logged in successfully', res);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login failed', err);
      }
    });
    */
  }

  async loginWithGoogle() {
    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      if (error?.code === 'auth/account-exists-with-different-credential') {
        alert('An account already exists with the same email. Please sign in with the original provider or enable "Link accounts that use the same email" in your Firebase console.');
      } else {
        console.error('Login failed', error);
      }
    }
  }

  async loginWithGithub() {
    try {
      await this.authService.signInWithGithub();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      if (error?.code === 'auth/account-exists-with-different-credential') {
        alert('An account already exists with the same email. Please sign in with the original provider or enable "Link accounts that use the same email" in your Firebase console.');
      } else {
        console.error('Login failed', error);
      }
    }
  }
}
