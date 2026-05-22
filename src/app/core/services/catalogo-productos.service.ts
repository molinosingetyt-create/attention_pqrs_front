import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CategoriaProducto, ProductoCatalogo } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CatalogoProductosService {
  private readonly base = `${environment.apiUrl}/catalogo-productos`;

  constructor(private http: HttpClient) {}

  categorias(soloActivos = true): Observable<CategoriaProducto[]> {
    const params = new HttpParams().set('solo_activos', String(soloActivos));
    return this.http.get<CategoriaProducto[]>(`${this.base}/categorias`, { params });
  }

  productosPorCategoria(categoriaId: number, soloActivos = true): Observable<ProductoCatalogo[]> {
    const params = new HttpParams()
      .set('categoria_id', String(categoriaId))
      .set('solo_activos', String(soloActivos));
    return this.http.get<ProductoCatalogo[]>(`${this.base}/productos`, { params });
  }
}
