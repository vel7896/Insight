import { Routes } from '@angular/router';
import { Landing } from './front-end/pages/landing/landing';
import { Login } from './front-end/pages/login/login';
import { Dashboard } from './front-end/pages/dashboard/dashboard';
import { Upload } from './front-end/pages/upload/upload';
import { Dataset } from './front-end/pages/dataset/dataset';
import { Reports } from './front-end/pages/reports/reports';
import { Profile } from './front-end/pages/profile/profile';
import { Admin } from './front-end/pages/admin/admin';
import { authGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'upload', component: Upload, canActivate: [authGuard] },
  { path: 'datasets', component: Dataset, canActivate: [authGuard] },
  { path: 'reports', component: Reports, canActivate: [authGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'admin', component: Admin, canActivate: [authGuard, AdminGuard] },
  { path: '**', redirectTo: '' }
];