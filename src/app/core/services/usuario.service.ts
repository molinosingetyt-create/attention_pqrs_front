import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Usuario } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private api = `${environment.apiUrl}/usuarios`;
  constructor(private http: HttpClient) {}

  list() { return this.http.get<Usuario[]>(`${this.api}/`); }
  vendedores() { return this.http.get<Usuario[]>(`${this.api}/vendedores`); }
  create(data: Partial<Usuario> & { password: string }) {
    return this.http.post<Usuario>(`${this.api}/`, data);
  }
  update(id: number, data: Partial<Usuario> & { password?: string }) {
    return this.http.put<Usuario>(`${this.api}/${id}`, data);
  }
  cambiarPassword(id: number, password: string) {
    return this.update(id, { password });
  }
  desactivar(id: number) { return this.http.delete<void>(`${this.api}/${id}`); }
}
