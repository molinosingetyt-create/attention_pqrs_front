export type Rol =
  | 'ADMINISTRADOR'
  | 'VENDEDOR'
  | 'ADMINISTRATIVO_COMERCIAL'
  | 'CALIDAD';

export type TipoPQRS =
  | 'QUEJA'
  | 'RECLAMO'
  | 'SUGERENCIA'
  | 'PETICION'
  | 'OTRO';

export type EstadoPQRS = 'ABIERTA' | 'EN_PROCESO' | 'CERRADA' | 'RECHAZADA';
export type EstadoAreaResponsable = 'NO GESTIONADO' | 'PROCEDENTE' | 'NO PROCEDENTE';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  fecha_creacion: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: Usuario;
  permisos: string[];
}

export interface SessionOut {
  user: Usuario;
  permisos: string[];
}

export interface PermisoCatalogo {
  codigo: string;
  modulo: string;
  descripcion: string;
}

export interface RolPermisos {
  rol: string;
  permisos: string[];
}

export interface MatrizPermisos {
  roles: RolPermisos[];
}

export interface Cliente {
  id: number;
  nombre: string;
  apellidos?: string | null;
  nit: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  ciudad?: string | null;
  activo?: boolean;
  vendedor_asignado_id?: number | null;
}

export interface FilaCargaClienteResultado {
  fila: number;
  nit?: string | null;
  exito: boolean;
  mensaje: string;
  cliente_id?: number | null;
}

export interface ClienteCargaMasivaResultado {
  total_filas: number;
  creados: number;
  actualizados: number;
  errores: number;
  filas: FilaCargaClienteResultado[];
}

export interface Area {
  id: number;
  codigo: string;
  nombre: string;
}

