import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Sede } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SedeService {
  private readonly api = `${environment.apiUrl}/sedes`;

  constructor(private http: HttpClient) {}

  list(soloActivas = false): Observable<Sede[]> {
    const params = new HttpParams().set('solo_activas', String(soloActivas));
    return this.http.get<Sede[]>(`${this.api}/`, { params });
  }

  create(data: { codigo: string; nombre: string; activa?: boolean }): Observable<Sede> {
    return this.http.post<Sede>(`${this.api}/`, data);
  }

  update(id: number, data: Partial<{ codigo: string; nombre: string; activa: boolean }>): Observable<Sede> {
    return this.http.put<Sede>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
