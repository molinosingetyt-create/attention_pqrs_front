/** Descarga un Blob como archivo en el navegador. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Si el servidor respondió JSON de error con responseType blob, extrae el mensaje. */
export async function blobErrorMessage(blob: Blob): Promise<string> {
  try {
    const text = await blob.text();
    const data = JSON.parse(text) as { detail?: unknown };
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) return 'Error de validación en el servidor.';
  } catch {
    /* no es JSON */
  }
  return 'No se pudo descargar el archivo.';
}

export function isSpreadsheetBlob(blob: Blob): boolean {
  const type = (blob.type || '').toLowerCase();
  if (
    type.includes('spreadsheet') ||
    type.includes('excel') ||
    type.includes('octet-stream')
  ) {
    return true;
  }
  return blob.size > 200;
}
