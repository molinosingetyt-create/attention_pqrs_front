import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
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

const TIPO_LABELS: Record<string, string> = {
  QUEJA: 'Queja',
  RECLAMO: 'Reclamo',
  SUGERENCIA: 'Sugerencia',
  PETICION: 'Petición',
  OTRO: 'Otro',
};

const ESTADO_LABELS: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En proceso',
  CERRADA: 'Cerrada',
  RECHAZADA: 'Rechazada',
};

const ESTADO_AREA_LABELS: Record<string, string> = {
  'NO GESTIONADO': 'No gestionado',
  PROCEDENTE: 'Procedente',
  'NO PROCEDENTE': 'No procedente',
};

const filtrosVacios = () => ({
  q: '',
  estado: '',
  tipo: '',
  fecha_desde: '',
  ciudad: '',
  estado_area_responsable: '',
  inconformidad_id: '' as number | '',
  categoria_id: '' as number | '',
  producto_catalogo_id: '' as number | '',
  vendedor_id: '' as number | '',
});

@Component({
  selector: 'app-pqrs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatTooltipModule, DatePipe],
  template: `
    <div class="space-y-4">
      <div class="page-head">
        <h2>PQRS</h2>
        <div class="actions">
          <button *ngIf="puedeExportarExcel()" class="btn-secondary" (click)="exportar()">
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
        <div class="filtros-bar mb-4">
          <button type="button" class="btn-secondary shrink-0" (click)="abrirFiltros()">
            <mat-icon>filter_list</mat-icon>
            Filtrar
            <span *ngIf="filtrosActivos().length" class="filtros-count">{{ filtrosActivos().length }}</span>
          </button>

          <span *ngIf="!filtrosActivos().length" class="text-sm text-gray-500">
            Sin filtros aplicados.
          </span>

          <div *ngIf="filtrosActivos().length" class="filtros-chips">
            <span *ngFor="let f of filtrosActivos()" class="filtro-chip">
              <span class="text-gray-500">{{ f.etiqueta }}:</span>
              <span class="font-medium truncate">{{ f.valor }}</span>
              <button type="button"
                      class="filtro-chip-x"
                      [attr.aria-label]="'Quitar filtro ' + f.etiqueta"
                      (click)="quitarFiltro(f.clave)">
                <mat-icon>close</mat-icon>
              </button>
            </span>
            <button type="button"
                    class="text-sm text-brand-dark underline underline-offset-2"
                    (click)="limpiarFiltros()">
              Limpiar todo
            </button>
          </div>
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
                    <button *ngIf="puedeDescargarPdf()"
                            type="button"
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

      <div *ngIf="mostrarFiltros()" class="modal-backdrop" role="presentation" (click)="cerrarFiltros()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="filtros-pqrs-title"
             (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3 id="filtros-pqrs-title">Filtrar PQRS</h3>
            <button type="button" class="icon-btn" (click)="cerrarFiltros()" aria-label="Cerrar modal">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form (ngSubmit)="aplicarFiltros()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="label" for="f-q">Búsqueda</label>
                <input id="f-q" name="q" [(ngModel)]="borrador.q" class="input"
                       placeholder="Radicado, factura, cliente o NIT" />
              </div>

              <div>
                <label class="label" for="f-tipo">Tipo</label>
                <select id="f-tipo" name="tipo" [(ngModel)]="borrador.tipo" class="input">
                  <option value="">Todos los tipos</option>
                  <option value="QUEJA">Queja</option>
                  <option value="RECLAMO">Reclamo</option>
                  <option value="SUGERENCIA">Sugerencia</option>
                  <option value="PETICION">Petición</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label class="label" for="f-estado">Estado</label>
                <select id="f-estado" name="estado" [(ngModel)]="borrador.estado" class="input">
                  <option value="">Todos los estados</option>
                  <option value="ABIERTA">Abierta</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="CERRADA">Cerrada</option>
                  <option value="RECHAZADA">Rechazada</option>
                </select>
              </div>

              <div>
                <label class="label" for="f-fecha">Creadas desde</label>
                <input id="f-fecha" name="fecha_desde" type="date" [(ngModel)]="borrador.fecha_desde" class="input" />
              </div>

              <div>
                <label class="label" for="f-ciudad">Ciudad</label>
                <select id="f-ciudad" name="ciudad" [(ngModel)]="borrador.ciudad" class="input">
                  <option value="">Todas las ciudades</option>
                  <option *ngFor="let c of ciudades()" [ngValue]="c">{{ c }}</option>
                </select>
              </div>

              <div>
                <label class="label" for="f-estado-area">Estado del área responsable</label>
                <select id="f-estado-area" name="estado_area_responsable"
                        [(ngModel)]="borrador.estado_area_responsable" class="input">
                  <option value="">Todos</option>
                  <option value="NO GESTIONADO">No gestionado</option>
                  <option value="PROCEDENTE">Procedente</option>
                  <option value="NO PROCEDENTE">No procedente</option>
                </select>
              </div>

              <div>
                <label class="label" for="f-motivo">Motivo</label>
                <select id="f-motivo" name="inconformidad_id" [(ngModel)]="borrador.inconformidad_id" class="input">
                  <option [ngValue]="''">Todos los motivos</option>
                  <option *ngFor="let i of inconformidades()" [ngValue]="i.id">
                    {{ i.nombre }}<span *ngIf="i.area_nombre"> · {{ i.area_nombre }}</span>
                  </option>
                </select>
              </div>

              <div>
                <label class="label" for="f-categoria">Tipo de producto</label>
                <select id="f-categoria" name="categoria_id" [(ngModel)]="borrador.categoria_id"
                        (ngModelChange)="onCategoriaChange($event)" class="input">
                  <option [ngValue]="''">Todos los tipos de producto</option>
                  <option *ngFor="let c of categorias()" [ngValue]="c.id">{{ c.nombre }}</option>
                </select>
              </div>

              <div>
                <label class="label" for="f-producto">Producto</label>
                <select id="f-producto" name="producto_catalogo_id"
                        [(ngModel)]="borrador.producto_catalogo_id" class="input">
                  <option [ngValue]="''">Todos los productos</option>
                  <option *ngFor="let p of productosFiltrados()" [ngValue]="p.id">
                    {{ p.nombre }}<span *ngIf="p.categoria_nombre"> · {{ p.categoria_nombre }}</span>
                  </option>
                </select>
              </div>

              <div *ngIf="puedeFiltrarVendedor()" class="sm:col-span-2">
                <label class="label" for="f-vendedor">Vendedor</label>
                <select id="f-vendedor" name="vendedor_id" [(ngModel)]="borrador.vendedor_id" class="input">
                  <option [ngValue]="''">Todos los vendedores</option>
                  <option *ngFor="let v of vendedores()" [ngValue]="v.id">
                    {{ v.nombre }} · {{ v.email }}
                  </option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="limpiarBorrador()">Limpiar</button>
              <div class="flex gap-2">
                <button type="button" class="btn-secondary" (click)="cerrarFiltros()">Cancelar</button>
                <button type="submit" class="btn-primary">Aplicar filtros</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filtros-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
    }

    .filtros-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.35rem;
      border-radius: 999px;
      background: var(--em-primary, #0066cc);
      color: #fff;
      font-size: 0.75rem;
      line-height: 1;
    }

    .filtros-chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }

    .filtro-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      max-width: 18rem;
      padding: 0.2rem 0.35rem 0.2rem 0.6rem;
      border: 1px solid var(--em-border);
      border-radius: 999px;
      background: var(--em-surface);
      font-size: 0.8125rem;
      white-space: nowrap;
    }

    .filtro-chip-x {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: transparent;
      cursor: pointer;
      color: var(--em-muted, #6b7280);
      padding: 0;
    }

    .filtro-chip-x:hover {
      color: var(--em-danger, #b91c1c);
    }

    .filtro-chip-x mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(16, 56, 71, 0.45);
      backdrop-filter: blur(2px);
    }

    .modal-card {
      width: min(100%, 44rem);
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
      background: var(--em-surface);
      border: 1px solid var(--em-border);
      border-radius: var(--em-radius);
      box-shadow: var(--em-shadow-md);
      padding: 1.25rem;
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .modal-head h3 {
      margin: 0;
      font-size: 1.125rem;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    @media (max-width: 640px) {
      .modal-backdrop {
        align-items: flex-end;
        padding: 0.75rem;
      }

      .modal-card {
        width: 100%;
      }
    }
  `],
})
export class PqrsListComponent implements OnInit {
  private svc = inject(PqrsService);
  private usuarios = inject(UsuarioService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

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
  protected categorias = signal<{ id: number; nombre: string }[]>([]);
  protected productos = signal<{
    id: number;
    nombre: string;
    categoria_id: number;
    categoria_nombre?: string | null;
  }[]>([]);
  /** Filtros aplicados al listado. */
  protected filtros: any = filtrosVacios();
  /** Copia editable dentro del modal; se vuelca a `filtros` al aplicar. */
  protected borrador: any = filtrosVacios();
  protected mostrarFiltros = signal(false);

  protected productosFiltrados(): { id: number; nombre: string; categoria_id: number; categoria_nombre?: string | null }[] {
    const catId = this.borrador.categoria_id;
    const productos = this.productos();
    if (!catId) return productos;
    return productos.filter((p) => p.categoria_id === catId);
  }

  /** Filtros con valor, para los chips de la barra superior. */
  protected filtrosActivos(): { clave: string; etiqueta: string; valor: string }[] {
    const f = this.filtros;
    const chips: { clave: string; etiqueta: string; valor: string }[] = [];
    if (f.q) chips.push({ clave: 'q', etiqueta: 'Búsqueda', valor: f.q });
    if (f.tipo) chips.push({ clave: 'tipo', etiqueta: 'Tipo', valor: TIPO_LABELS[f.tipo] ?? f.tipo });
    if (f.estado) chips.push({ clave: 'estado', etiqueta: 'Estado', valor: ESTADO_LABELS[f.estado] ?? f.estado });
    if (f.fecha_desde) chips.push({ clave: 'fecha_desde', etiqueta: 'Desde', valor: f.fecha_desde });
    if (f.ciudad) chips.push({ clave: 'ciudad', etiqueta: 'Ciudad', valor: f.ciudad });
    if (f.estado_area_responsable) {
      chips.push({
        clave: 'estado_area_responsable',
        etiqueta: 'Estado área resp.',
        valor: ESTADO_AREA_LABELS[f.estado_area_responsable] ?? f.estado_area_responsable,
      });
    }
    if (f.inconformidad_id) {
      const i = this.inconformidades().find((x) => x.id === f.inconformidad_id);
      chips.push({ clave: 'inconformidad_id', etiqueta: 'Motivo', valor: i?.nombre ?? String(f.inconformidad_id) });
    }
    if (f.categoria_id) {
      const c = this.categorias().find((x) => x.id === f.categoria_id);
      chips.push({ clave: 'categoria_id', etiqueta: 'Tipo de producto', valor: c?.nombre ?? String(f.categoria_id) });
    }
    if (f.producto_catalogo_id) {
      const p = this.productos().find((x) => x.id === f.producto_catalogo_id);
      chips.push({ clave: 'producto_catalogo_id', etiqueta: 'Producto', valor: p?.nombre ?? String(f.producto_catalogo_id) });
    }
    if (f.vendedor_id) {
      const v = this.vendedores().find((x) => x.id === f.vendedor_id);
      chips.push({ clave: 'vendedor_id', etiqueta: 'Vendedor', valor: v?.nombre ?? String(f.vendedor_id) });
    }
    return chips;
  }

  abrirFiltros(): void {
    this.borrador = { ...this.filtros };
    this.mostrarFiltros.set(true);
  }

  cerrarFiltros(): void {
    this.mostrarFiltros.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mostrarFiltros()) this.cerrarFiltros();
  }

