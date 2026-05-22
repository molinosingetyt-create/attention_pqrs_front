import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '@env/environment';
import { AuthService } from '@app/core/services/auth.service';
import { PqrsService } from '@app/core/services/pqrs.service';
import { UsuarioService } from '@app/core/services/usuario.service';
import { Inconformidad, PQRSDetail, Usuario } from '@app/core/models/api.models';

@Component({
  selector: 'app-pqrs-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, DatePipe, DecimalPipe],
  template: `
    <div *ngIf="pqrs() as p" class="space-y-6">
      <a routerLink="/pqrs" class="text-brand hover:underline flex items-center">
        <mat-icon>arrow_back</mat-icon> Volver al listado
      </a>

      <!-- Edición (solo administrador) -->
      <div *ngIf="editMode() && puedeGestionarPQRS()" class="card border border-[rgba(0,102,204,0.25)]">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 class="font-semibold text-gray-800">Editar / Gestionar PQRS</h3>
            <p class="text-xs text-gray-500">
              Cambios permitidos: estado, factura, lote, inconformidad, vendedor, descripción.
            </p>
          </div>
          <button
            type="button"
            class="btn-secondary"
            (click)="toggleEdit(false)">
            <mat-icon>close</mat-icon> Cerrar edición
          </button>
        </div>

        <p *ngIf="pqrsEsTerminal(p)" class="text-sm text-gray-600 mt-3">
          Esta PQRS está cerrada o rechazada; no se permite modificar.
        </p>

        <form
          *ngIf="!pqrsEsTerminal(p)"
          [formGroup]="editForm"
          (ngSubmit)="guardarCambios()"
          class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div class="field">
            <label class="block text-sm font-medium mb-1">Estado</label>
            <select class="input" formControlName="estado">
              <option value="ABIERTA">Abierta</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="CERRADA">Cerrada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>

          <div class="field">
            <label class="block text-sm font-medium mb-1">Vendedor</label>
            <select class="input" formControlName="vendedor_id">
              <option [ngValue]="null">—</option>
              <option *ngFor="let v of vendedores()" [ngValue]="v.id">{{ v.nombre }} · {{ v.email }}</option>
            </select>
          </div>

          <div class="field">
            <label class="block text-sm font-medium mb-1">Factura</label>
            <input class="input w-full" formControlName="numero_factura" />
          </div>

          <div class="field">
            <label class="block text-sm font-medium mb-1">Lote</label>
            <input class="input w-full" formControlName="lote" />
          </div>

          <div class="field md:col-span-2">
            <label class="block text-sm font-medium mb-1">Inconformidad</label>
            <select class="input" formControlName="inconformidad_id">
              <option [ngValue]="null">—</option>
              <option *ngFor="let inc of inconformidades()" [ngValue]="inc.id">
                {{ inc.area?.nombre }} · {{ inc.nombre }}
              </option>
            </select>
          </div>

          <div class="field md:col-span-2">
            <label class="block text-sm font-medium mb-1">Descripción / detalle</label>
            <textarea class="input w-full" rows="4" formControlName="descripcion"></textarea>
          </div>

          <div class="md:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" class="btn-secondary" (click)="resetEditForm(p)">
              Restablecer
            </button>
            <button type="submit" class="btn-primary">
              <mat-icon>save</mat-icon> Guardar cambios
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-2xl font-bold">{{ p.radicado }} · {{ p.tipo }}</h2>
            <p class="text-sm text-gray-500">Creada el {{ p.fecha_creacion | date:'medium' }}</p>
          </div>
          <span class="badge text-base"
                [class.badge-open]="p.estado === 'ABIERTA'"
                [class.badge-progress]="p.estado === 'EN_PROCESO'"
                [class.badge-closed]="p.estado === 'CERRADA'"
                [class.badge-rejected]="p.estado === 'RECHAZADA'">
            {{ p.estado }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 class="font-semibold mb-2 text-gray-700">Cliente</h3>
            <div class="text-sm space-y-1">
              <div><strong>Nombre:</strong> {{ p.cliente.nombre }} {{ p.cliente.apellidos }}</div>
              <div><strong>NIT:</strong> {{ p.cliente.nit }}</div>
              <div><strong>Correo:</strong> {{ p.cliente.correo || '—' }}</div>
              <div><strong>Ciudad:</strong> {{ p.cliente.ciudad || '—' }}</div>
            </div>
          </div>
          <div>
            <h3 class="font-semibold mb-2 text-gray-700">Detalles</h3>
            <div class="text-sm space-y-1">
              <div><strong>Factura:</strong> {{ p.numero_factura || '—' }}</div>
              <div><strong>Lote:</strong> {{ p.lote || '—' }}</div>
              <div>
                <strong>Inconformidad:</strong>
                <ng-container *ngIf="p.inconformidad; else sinInc">
                  {{ p.inconformidad.nombre }}
                  <span *ngIf="p.inconformidad.descripcion" class="text-gray-600">
                    ({{ p.inconformidad.descripcion }})
                  </span>
                  <span *ngIf="p.inconformidad.area" class="text-xs text-gray-500 block mt-1">
                    Área: {{ p.inconformidad.area.nombre }}
                  </span>
                </ng-container>
                <ng-template #sinInc>—</ng-template>
              </div>
              <div><strong>Vendedor:</strong> {{ p.vendedor?.nombre || '—' }}</div>
            </div>
          </div>
          <div class="md:col-span-2">
            <h3 class="font-semibold mb-2 text-gray-700">Descripción</h3>
            <p class="text-sm whitespace-pre-line">{{ p.descripcion || 'Sin descripción.' }}</p>
          </div>
        </div>
      </div>

      <!-- Productos -->
      <div class="card">
        <h3 class="font-semibold mb-3">Productos ({{ p.productos.length }})</h3>
        <table class="min-w-full text-sm">
          <thead class="text-left text-gray-500 border-b">
            <tr>
              <th class="py-2 px-3">Producto</th>
              <th class="py-2 px-3">Cantidad</th>
              <th class="py-2 px-3">Factura</th>
              <th class="py-2 px-3">Lote</th>
              <th class="py-2 px-3">Comentario</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let prod of p.productos" class="border-b">
              <td class="py-2 px-3">{{ prod.nombre_producto }}</td>
              <td class="py-2 px-3">{{ prod.cantidad | number:'1.0-2' }}</td>
              <td class="py-2 px-3">{{ prod.numero_factura || '—' }}</td>
              <td class="py-2 px-3">{{ prod.lote || '—' }}</td>
              <td class="py-2 px-3">{{ prod.comentario || '—' }}</td>
            </tr>
            <tr *ngIf="!p.productos.length">
              <td colspan="5" class="py-3 text-center text-gray-400">Sin productos.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Evidencias -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold">Evidencias ({{ p.evidencias.length }})</h3>
          <label *ngIf="puedeGestionarPQRS() && !pqrsEsTerminal(p)" class="btn-secondary cursor-pointer">
            <mat-icon>upload</mat-icon> Subir archivo
            <input type="file" hidden (change)="subirEvidencia($event)" />
          </label>
        </div>
        <ul class="divide-y divide-gray-100">
          <li *ngFor="let ev of p.evidencias" class="py-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-gray-400">insert_drive_file</mat-icon>
              <a [href]="fullUrl(ev.archivo_url)" target="_blank" class="text-brand hover:underline">
                {{ ev.nombre_original || ev.archivo_url }}
              </a>
            </div>
            <span class="text-xs text-gray-400">{{ ev.fecha_subida | date:'short' }}</span>
          </li>
          <li *ngIf="!p.evidencias.length" class="py-3 text-center text-gray-400">Sin archivos.</li>
        </ul>
      </div>

      <!-- Seguimientos -->
      <div class="card">
        <h3 class="font-semibold mb-3">Historial / Seguimiento</h3>
        <p *ngIf="pqrsEsTerminal(p)" class="text-sm text-gray-600 mb-4">
          Esta PQRS está {{ p.estado === 'CERRADA' ? 'cerrada' : 'rechazada' }}; el historial queda en solo lectura.
        </p>
        <form *ngIf="puedeGestionarPQRS() && !pqrsEsTerminal(p)" [formGroup]="segForm" (ngSubmit)="addSeguimiento()"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <select class="input" formControlName="estado">
            <option value="ABIERTA">Abierta</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="CERRADA">Cerrada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
          <input class="input sm:col-span-1 lg:col-span-2" formControlName="descripcion"
                 placeholder="Descripción del seguimiento..." />
          <button type="submit" class="btn-primary sm:col-span-2 lg:col-span-1">Agregar</button>
        </form>
        <p *ngIf="!puedeGestionarPQRS() && !pqrsEsTerminal(p)" class="text-sm text-gray-500 mb-4">
          El seguimiento y la documentación adicional las gestionan administración.
        </p>

        <ol class="relative timeline-line">
          <li *ngFor="let s of p.seguimientos" class="ms-4 pb-4">
            <div class="timeline-dot"></div>
            <div class="flex items-center gap-2 text-sm">
              <span class="badge"
                    [class.badge-open]="s.estado === 'ABIERTA'"
                    [class.badge-progress]="s.estado === 'EN_PROCESO'"
                    [class.badge-closed]="s.estado === 'CERRADA'"
                    [class.badge-rejected]="s.estado === 'RECHAZADA'">{{ s.estado }}</span>
              <span class="text-xs text-gray-500">
                {{ s.fecha | date:'short' }} · {{ s.usuario_nombre || 'Sistema' }}
              </span>
            </div>
            <p class="text-sm mt-1">{{ s.descripcion || '—' }}</p>
          </li>
        </ol>
      </div>
    </div>
  `,
})
export class PqrsDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(PqrsService);
  private usuarios = inject(UsuarioService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  protected auth = inject(AuthService);

  protected pqrs = signal<PQRSDetail | null>(null);
  protected editMode = signal(false);
  protected vendedores = signal<Usuario[]>([]);
  protected inconformidades = signal<Inconformidad[]>([]);

  protected puedeGestionarPQRS = (): boolean =>
    this.auth.hasRole('ADMINISTRADOR');

  protected pqrsEsTerminal(p: PQRSDetail): boolean {
    return p.estado === 'CERRADA' || p.estado === 'RECHAZADA';
  }

  protected segForm = this.fb.nonNullable.group({
    estado: ['EN_PROCESO'],
    descripcion: [''],
  });

  protected editForm = this.fb.group({
    estado: ['EN_PROCESO'],
    descripcion: [''],
    numero_factura: [''],
    lote: [''],
    inconformidad_id: [null as number | null],
    vendedor_id: [null as number | null],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.editMode.set(this.route.snapshot.queryParamMap.get('edit') === '1');
    this.load(id);
    this.loadCatalogos();
  }

  load(id: number): void {
    this.svc.detail(id).subscribe((p) => {
      this.pqrs.set(p);
      this.resetEditForm(p);
    });
  }

  private loadCatalogos(): void {
    this.usuarios.vendedores().subscribe({
      next: (list) => this.vendedores.set(list),
      error: () => this.vendedores.set([]),
    });
    this.svc.inconformidades().subscribe({
      next: (list) => this.inconformidades.set(list),
      error: () => this.inconformidades.set([]),
    });
  }

  protected toggleEdit(v: boolean): void {
    this.editMode.set(v);
  }

  protected resetEditForm(p: PQRSDetail): void {
    const incId = p.inconformidad?.id ?? null;
    const vendId = p.vendedor?.id ?? null;
    this.editForm.reset({
      estado: p.estado,
      descripcion: p.descripcion ?? '',
      numero_factura: p.numero_factura ?? '',
      lote: p.lote ?? '',
      inconformidad_id: incId,
      vendedor_id: vendId,
    });
  }

  protected guardarCambios(): void {
    if (!this.puedeGestionarPQRS()) return;
    const p = this.pqrs();
    if (!p || this.pqrsEsTerminal(p)) return;

    const raw = this.editForm.getRawValue();
    const payload: any = {
      estado: raw.estado || null,
      descripcion: raw.descripcion || null,
      numero_factura: raw.numero_factura || null,
      lote: raw.lote || null,
      inconformidad_id: raw.inconformidad_id,
      vendedor_id: raw.vendedor_id,
    };

    this.svc.update(p.id, payload).subscribe({
      next: () => {
        this.snack.open('PQRS actualizada', 'Cerrar', { duration: 2000 });
        this.load(p.id);
      },
      error: (e) => {
        const msg = e?.error?.detail || 'No se pudo actualizar la PQRS';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  addSeguimiento(): void {
    if (!this.puedeGestionarPQRS()) return;
    const p = this.pqrs();
    if (!p || this.pqrsEsTerminal(p)) return;
    this.svc.crearSeguimiento(p.id, this.segForm.getRawValue()).subscribe(() => {
      this.snack.open('Seguimiento agregado', 'Cerrar', { duration: 2000 });
      this.load(p.id);
    });
  }

  subirEvidencia(e: Event): void {
    if (!this.puedeGestionarPQRS()) return;
    const p = this.pqrs();
    if (p && this.pqrsEsTerminal(p)) return;
    const input = e.target as HTMLInputElement;
    if (!p || !input.files?.length) return;
    this.svc.subirEvidencia(p.id, input.files[0]).subscribe(() => {
      this.snack.open('Archivo subido', 'Cerrar', { duration: 2000 });
      this.load(p.id);
    });
  }

  fullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${environment.filesBaseUrl}${url}`;
  }
}
