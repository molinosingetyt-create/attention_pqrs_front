import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PermisoCatalogo, RolPermisos, MatrizPermisos } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class PermisoService {
  private readonly api = `${environment.apiUrl}/permisos`;

  constructor(private http: HttpClient) {}

  catalogo(): Observable<PermisoCatalogo[]> {
    return this.http.get<PermisoCatalogo[]>(`${this.api}/catalogo`);
  }

  misPermisos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/mis-permisos`);
  }

  matriz(): Observable<MatrizPermisos> {
    return this.http.get<MatrizPermisos>(`${this.api}/matriz`);
  }

  actualizarRol(rol: string, permisos: string[]): Observable<RolPermisos> {
    return this.http.put<RolPermisos>(`${this.api}/roles/${rol}`, { permisos });
  }
}
