import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  Area,
  AnalisisResponsabilidad,
  CalificacionAtencion,
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
  SatisfaccionCliente,
  Seguimiento,
} from '../models/api.models';

export interface ListaPQRSFiltros {
  estado?: string;
  tipo?: string;
  cliente_id?: number;
  vendedor_id?: number;
  ciudad?: string;
  estado_area_responsable?: string;
  inconformidad_id?: number;
  producto_catalogo_id?: number;
  categoria_id?: number;
  q?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  size?: number;
}

export interface DashboardFiltros {
  fecha_inicio?: string;
  fecha_fin?: string;
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

  opcionesFiltro() {
    return this.http.get<{
      ciudades: string[];
      areas: Area[];
      inconformidades: {
        id: number;
        nombre: string;
        area_id: number;
        area_nombre?: string | null;
      }[];
      categorias: {
        id: number;
        nombre: string;
      }[];
      productos: {
        id: number;
        nombre: string;
        categoria_id: number;
        categoria_nombre?: string | null;
      }[];
    }>(`${this.api}/pqrs/opciones-filtro`);
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

  delete(id: number) {
    return this.http.delete<void>(`${this.api}/pqrs/${id}`);
  }

  addProductos(id: number, productos: ProductoPQRS[]) {
    return this.http.post<ProductoPQRS[]>(
      `${this.api}/pqrs/${id}/productos`,
      productos
    );
  }

  updateProducto(
    pqrsId: number,
    productoId: number,
    data: {
      producto_catalogo_id?: number | null;
      cantidad?: number;
      numero_factura?: string | null;
      lote?: string | null;
      comentario?: string | null;
    }
  ) {
    return this.http.put<ProductoPQRS>(
      `${this.api}/pqrs/${pqrsId}/productos/${productoId}`,
      data
    );
  }

  deleteProducto(pqrsId: number, productoId: number) {
    return this.http.delete<void>(`${this.api}/pqrs/${pqrsId}/productos/${productoId}`);
  }

  subirEvidencia(
    id: number,
    file: File,
    opts: {
      productoPqrsId: number;
      tipo: 'NO_CONFORMIDAD' | 'FOTO_LOTE';
      cargaInicial?: boolean;
    }
  ) {
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams()
      .set('producto_pqrs_id', String(opts.productoPqrsId))
      .set('tipo', opts.tipo);
    if (opts.cargaInicial) params = params.set('carga_inicial', 'true');
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

  guardarAnalisisResponsabilidad(
    id: number,
    data: { procedente: boolean; comentario: string }
  ) {
    return this.http.put<AnalisisResponsabilidad>(
      `${this.api}/pqrs/${id}/analisis-responsabilidad`,
      data
    );
  }

  guardarSatisfaccionCliente(
    id: number,
    data: {
      atencion_oportunidad?: CalificacionAtencion | null;
      expectativa_cumplida: boolean;
      comentarios?: string | null;
    }
  ) {
    return this.http.put<SatisfaccionCliente>(
      `${this.api}/pqrs/${id}/satisfaccion-cliente`,
      data
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

  dashboard(f: DashboardFiltros = {}) {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<DashboardResponse>(`${this.api}/dashboard/`, { params });
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

  descargarPdf(id: number) {
    return this.http.get(`${this.api}/pqrs/${id}/pdf`, {
      responseType: 'blob',
    });
  }
}
