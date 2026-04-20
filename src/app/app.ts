import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopNav } from './front-end/pages/top-nav/top-nav';
import { AuthService } from './core/services/auth.service';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopNav],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('insightflow');
  public authService = inject(AuthService);
}
