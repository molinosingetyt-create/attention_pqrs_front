import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  Area,
  CategoriaProducto,
  Inconformidad,
  ProductoCatalogo,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly cfg = `${environment.apiUrl}/configuracion`;
  private readonly inc = `${environment.apiUrl}/inconformidades`;

  constructor(private http: HttpClient) {}

  // Áreas
  listarAreas(): Observable<Area[]> {
    return this.http.get<Area[]>(`${this.cfg}/areas`);
  }
  crearArea(data: { codigo: string; nombre: string }): Observable<Area> {
    return this.http.post<Area>(`${this.cfg}/areas`, data);
  }
  actualizarArea(id: number, data: Partial<{ codigo: string; nombre: string }>): Observable<Area> {
    return this.http.put<Area>(`${this.cfg}/areas/${id}`, data);
  }
  eliminarArea(id: number): Observable<void> {
    return this.http.delete<void>(`${this.cfg}/areas/${id}`);
  }

  // Inconformidades (API existente; solo administrador)
  listarInconformidades(): Observable<Inconformidad[]> {
    const params = new HttpParams().set('solo_activos', 'false');
    return this.http.get<Inconformidad[]>(`${this.inc}/`, { params });
  }
  crearInconformidad(data: {
    area_id: number;
    nombre: string;
    descripcion?: string | null;
    activo?: boolean;
  }): Observable<Inconformidad> {
    return this.http.post<Inconformidad>(`${this.inc}/`, { activo: true, ...data });
  }
  actualizarInconformidad(
    id: number,
    data: Partial<{ area_id: number; nombre: string; descripcion: string | null; activo: boolean }>
  ): Observable<Inconformidad> {
    return this.http.put<Inconformidad>(`${this.inc}/${id}`, data);
  }
  eliminarInconformidad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.inc}/${id}`);
  }

  // Categorías de producto
  listarCategoriasProducto(): Observable<CategoriaProducto[]> {
    const params = new HttpParams().set('solo_activos', 'false');
    return this.http.get<CategoriaProducto[]>(`${this.cfg}/categorias-producto`, { params });
  }
  crearCategoriaProducto(data: {
    nombre: string;
    activo?: boolean;
    orden?: number;
  }): Observable<CategoriaProducto> {
    return this.http.post<CategoriaProducto>(`${this.cfg}/categorias-producto`, data);
  }
  actualizarCategoriaProducto(
    id: number,
    data: Partial<{ nombre: string; activo: boolean; orden: number }>
  ): Observable<CategoriaProducto> {
    return this.http.put<CategoriaProducto>(`${this.cfg}/categorias-producto/${id}`, data);
  }
  eliminarCategoriaProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.cfg}/categorias-producto/${id}`);
  }

  // Productos catálogo
  listarProductosCatalogo(categoriaId: number): Observable<ProductoCatalogo[]> {
    const params = new HttpParams()
      .set('categoria_id', String(categoriaId))
      .set('solo_activos', 'false');
    return this.http.get<ProductoCatalogo[]>(`${this.cfg}/productos-catalogo`, { params });
  }
  crearProductoCatalogo(data: {
    categoria_id: number;
    nombre: string;
    activo?: boolean;
    orden?: number;
  }): Observable<ProductoCatalogo> {
    return this.http.post<ProductoCatalogo>(`${this.cfg}/productos-catalogo`, data);
  }
  actualizarProductoCatalogo(
    id: number,
    data: Partial<{ categoria_id: number; nombre: string; activo: boolean; orden: number }>
  ): Observable<ProductoCatalogo> {
    return this.http.put<ProductoCatalogo>(`${this.cfg}/productos-catalogo/${id}`, data);
  }
  eliminarProductoCatalogo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.cfg}/productos-catalogo/${id}`);
  }
}
