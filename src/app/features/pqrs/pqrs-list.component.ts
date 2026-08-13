import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PqrsService } from '@app/core/services/pqrs.service';
import { UsuarioService } from '@app/core/services/usuario.service';
import { AuthService } from '@app/core/services/auth.service';
import { PQRSListItem, Usuario } from '@app/core/models/api.models';
import { P } from '@app/core/permissions';

@Component({
  selector: 'app-pqrs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatTooltipModule, DatePipe],
  template: `
    <div class="space-y-4">
      <div class="page-head">
        <h2>PQRS</h2>
        <div class="actions">
          <button class="btn-secondary" (click)="exportar()">
            <mat-icon>download</mat-icon>
            <span class="hidden sm:inline">Exportar</span> Excel
          </button>
          <a routerLink="/pqrs/nuevo" class="btn-primary">
            <mat-icon>add</mat-icon>
            <span class="hidden sm:inline">Nueva</span> PQRS
          </a>
        </div>
      </div>

      <div class="card">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <input [(ngModel)]="filtros.q" (ngModelChange)="onFilterChange()"
                 class="input" placeholder="Buscar (radicado, factura, cliente, NIT)..." />
          <select [(ngModel)]="filtros.tipo" (ngModelChange)="onFilterChange()" class="input">
            <option value="">Todos los tipos</option>
            <option value="QUEJA">Queja</option>
            <option value="RECLAMO">Reclamo</option>
            <option value="SUGERENCIA">Sugerencia</option>
            <option value="PETICION">Petición</option>
            <option value="OTRO">Otro</option>
          </select>
          <select [(ngModel)]="filtros.estado" (ngModelChange)="onFilterChange()" class="input">
            <option value="">Todos los estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="CERRADA">Cerrada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
          <input type="date" [(ngModel)]="filtros.fecha_desde" (ngModelChange)="onFilterChange()" class="input" />
          <select [(ngModel)]="filtros.ciudad" (ngModelChange)="onFilterChange()" class="input">
            <option value="">Todas las ciudades</option>
            <option *ngFor="let c of ciudades()" [ngValue]="c">{{ c }}</option>
          </select>
          <select [(ngModel)]="filtros.estado_area_responsable" (ngModelChange)="onFilterChange()" class="input">
            <option value="">Todos los estados de área resp.</option>
            <option value="NO GESTIONADO">No gestionado</option>
            <option value="PROCEDENTE">Procedente</option>
            <option value="NO PROCEDENTE">No procedente</option>
          </select>
          <select [(ngModel)]="filtros.inconformidad_id" (ngModelChange)="onFilterChange()" class="input">
            <option [ngValue]="''">Todos los motivos</option>
            <option *ngFor="let i of inconformidades()" [ngValue]="i.id">
              {{ i.nombre }}<span *ngIf="i.area_nombre"> · {{ i.area_nombre }}</span>
            </option>
          </select>
          <select *ngIf="puedeFiltrarVendedor()"
                  [(ngModel)]="filtros.vendedor_id"
                  (ngModelChange)="onFilterChange()"
                  class="input sm:col-span-2">
            <option [ngValue]="''">Todos los vendedores</option>
            <option *ngFor="let v of vendedores()" [ngValue]="v.id">
              {{ v.nombre }} · {{ v.email }}
            </option>
          </select>
        </div>

        <!-- Vista tabla (tablet+) -->
        <div class="em-scroll hidden sm:block">
          <table class="em-table">
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Área responsable</th>
                <th>Motivo</th>
                <th matTooltip="Estado del área responsable">Estado área resp.</th>
                <th>Factura</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of items()">
                <td class="font-medium text-brand-dark">{{ p.radicado }}</td>
                <td class="font-medium">{{ p.tipo }}</td>
                <td>{{ p.cliente_nombre }}</td>
                <td>{{ p.vendedor_nombre || '—' }}</td>
                <td>{{ p.area_nombre || '—' }}</td>
                <td>{{ p.inconformidad_nombre || '—' }}</td>
                <td>
                  <span class="badge"
                        [class.badge-pending]="p.estado_area_responsable === 'NO GESTIONADO'"
                        [class.badge-closed]="p.estado_area_responsable === 'PROCEDENTE'"
                        [class.badge-rejected]="p.estado_area_responsable === 'NO PROCEDENTE'">
                    {{ p.estado_area_responsable }}
                  </span>
                </td>
                <td>{{ p.numero_factura || '—' }}</td>
                <td>
                  <span class="badge"
                        [class.badge-open]="p.estado === 'ABIERTA'"
                        [class.badge-progress]="p.estado === 'EN_PROCESO'"
                        [class.badge-closed]="p.estado === 'CERRADA'"
                        [class.badge-rejected]="p.estado === 'RECHAZADA'">
                    {{ p.estado }}
                  </span>
                </td>
                <td class="text-gray-500 whitespace-nowrap">{{ p.fecha_creacion | date:'dd/MM/yy HH:mm' }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 justify-end">
                    <a *ngIf="puedeEditarPQRS()"
                       [routerLink]="['/pqrs', p.id]"
                       [queryParams]="{ edit: 1 }"
                       class="icon-btn icon-edit"
                       matTooltip="Editar / Gestionar"
                       aria-label="Editar / Gestionar">
                      <mat-icon>edit</mat-icon>
                    </a>
                    <button type="button"
                            class="icon-btn icon-view"
                            matTooltip="Descargar documentos PDF"
                            aria-label="Descargar PDF PQRS"
                            (click)="descargarPdf(p.id)">
                      <mat-icon>picture_as_pdf</mat-icon>
                    </button>
                    <a [routerLink]="['/pqrs', p.id]"
                       class="icon-btn icon-view"
                       matTooltip="Ver detalle"
                       aria-label="Ver detalle">
                      <mat-icon>visibility</mat-icon>
                    </a>
                    <button *ngIf="puedeEliminarPQRS()"
                            type="button"
                            class="icon-btn icon-delete"
                            matTooltip="Eliminar PQRS"
                            aria-label="Eliminar PQRS"
                            (click)="eliminar(p)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!items().length">
                <td colspan="11" class="py-6 text-center text-gray-400">Sin resultados.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vista tarjetas (móvil) -->
        <div class="sm:hidden space-y-2">
          <div *ngFor="let p of items()" class="p-3 rounded-lg border border-border hover:bg-gray-50">
            <a [routerLink]="['/pqrs', p.id]" class="block">
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold text-sm">{{ p.radicado }} · {{ p.tipo }}</span>
                <span class="badge"
                      [class.badge-open]="p.estado === 'ABIERTA'"
                      [class.badge-progress]="p.estado === 'EN_PROCESO'"
                      [class.badge-closed]="p.estado === 'CERRADA'"
                      [class.badge-rejected]="p.estado === 'RECHAZADA'">
                  {{ p.estado }}
                </span>
              </div>
              <div class="text-sm text-gray-700 truncate">{{ p.cliente_nombre }}</div>
              <div class="text-xs text-gray-500 mt-1">
                Área responsable: {{ p.area_nombre || '—' }}
                · {{ p.estado_area_responsable }}
              </div>
              <div class="text-xs text-gray-500 mt-1 truncate">
                Motivo: {{ p.inconformidad_nombre || '—' }}
              </div>
              <div class="text-xs text-gray-500 mt-1 flex items-center justify-between">
                <span>Factura: {{ p.numero_factura || '—' }}</span>
                <span>{{ p.fecha_creacion | date:'dd/MM/yy' }}</span>
              </div>
            </a>
            <div *ngIf="puedeEliminarPQRS()" class="flex justify-end mt-2">
              <button type="button"
                      class="icon-btn icon-delete"
                      matTooltip="Eliminar PQRS"
                      aria-label="Eliminar PQRS"
                      (click)="eliminar(p)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
          <div *ngIf="!items().length" class="py-6 text-center text-gray-400 text-sm">
            Sin resultados.
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-start sm:items-center mt-4 text-sm">
          <span class="text-gray-500">Total: {{ total() }}</span>
          <div class="flex gap-2 items-center">
            <button class="btn-secondary" (click)="prev()" [disabled]="page() === 1">Anterior</button>
            <span class="px-2 py-1">{{ page() }} / {{ pages() || 1 }}</span>
            <button class="btn-secondary" (click)="next()" [disabled]="page() >= pages()">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PqrsListComponent implements OnInit {
  private svc = inject(PqrsService);
  private usuarios = inject(UsuarioService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private debounce: any;

  protected items = signal<PQRSListItem[]>([]);
  protected total = signal(0);
  protected page = signal(1);
  protected pages = signal(0);
  protected vendedores = signal<Usuario[]>([]);
  protected ciudades = signal<string[]>([]);
  protected inconformidades = signal<{
    id: number;
    nombre: string;
    area_id: number;
    area_nombre?: string | null;
  }[]>([]);
  protected filtros: any = {
    q: '',
    estado: '',
    tipo: '',
    fecha_desde: '',
    ciudad: '',
    estado_area_responsable: '',
    inconformidad_id: '',
    vendedor_id: '',
  };

  protected puedeFiltrarVendedor = (): boolean => this.auth.can(P.PQRS_FILTRAR_VENDEDOR);
  protected puedeEditarPQRS = (): boolean => this.auth.can(P.PQRS_EDITAR);
  protected puedeEliminarPQRS = (): boolean => this.auth.can(P.PQRS_ELIMINAR);

  ngOnInit(): void {
    if (this.puedeFiltrarVendedor()) {
      this.usuarios.vendedores().subscribe({
        next: (list) => this.vendedores.set(list),
        error: () => this.vendedores.set([]),
      });
    }
    this.svc.opcionesFiltro().subscribe({
      next: (opts) => {
        this.ciudades.set(opts.ciudades || []);
        this.inconformidades.set(opts.inconformidades || []);
      },
      error: () => {
        this.ciudades.set([]);
        this.inconformidades.set([]);
      },
    });
    this.load();
  }

  load(): void {
    const params = { ...this.filtros, page: this.page(), size: 20 };
    if (!params.vendedor_id) delete params.vendedor_id;
    if (!params.inconformidad_id) delete params.inconformidad_id;
    if (!params.ciudad) delete params.ciudad;
    if (!params.estado_area_responsable) delete params.estado_area_responsable;
    this.svc.list(params).subscribe((r) => {
      this.items.set(r.items);
      this.total.set(r.total);
      this.pages.set(r.pages);
    });
  }

  onFilterChange(): void {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => { this.page.set(1); this.load(); }, 300);
  }

  prev() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  next() { if (this.page() < this.pages()) { this.page.update(p => p + 1); this.load(); } }

  exportar(): void {
    this.svc.exportExcel(this.filtros).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pqrs-${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.snack.open('Exportado', 'Cerrar', { duration: 1500 });
      },
    });
  }

  eliminar(p: PQRSListItem): void {
    if (!this.puedeEliminarPQRS()) return;
    if (!confirm(`¿Eliminar la PQRS ${p.radicado}? Esta acción no se puede deshacer.`)) return;
    this.svc.delete(p.id).subscribe({
      next: () => {
        this.snack.open('PQRS eliminada', 'Cerrar', { duration: 2000 });
        this.load();
      },
      error: (e) => {
        const msg = e?.error?.detail || 'No se pudo eliminar la PQRS';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  descargarPdf(id: number): void {
    this.svc.descargarPdf(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pqrs-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.snack.open('No se pudo generar el PDF', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
