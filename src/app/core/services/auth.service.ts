import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { LoginResponse, SessionOut, Usuario, Rol } from '../models/api.models';
import { PermisoCodigo } from '../permissions';

const TOKEN_KEY = 'pqrs_token';
const USER_KEY = 'pqrs_user';
const PERMS_KEY = 'pqrs_permisos';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<Usuario | null>(this.loadUser());
  private readonly permisos = signal<string[]>(this.loadPermisos());
  readonly currentUser = this.user.asReadonly();
  readonly currentPermisos = this.permisos.asReadonly();
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
      .pipe(tap((res) => this.persistSession(res.access_token, res.user, res.permisos ?? [])));
  }

  refreshSession(): Observable<SessionOut> {
    return this.http.get<SessionOut>(`${environment.apiUrl}/auth/me`).pipe(
      tap((res) => this.persistSession(this.getToken()!, res.user, res.permisos ?? []))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERMS_KEY);
    this.user.set(null);
    this.permisos.set([]);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Al menos uno de los permisos (matriz del backend). */
  canAny(...codes: PermisoCodigo[]): boolean {
    const set = this.permisos();
    return codes.some((c) => set.includes(c));
  }

  /** Todos los permisos indicados. */
  canAll(...codes: PermisoCodigo[]): boolean {
    const set = this.permisos();
    return codes.every((c) => set.includes(c));
  }

  /** Alias corto para plantillas. */
  can(code: PermisoCodigo): boolean {
    return this.permisos().includes(code);
  }

  /** Compatibilidad: rol del usuario (la matriz de permisos es la fuente de verdad para UI). */
  hasRole(...roles: Rol[]): boolean {
    const u = this.user();
    return !!u && roles.includes(u.rol);
  }

  private persistSession(token: string, user: Usuario, permisos: string[]): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(PERMS_KEY, JSON.stringify(permisos));
    this.user.set(user);
    this.permisos.set(permisos);
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

  private loadPermisos(): string[] {
    const raw = localStorage.getItem(PERMS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }
}