export interface Inconformidad {
  id: number;
  area_id: number;
  area?: Area;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface CategoriaProducto {
  id: number;
  nombre: string;
  activo: boolean;
  orden: number;
}

export interface ProductoCatalogo {
  id: number;
  categoria_id: number;
  nombre: string;
  activo: boolean;
  orden: number;
}

export type TipoEvidencia = 'NO_CONFORMIDAD' | 'FOTO_LOTE';

export const TIPOS_EVIDENCIA_LABELS: Record<TipoEvidencia, string> = {
  NO_CONFORMIDAD: 'Por no conformidad',
  FOTO_LOTE: 'Foto del lote',
};

export interface ProductoPQRS {
  id?: number;
  nombre_producto: string;
  cantidad: number;
  producto_catalogo_id?: number | null;
  numero_factura?: string | null;
  lote?: string | null;
  comentario?: string | null;
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  evidencias?: Evidencia[];
}

export interface Evidencia {
  id: number;
  producto_pqrs_id?: number | null;
  tipo?: TipoEvidencia | null;
  titulo?: string | null;
  archivo_url: string;
  nombre_original?: string | null;
  content_type?: string | null;
  fecha_subida: string;
}

export interface Seguimiento {
  id: number;
  estado: EstadoPQRS;
  descripcion?: string | null;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  fecha: string;
}

export interface AnalisisResponsabilidad {
  id: number;
  procedente: boolean;
  comentario: string;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  fecha_actualizacion: string;
}

export type CalificacionAtencion = 'EXCELENTE' | 'BUENA' | 'REGULAR' | 'MALA';

export const CALIFICACION_ATENCION_LABELS: Record<CalificacionAtencion, string> = {
  EXCELENTE: 'Excelente',
  BUENA: 'Buena',
  REGULAR: 'Regular',
  MALA: 'Mala',
};

export interface SatisfaccionCliente {
  id: number;
  atencion_oportunidad: CalificacionAtencion;
  expectativa_cumplida: boolean;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  fecha_actualizacion: string;
}

export interface DevolucionPendienteListItem {
  devolucion_id: number;
  codigo_devolucion?: string | null;
  pqrs_id: number;
  radicado: string;
  tipo: string;
  estado: string;
  cliente_nombre: string;
  cliente_apellidos: string;
  fecha_cierre: string | null;
  fecha_registro: string;
  /** Solo cuando ya está radicada (servicio generado). */
  fecha_servicio_generado: string | null;
  /** Producto indicado en la queja (primera línea). */
  producto_queja: string | null;
  area_codigo: string;
  area_nombre: string;
  inconformidad_nombre: string;
  inconformidad_descripcion: string | null;
  pendiente: boolean;
  aplica: boolean;
}

export type DevolucionResponsable = 'CLIENTE' | 'EMPRESA';
export type DevolucionDestino = 'PRIMERA' | 'SUBPRODUCTO' | 'ELIMINACION';
export type DevolucionProductoTipo =
  | 'TRIGO'
  | 'MAIZ'
  | 'PASTA_CORTA'
  | 'PASTA_LARGA';
export type DevolucionCausa =
  | 'PLAGA'
  | 'EMPAQUE'
  | 'MAL_COLOR_OLOR'
  | 'PANADERIA'
  | 'MAT_EXTRANO'
  | 'VETEADO';

export interface DevolucionPQRSResumen {
  id: number;
  radicado: string;
  tipo: string;
  estado: string;
  numero_factura?: string | null;
  lote?: string | null;
  descripcion?: string | null;
  fecha_cierre?: string | null;
  productos: ProductoPQRS[];
}

export interface DevolucionDetalle {
  id: number;
  codigo_devolucion?: string | null;
  pqrs_id: number;
  pendiente: boolean;
  aplica: boolean;
  observaciones?: string | null;
  fecha_registro: string;
  fecha_decision: string;
  datos_registro: Record<string, unknown> | null;
  cliente_nombre: string;
  cliente_apellidos: string;
  area_codigo: string;
  area_nombre: string;
  inconformidad_nombre: string;
  inconformidad_descripcion?: string | null;
  pqrs: DevolucionPQRSResumen;
}

export interface DevolucionRegistroPayload {
  responsable: DevolucionResponsable;
  costo?: string | null;
  destino: DevolucionDestino;
  cantidad: number;
  numero_factura?: string | null;
  lote?: string | null;
  accion_correctiva: boolean;
  producto: string;
  causa: string;
  detalle_respuesta: string;
  comentario_devolucion: string;
  productos_devolucion?: {
    producto: string;
    causa: string;
    destino: DevolucionDestino;
    cantidad: number;
    numero_factura?: string | null;
    lote?: string | null;
    accion_correctiva: boolean;
  }[];
}

export interface PQRSListItem {
  id: number;
  radicado: string;
  tipo: TipoPQRS;
  estado: EstadoPQRS;
  cliente_id: number;
  cliente_nombre?: string | null;
  vendedor_id?: number | null;
  vendedor_nombre?: string | null;
  area_codigo?: string | null;
  area_nombre?: string | null;
  estado_area_responsable: EstadoAreaResponsable;
  numero_factura?: string | null;
  fecha_creacion: string;
  fecha_cierre?: string | null;
}

export interface PQRSDetail {
  id: number;
  radicado: string;
  tipo: TipoPQRS;
  estado: EstadoPQRS;
  numero_factura?: string | null;
  lote?: string | null;
  descripcion?: string | null;
  fecha_creacion: string;
  fecha_cierre?: string | null;
  cliente: Cliente;
  inconformidad?: Inconformidad | null;
  vendedor?: { id: number; nombre: string; email: string; rol: string } | null;
  productos: ProductoPQRS[];
  evidencias: Evidencia[];
  seguimientos: Seguimiento[];
  analisis_responsabilidad?: AnalisisResponsabilidad | null;
  satisfaccion_cliente?: SatisfaccionCliente | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DashboardKPIs {
  total: number;
  abiertas: number;
  en_proceso: number;
  cerradas: number;
  rechazadas: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  por_tipo: { tipo: string; cantidad: number }[];
  por_estado: { tipo: string; cantidad: number }[];
  por_area: { area_codigo: string; area_nombre: string; cantidad: number }[];
  por_mes: { mes: string; cantidad: number }[]; // YYYY-MM
  por_categoria_producto: { categoria: string; producto: string; cantidad: number }[];
  recientes: {
    id: number;
    radicado: string;
    tipo: TipoPQRS;
    estado: EstadoPQRS;
    cliente: string;
    fecha_creacion: string;
  }[];
}
