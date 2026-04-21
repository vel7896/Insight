import { Injectable, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signOut, user, User as FirebaseUser, onAuthStateChanged } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/auth';

  user$: Observable<FirebaseUser | null> = user(this.auth);
  private mongoUserSubject = new BehaviorSubject<any>(null);
  mongoUser$ = this.mongoUserSubject.asObservable();

  constructor() {
    // Restore session from localStorage
    const savedUser = localStorage.getItem('insightflow_user');
    if (savedUser) {
      this.mongoUserSubject.next(JSON.parse(savedUser));
    }

    // Listen for Firebase auth state changes (handles redirects & page refreshes)
    onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && !this.mongoUserSubject.value) {
        // Firebase user is signed in but mongoUser is not set yet
        const userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email
        };
        localStorage.setItem('insightflow_user', JSON.stringify(userData));
        this.mongoUserSubject.next(userData);
      }
    });
  }

  // MongoDB Backend Methods
  register(userData: any) {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any) {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('insightflow_token', res.token);
          localStorage.setItem('insightflow_user', JSON.stringify(res.user));
          this.mongoUserSubject.next(res.user);
        }
      })
    );
  }

  getUserStats(): Observable<any> {
    const token = localStorage.getItem('insightflow_token');
    const headers = { 'x-auth-token': token || '' };
    return this.http.get(`${environment.apiUrl}/user/stats`, { headers });
  }

  // Firebase Google Sign-In
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.auth, provider);
      const firebaseUser = result.user;

      // Sync with Node.js backend to get a valid insightflow_token
      try {
        const res: any = await firstValueFrom(this.http.post(`${this.apiUrl}/google`, {
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'User'
        }));

        if (res && res.token) {
          localStorage.setItem('insightflow_token', res.token);
          localStorage.setItem('insightflow_user', JSON.stringify(res.user));
          this.mongoUserSubject.next(res.user);
        }
      } catch (backendError) {
        console.error('Failed to sync Google Auth with backend:', backendError);
      }

      return firebaseUser;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  // Firebase GitHub Sign-In
  async signInWithGithub() {
    const provider = new GithubAuthProvider();
    try {
      const result = await signInWithPopup(this.auth, provider);
      const firebaseUser = result.user;

      // Sync with Node.js backend to get a valid insightflow_token
      try {
        const res: any = await firstValueFrom(this.http.post(`${this.apiUrl}/github`, {
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'User'
        }));

        if (res && res.token) {
          localStorage.setItem('insightflow_token', res.token);
          localStorage.setItem('insightflow_user', JSON.stringify(res.user));
          this.mongoUserSubject.next(res.user);
        }
      } catch (backendError) {
        console.error('Failed to sync GitHub Auth with backend:', backendError);
      }

      return firebaseUser;
    } catch (error) {
      console.error('GitHub Sign-In Error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      localStorage.removeItem('insightflow_token');
      localStorage.removeItem('insightflow_user');
      this.mongoUserSubject.next(null);
    } catch (error) {
      console.error('Sign-Out Error:', error);
      throw error;
    }
  }
}
