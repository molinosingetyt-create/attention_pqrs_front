import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClienteService } from '@app/core/services/cliente.service';
import { UsuarioService } from '@app/core/services/usuario.service';
import { ClienteCargaMasivaResultado } from '@app/core/models/api.models';
import { descargarPlantillaClientesExcel } from '@app/core/utils/plantilla-clientes.excel';

@Component({
  selector: 'app-clientes-carga-masiva',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="max-w-4xl mx-auto space-y-4">
      <div class="flex items-center gap-3">
        <a routerLink="/clientes" class="text-brand hover:underline flex items-center">
          <mat-icon>arrow_back</mat-icon> Volver a clientes
        </a>
      </div>

      <h2 class="text-xl sm:text-2xl font-bold text-gray-800">Cargue masivo de clientes</h2>
      <p class="text-sm text-gray-600">
        Solo administrador. Cada fila debe incluir el nombre del vendedor
        <strong>exactamente</strong> como está registrado en el sistema (hoja «Vendedores» de la plantilla).
      </p>

      <div class="card space-y-4">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-secondary" (click)="descargarPlantilla()" [disabled]="downloading()">
            <mat-icon>download</mat-icon>
            Descargar plantilla Excel
          </button>
        </div>

        <div>
          <label class="label">Archivo Excel (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            class="input"
            (change)="onFile($event)" />
        </div>

        <div class="flex flex-wrap gap-2 justify-end">
          <a routerLink="/clientes" class="btn-secondary">Cancelar</a>
          <button
            type="button"
            class="btn-primary"
            (click)="importar()"
            [disabled]="!archivo() || uploading()">
            <mat-icon *ngIf="!uploading()">upload_file</mat-icon>
            <mat-progress-spinner *ngIf="uploading()" diameter="20" mode="indeterminate" class="inline-block"></mat-progress-spinner>
            Importar clientes
          </button>
        </div>
      </div>

      <div *ngIf="resultado() as r" class="card space-y-3">
        <h3 class="font-semibold text-gray-800">Resultado de la importación</h3>
        <div class="flex flex-wrap gap-4 text-sm">
          <span>Filas procesadas: <strong>{{ r.total_filas }}</strong></span>
          <span class="text-green-700">Creados: <strong>{{ r.creados }}</strong></span>
          <span class="text-red-700">Errores: <strong>{{ r.errores }}</strong></span>
        </div>

        <div class="em-scroll max-h-96">
          <table class="em-table text-sm">
            <thead>
              <tr>
                <th>Fila</th>
                <th>NIT</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let f of r.filas">
                <td>{{ f.fila }}</td>
                <td>{{ f.nit || '—' }}</td>
                <td>
                  <span [class]="f.exito ? 'text-green-700' : 'text-red-700'">
                    {{ f.exito ? 'OK' : 'Error' }}
                  </span>
                </td>
                <td>{{ f.mensaje }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ClientesCargaMasivaComponent {
  private svc = inject(ClienteService);
  private usuarios = inject(UsuarioService);
  private snack = inject(MatSnackBar);

  protected archivo = signal<File | null>(null);
  protected uploading = signal(false);
  protected downloading = signal(false);
  protected resultado = signal<ClienteCargaMasivaResultado | null>(null);

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
    this.resultado.set(null);
  }

  descargarPlantilla(): void {
    this.downloading.set(true);
    this.usuarios.vendedores().subscribe({
      next: (vendedores) => {
        try {
          descargarPlantillaClientesExcel(vendedores);
          this.snack.open('Plantilla descargada', 'Cerrar', { duration: 2500 });
        } catch {
          this.snack.open('No se pudo generar el archivo Excel', 'Cerrar', {
            duration: 3500,
          });
        }
        this.downloading.set(false);
      },
      error: () => {
        try {
          descargarPlantillaClientesExcel([]);
          this.snack.open(
            'Plantilla descargada sin lista de vendedores (revise su conexión)',
            'Cerrar',
            { duration: 4500 }
          );
        } catch {
          this.snack.open('No se pudo generar el archivo Excel', 'Cerrar', {
            duration: 3500,
          });
        }
        this.downloading.set(false);
      },
    });
  }

  importar(): void {
    const file = this.archivo();
    if (!file) return;
    this.uploading.set(true);
    this.svc.importarCargaMasiva(file).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.uploading.set(false);
        const msg =
          res.errores === 0
            ? `Se importaron ${res.creados} clientes correctamente.`
            : `Importación finalizada: ${res.creados} creados, ${res.errores} con error.`;
        this.snack.open(msg, 'Cerrar', { duration: 5000 });
      },
      error: () => {
        this.uploading.set(false);
      },
    });
  }
}
