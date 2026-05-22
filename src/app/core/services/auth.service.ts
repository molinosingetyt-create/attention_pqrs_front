import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { LoginResponse, Usuario, Rol } from '../models/api.models';

const TOKEN_KEY = 'pqrs_token';
const USER_KEY = 'pqrs_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<Usuario | null>(this.loadUser());
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password);

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.user.set(res.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: Rol[]): boolean {
    const u = this.user();
    return !!u && roles.includes(u.rol);
  }

  private loadUser(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }
}
