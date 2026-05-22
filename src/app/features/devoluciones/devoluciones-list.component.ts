import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DevolucionPendienteListItem } from '@app/core/models/api.models';
import { PqrsService } from '@app/core/services/pqrs.service';

@Component({
  selector: 'app-devoluciones-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, DatePipe],
  template: `
    <div class="space-y-4">
      <div class="page-head">
        <h2>Devoluciones pendientes</h2>
        <div class="actions"></div>
      </div>
      <p class="text-sm text-gray-600 max-w-3xl">
        PQRS cerradas con inconformidad: pendientes de radicar en el formulario de devoluciones.
        Administración ve todas las áreas; calidad solo las del área CALIDAD.
      </p>

      <div *ngIf="loading()" class="flex justify-center py-10">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading()" class="card">
        <div *ngIf="!items().length" class="py-10 text-center text-gray-500">
          No hay devoluciones pendientes.
        </div>

        <ng-container *ngIf="items().length">
          <div class="em-scroll hidden sm:block">
            <table class="em-table">
              <thead>
                <tr>
                  <th>PQRS</th>
                  <th>Código devolución</th>
                  <th>Cliente</th>
                  <th>Área</th>
                  <th>Inconformidad</th>
                  <th>Registro</th>
                  <th>Cierre PQRS</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let d of items()">
                  <td class="font-medium">{{ d.radicado }} · {{ d.tipo }}</td>
                  <td>
                    <span *ngIf="d.codigo_devolucion; else pendienteCodigo" class="font-medium text-brand-dark">
                      {{ d.codigo_devolucion }}
                    </span>
                    <ng-template #pendienteCodigo>
                      <span class="text-xs text-gray-500">Pendiente</span>
                    </ng-template>
                  </td>
                  <td>{{ d.cliente_nombre }}</td>
                  <td>{{ d.area_nombre }}</td>
                  <td>
                    <div>{{ d.inconformidad_nombre }}</div>
                    <div *ngIf="d.inconformidad_descripcion" class="text-xs text-gray-500">
                      ({{ d.inconformidad_descripcion }})
                    </div>
                  </td>
                  <td class="text-gray-500 whitespace-nowrap text-sm">
                    {{ d.fecha_registro | date:'short' }}
                  </td>
                  <td class="text-gray-500 whitespace-nowrap text-sm">
                    {{ d.fecha_cierre | date:'short' }}
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1 justify-end">
                      <a [routerLink]="['/devoluciones', d.devolucion_id]"
                         class="icon-btn"
                         matTooltip="Radicar devolución"
                         aria-label="Radicar devolución">
                        <mat-icon>assignment</mat-icon>
                      </a>
                      <a [routerLink]="['/pqrs', d.pqrs_id]"
                         class="icon-btn icon-view"
                         matTooltip="Ver PQRS"
                         aria-label="Ver PQRS">
                        <mat-icon>visibility</mat-icon>
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sm:hidden space-y-2">
            <a *ngFor="let d of items()" [routerLink]="['/pqrs', d.pqrs_id]"
               class="block p-3 rounded-lg border border-border hover:bg-gray-50">
              <div class="font-semibold text-sm">{{ d.radicado }} · {{ d.tipo }}</div>
              <div class="text-xs text-brand-dark mt-1">
                Devolución: {{ d.codigo_devolucion || 'Pendiente' }}
              </div>
              <div class="text-sm text-gray-700">{{ d.cliente_nombre }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ d.area_nombre }} · {{ d.inconformidad_nombre }}</div>
            </a>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class DevolucionesListComponent implements OnInit {
  private svc = inject(PqrsService);
  protected items = signal<DevolucionPendienteListItem[]>([]);
  protected loading = signal(true);

  ngOnInit(): void {
    this.svc.devolucionesPendientes().subscribe({
      next: (r) => {
        this.items.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
