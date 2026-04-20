import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = '/api/admin';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('insightflow_token');
    return { headers: { 'x-auth-token': token || '' } };
  }

  getAnalytics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/analytics`, this.getHeaders());
  }

  getUsersStorage(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users-storage`, this.getHeaders());
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`, this.getHeaders());
  }
}
