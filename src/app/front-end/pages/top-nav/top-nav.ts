import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { filter } from 'rxjs';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe, NgIf],
  templateUrl: './top-nav.html',
  styleUrl: './top-nav.scss',
})
export class TopNav implements OnInit {
  public authService = inject(AuthService);
  private router = inject(Router);
  public isAuthPage = false;

  public isAdmin = false;
  public isMobileMenuOpen = false;

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAuthPage = ['/login'].includes(event.url);
      this.isMobileMenuOpen = false; // Close menu on navigation
    });

    this.authService.mongoUser$.subscribe((user: any) => {
      if (user && user.email === 'vvelmurugan0011@gmail.com') {
        this.isAdmin = true;
      } else {
        this.isAdmin = false;
      }
    });
  }


  async signOut() {
    try {
      await this.authService.logout();
      this.isMobileMenuOpen = false;
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Sign out failed', error);
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
}
