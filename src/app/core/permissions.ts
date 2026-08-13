/** Códigos de permiso (deben coincidir con `backend/app/core/permissions.py`). */
export const P = {
  DASHBOARD_VER: 'dashboard.ver',

  CLIENTES_LISTAR: 'clientes.listar',
  CLIENTES_CREAR: 'clientes.crear',
  CLIENTES_EDITAR: 'clientes.editar',
  CLIENTES_ELIMINAR: 'clientes.eliminar',
  CLIENTES_ASIGNAR_VENDEDOR: 'clientes.asignar_vendedor',
  CLIENTES_ACTIVAR: 'clientes.activar_desactivar',
  CLIENTES_CARGA_MASIVA: 'clientes.carga_masiva',

  PQRS_LISTAR: 'pqrs.listar',
  PQRS_CREAR: 'pqrs.crear',
  PQRS_VER: 'pqrs.ver',
  PQRS_EDITAR: 'pqrs.editar',
  PQRS_ELIMINAR: 'pqrs.eliminar',
  PQRS_EXPORTAR: 'pqrs.exportar',
  PQRS_SEGUIMIENTO_CREAR: 'pqrs.seguimiento.crear',
  PQRS_EVIDENCIA_SUBIR: 'pqrs.evidencia.subir',
  PQRS_FILTRAR_VENDEDOR: 'pqrs.filtrar_vendedor',

  DEVOLUCIONES_LISTAR: 'devoluciones.listar',
  DEVOLUCIONES_VALIDAR: 'devoluciones.validar',

  USUARIOS_GESTIONAR: 'usuarios.gestionar',
  USUARIOS_LISTAR_VENDEDORES: 'usuarios.listar_vendedores',

  CONFIG_GESTIONAR: 'configuracion.gestionar',
  INCONFORMIDADES_GESTIONAR: 'inconformidades.gestionar',
  PERMISOS_GESTIONAR: 'permisos.gestionar',
} as const;

export type PermisoCodigo = (typeof P)[keyof typeof P];