  /** Vacía el formulario del modal sin aplicar todavía. */
  limpiarBorrador(): void {
    this.borrador = filtrosVacios();
  }

  aplicarFiltros(): void {
    this.filtros = { ...this.borrador };
    this.mostrarFiltros.set(false);
    this.page.set(1);
    this.load();
  }

  /** Quita un chip de la barra y recarga de inmediato. */
  quitarFiltro(clave: string): void {
    this.filtros[clave] = '';
    if (clave === 'categoria_id') this.filtros.producto_catalogo_id = '';
    this.page.set(1);
    this.load();
  }

  limpiarFiltros(): void {
    this.filtros = filtrosVacios();
    this.page.set(1);
    this.load();
  }

  protected puedeFiltrarVendedor = (): boolean => this.auth.can(P.PQRS_FILTRAR_VENDEDOR);
  protected puedeEditarPQRS = (): boolean => this.auth.can(P.PQRS_EDITAR);
  protected puedeEliminarPQRS = (): boolean => this.auth.can(P.PQRS_ELIMINAR);
  protected puedeExportarExcel = (): boolean => this.auth.can(P.PQRS_EXPORTAR);
  protected puedeDescargarPdf = (): boolean => this.auth.can(P.PQRS_DESCARGAR_PDF);

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
        this.categorias.set(opts.categorias || []);
        this.productos.set(opts.productos || []);
      },
      error: () => {
        this.ciudades.set([]);
        this.inconformidades.set([]);
        this.categorias.set([]);
        this.productos.set([]);
      },
    });
    this.load();
  }

  load(): void {
    const params = { ...this.filtros, page: this.page(), size: 20 };
    if (!params.vendedor_id) delete params.vendedor_id;
    if (!params.inconformidad_id) delete params.inconformidad_id;
    if (!params.categoria_id) delete params.categoria_id;
    if (!params.producto_catalogo_id) delete params.producto_catalogo_id;
    if (!params.ciudad) delete params.ciudad;
    if (!params.estado_area_responsable) delete params.estado_area_responsable;
    this.svc.list(params).subscribe((r) => {
      this.items.set(r.items);
      this.total.set(r.total);
      this.pages.set(r.pages);
    });
  }

  /** Al cambiar el tipo de producto en el modal, el producto deja de ser válido. */
  onCategoriaChange(categoriaId: number | ''): void {
    this.borrador.categoria_id = categoriaId;
    this.borrador.producto_catalogo_id = '';
  }

  prev() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  next() { if (this.page() < this.pages()) { this.page.update(p => p + 1); this.load(); } }

  exportar(): void {
    if (!this.puedeExportarExcel()) return;
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
    if (!this.puedeDescargarPdf()) return;
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
