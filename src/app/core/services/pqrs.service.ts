import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  DashboardResponse,
  DevolucionDetalle,
  DevolucionPendienteListItem,
  DevolucionRegistroPayload,
  Evidencia,
  Inconformidad,
  Page,
  PQRSDetail,
  PQRSListItem,
  ProductoPQRS,
  Seguimiento,
} from '../models/api.models';

export interface ListaPQRSFiltros {
  estado?: string;
  tipo?: string;
  cliente_id?: number;
  vendedor_id?: number;
  q?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class PqrsService {
  private readonly api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  list(f: ListaPQRSFiltros = {}): Observable<Page<PQRSListItem>> {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    params = params.set('page', String(f.page ?? 1));
    params = params.set('size', String(f.size ?? 20));
    return this.http.get<Page<PQRSListItem>>(`${this.api}/pqrs/`, { params });
  }

  create(data: any) {
    return this.http.post<PQRSDetail>(`${this.api}/pqrs/`, data);
  }

  detail(id: number) {
    return this.http.get<PQRSDetail>(`${this.api}/pqrs/${id}`);
  }

  update(id: number, data: any) {
    return this.http.put<PQRSDetail>(`${this.api}/pqrs/${id}`, data);
  }

  addProductos(id: number, productos: ProductoPQRS[]) {
    return this.http.post<ProductoPQRS[]>(
      `${this.api}/pqrs/${id}/productos`,
      productos
    );
  }

  subirEvidencia(id: number, file: File, cargaInicial = false) {
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams();
    if (cargaInicial) params = params.set('carga_inicial', 'true');
    return this.http.post<Evidencia>(
      `${this.api}/pqrs/${id}/evidencias`,
      form,
      { params }
    );
  }

  notificarCalidad(id: number) {
    return this.http.post<{ ok: boolean }>(
      `${this.api}/pqrs/${id}/notificar-calidad`,
      {}
    );
  }

  seguimientos(id: number) {
    return this.http.get<Seguimiento[]>(`${this.api}/pqrs/${id}/seguimientos`);
  }

  crearSeguimiento(id: number, data: { estado: string; descripcion?: string }) {
    return this.http.post<Seguimiento>(
      `${this.api}/seguimientos/pqrs/${id}`,
      data
    );
  }

  devolucionesPendientes() {
    return this.http.get<DevolucionPendienteListItem[]>(`${this.api}/devoluciones/`);
  }

  devolucionDetalle(devolucionId: number) {
    return this.http.get<DevolucionDetalle>(
      `${this.api}/devoluciones/${devolucionId}`
    );
  }

  guardarRadicadoDevolucion(devolucionId: number, data: DevolucionRegistroPayload) {
    return this.http.put<DevolucionDetalle>(
      `${this.api}/devoluciones/${devolucionId}/registro`,
      data
    );
  }

  inconformidades() {
    return this.http.get<Inconformidad[]>(`${this.api}/inconformidades/`);
  }

  dashboard() {
    return this.http.get<DashboardResponse>(`${this.api}/dashboard/`);
  }

  exportExcel(f: ListaPQRSFiltros = {}) {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.api}/pqrs/export`, {
      params,
      responseType: 'blob',
    });
  }
}
