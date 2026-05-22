import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Cliente, Page } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly api = `${environment.apiUrl}/clientes`;
  constructor(private http: HttpClient) {}

  list(opts: { q?: string; page?: number; size?: number } = {}): Observable<Page<Cliente>> {
    let params = new HttpParams();
    if (opts.q) params = params.set('q', opts.q);
    params = params.set('page', String(opts.page ?? 1));
    params = params.set('size', String(opts.size ?? 20));
    return this.http.get<Page<Cliente>>(`${this.api}/`, { params });
  }
  get(id: number) { return this.http.get<Cliente>(`${this.api}/${id}`); }
  create(data: Partial<Cliente>) { return this.http.post<Cliente>(`${this.api}/`, data); }
  update(id: number, data: Partial<Cliente>) { return this.http.put<Cliente>(`${this.api}/${id}`, data); }
  remove(id: number) { return this.http.delete<void>(`${this.api}/${id}`); }
}
