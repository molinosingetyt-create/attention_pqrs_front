import * as XLSX from 'xlsx';
import { Usuario } from '../models/api.models';
import { downloadBlob } from './download-blob';

const HEADERS = [
  'nombre',
  'apellidos',
  'nit',
  'direccion',
  'telefono',
  'correo',
  'ciudad',
  'vendedor',
];

/** Genera y descarga la plantilla .xlsx en el navegador (no depende del endpoint de descarga). */
export function descargarPlantillaClientesExcel(vendedores: Usuario[]): void {
  const wb = XLSX.utils.book_new();

  const clientes = XLSX.utils.aoa_to_sheet([
    HEADERS,
    [
      'Empresa Ejemplo S.A.S.',
      'Contacto',
      '900123456-1',
      'Calle 1 # 2-3',
      '3001234567',
      'cliente@ejemplo.com',
      'Barranquilla',
      vendedores[0]?.nombre ?? '',
    ],
  ]);
  XLSX.utils.book_append_sheet(wb, clientes, 'Clientes');

  const vendedoresSheet = XLSX.utils.aoa_to_sheet([
    ['nombre', 'email'],
    ...vendedores.map((v) => [v.nombre, v.email]),
  ]);
  XLSX.utils.book_append_sheet(wb, vendedoresSheet, 'Vendedores');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, 'plantilla_clientes.xlsx');
}
