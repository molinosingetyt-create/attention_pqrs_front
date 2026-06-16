import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  CategoriaProducto,
  Cliente,
  Inconformidad,
  ProductoCatalogo,
  Usuario,
} from '@app/core/models/api.models';
import { AuthService } from '@app/core/services/auth.service';
import { P } from '@app/core/permissions';
import { CatalogoProductosService } from '@app/core/services/catalogo-productos.service';
import { ClienteService } from '@app/core/services/cliente.service';
import { PqrsService } from '@app/core/services/pqrs.service';
import { UsuarioService } from '@app/core/services/usuario.service';

@Component({
  selector: 'app-pqrs-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-4">
      <a routerLink="/pqrs" class="text-brand hover:underline inline-flex items-center">
        <mat-icon>arrow_back</mat-icon> Volver
      </a>
      <h2 class="text-xl sm:text-2xl font-bold text-gray-800">Nueva PQRS</h2>

      <form [formGroup]="form" (ngSubmit)="save()" class="card space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Cliente buscador -->
          <div class="sm:col-span-2">
            <label class="label">Cliente *</label>
            <div class="relative">
              <input
                class="input"
                [value]="clienteLabel()"
                (input)="onClienteSearch($any($event.target).value)"
                placeholder="Buscar por nombre o NIT..." />
              <ul *ngIf="sugerencias().length"
                  class="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                <li *ngFor="let c of sugerencias()"
                    (click)="seleccionarCliente(c)"
                    class="px-3 py-2 hover:bg-brand-light cursor-pointer">
                  <div class="font-medium">{{ c.nombre }} {{ c.apellidos }}</div>
                  <div class="text-xs text-gray-500">NIT: {{ c.nit }} · {{ c.ciudad || '' }}</div>
                </li>
              </ul>
            </div>
            <p *ngIf="form.get('cliente_id')?.touched && form.get('cliente_id')?.invalid"
               class="text-xs text-danger mt-1">Selecciona un cliente.</p>
          </div>

          <div>
            <label class="label">Tipo PQRS *</label>
            <select class="input" formControlName="tipo">
              <option value="QUEJA">Queja</option>
              <option value="RECLAMO">Reclamo</option>
              <option value="SUGERENCIA">Sugerencia</option>
              <option value="PETICION">Petición</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div>
            <label class="label">Inconformidad *</label>
            <select class="input" formControlName="inconformidad_id">
              <option [ngValue]="null">— Seleccione —</option>
              <option
                *ngFor="let i of inconformidadesOrdenadas()"
                [ngValue]="i.id"
                [attr.title]="i.descripcion || null">
                {{ i.nombre }}
              </option>
            </select>
            <p *ngIf="form.get('inconformidad_id')?.touched && form.get('inconformidad_id')?.invalid"
               class="text-xs text-danger mt-1">Selecciona una inconformidad.</p>
            <p
              *ngIf="inconformidadSeleccionada()?.descripcion as desc"
              class="text-xs text-gray-500 mt-1 leading-snug max-w-prose">
              {{ desc }}
            </p>
          </div>

          <!-- Selector de vendedor (solo Admin / Admin Comercial) -->
          <div *ngIf="puedeAsignarVendedor()" class="sm:col-span-2">
            <label class="label">Vendedor asignado</label>
            <select class="input" formControlName="vendedor_id">
              <option [ngValue]="null">(Sin asignar)</option>
              <option *ngFor="let v of vendedores()" [ngValue]="v.id">
                {{ v.nombre }} · {{ v.email }}
              </option>
            </select>
            <p *ngIf="!vendedores().length" class="text-xs text-gray-500 mt-1">
              No hay vendedores activos registrados.
            </p>
          </div>

          <div class="sm:col-span-2">
            <label class="label">Descripción</label>
            <textarea rows="4" class="input" formControlName="descripcion"
                      placeholder="Describe la solicitud..."></textarea>
          </div>
        </div>

        <!-- Productos: categoría → producto del catálogo -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="label mb-0">Productos</label>
            <button type="button" class="btn-secondary" (click)="addProducto()">
              <mat-icon>add</mat-icon> Agregar producto
            </button>
          </div>
          <p class="text-xs text-gray-500 mb-2">
            Elige el producto y registra allí su factura, lote y comentario.
          </p>
          <div formArrayName="productos" class="space-y-3">
            <div *ngFor="let ctrl of productos.controls; let i = index"
                 [formGroupName]="i"
                 class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-end border border-border rounded-lg p-3">
              <div class="xl:col-span-3">
                <label class="label text-xs">Categoría</label>
                <select class="input text-sm" formControlName="categoria_id">
                  <option [ngValue]="null">— Seleccione —</option>
                  <option *ngFor="let c of categorias()" [ngValue]="c.id">{{ c.nombre }}</option>
                </select>
              </div>
              <div class="xl:col-span-5">
                <label class="label text-xs">Producto</label>
                <select class="input text-sm min-w-0" formControlName="producto_catalogo_id">
                  <option [ngValue]="null">— Seleccione —</option>
                  <option *ngFor="let pr of opcionesForRow(i)" [ngValue]="pr.id">{{ pr.nombre }}</option>
                </select>
              </div>
              <div class="xl:col-span-2">
                <label class="label text-xs">Cantidad</label>
                <input type="number" min="0.01" step="0.01" class="input text-sm w-full"
                       formControlName="cantidad" />
              </div>
              <div class="xl:col-span-3">
                <label class="label text-xs">Número de factura *</label>
                <input class="input text-sm" formControlName="numero_factura" />
              </div>
              <div class="xl:col-span-3">
                <label class="label text-xs">Número de lote *</label>
                <input class="input text-sm" formControlName="lote" />
              </div>
              <div class="xl:col-span-4">
                <label class="label text-xs">Comentario del producto</label>
                <input
                  class="input text-sm"
                  formControlName="comentario"
                  placeholder="Detalle asociado a este producto" />
              </div>
              <div class="xl:col-span-12 flex justify-end">
                <button type="button" class="btn-text-danger"
                        aria-label="Eliminar producto"
                        (click)="removeProducto(i)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            <p *ngIf="!productos.length" class="text-xs text-gray-400">
              Sin productos agregados.
            </p>
          </div>
        </div>

        <!-- Evidencias -->
        <div>
          <label class="label">Evidencias (archivos) *</label>
          <input type="file" multiple (change)="onFileChange($event)" class="input-file-pqrs" />
          <p class="text-xs text-gray-500 mt-1">
            Sugerencia: sube fotos del rotulado donde se vea el lote y fotos claras del problema reportado.
          </p>
          <ul class="mt-2 text-sm text-gray-600">
            <li *ngFor="let f of archivos()">
              <mat-icon class="align-middle" style="font-size:18px">description</mat-icon>
              {{ f.name }} ({{ (f.size/1024) | number:'1.0-0' }} KB)
            </li>
          </ul>
          <p *ngIf="submitted() && !archivos().length" class="text-xs text-danger mt-1">
            Debes subir al menos una foto o evidencia.
          </p>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <a routerLink="/pqrs" class="btn-secondary">Cancelar</a>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
            Crear PQRS
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PqrsFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pqrs = inject(PqrsService);
  private catalogo = inject(CatalogoProductosService);
  private clientes = inject(ClienteService);
  private usuarios = inject(UsuarioService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  protected inconformidades = signal<Inconformidad[]>([]);
  /** Lista plana: solo nombre en el desplegable; descripción vía tooltip (title) y texto bajo el select. */
  protected inconformidadesOrdenadas = computed(() =>
    [...this.inconformidades()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  );
  private readonly inconformidadIdSeleccionada = signal<number | null>(null);
  protected inconformidadSeleccionada = computed(() => {
    const id = this.inconformidadIdSeleccionada();
    if (id == null) return null;
    return this.inconformidades().find((x) => x.id === id) ?? null;
  });
  protected vendedores = signal<Usuario[]>([]);
  protected sugerencias = signal<Cliente[]>([]);
  protected clienteLabel = signal('');
  protected archivos = signal<File[]>([]);
  protected saving = signal(false);
  protected submitted = signal(false);
  protected categorias = signal<CategoriaProducto[]>([]);
  /** Opciones de producto por fila (clave = rowId del FormGroup). */
  protected opcionesByRowId = signal<Record<string, ProductoCatalogo[]>>({});

  protected puedeAsignarVendedor = (): boolean => this.auth.can(P.PQRS_FILTRAR_VENDEDOR);

  protected form = this.fb.nonNullable.group({
    cliente_id: [null as number | null, Validators.required],
    tipo: ['QUEJA', Validators.required],
    inconformidad_id: [null as number | null, Validators.required],
    vendedor_id: [null as number | null],
    descripcion: [''],
    productos: this.fb.array<FormGroup>([]),
  });

  get productos(): FormArray<FormGroup> {
    return this.form.get('productos') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.pqrs.inconformidades().subscribe((list) => this.inconformidades.set(list));
    this.catalogo.categorias(true).subscribe({
      next: (c) => this.categorias.set(c),
      error: () => this.categorias.set([]),
    });
    const incCtrl = this.form.get('inconformidad_id');
    this.inconformidadIdSeleccionada.set(incCtrl?.value ?? null);
    incCtrl?.valueChanges.subscribe((v) => this.inconformidadIdSeleccionada.set(v));
    if (this.puedeAsignarVendedor()) {
      this.usuarios.vendedores().subscribe({
        next: (list) => this.vendedores.set(list),
        error: () => this.vendedores.set([]),
      });
    }
    this.addProducto();
  }

  opcionesForRow(i: number) {
    const rid = this.productos.at(i).get('rowId')?.value as string | undefined;
    if (!rid) return [];
    return this.opcionesByRowId()[rid] || [];
  }

  private setOpcionesRow(rowId: string, list: ProductoCatalogo[]): void {
    this.opcionesByRowId.update((m) => ({ ...m, [rowId]: list }));
  }

  private clearOpcionesRow(rowId: string): void {
    this.opcionesByRowId.update((m) => {
      const n = { ...m };
      delete n[rowId];
      return n;
    });
  }

  addProducto(): void {
    const rowId = crypto.randomUUID();
    const grp = this.fb.nonNullable.group({
      rowId: [rowId],
      categoria_id: [null as number | null, Validators.required],
      producto_catalogo_id: [null as number | null, Validators.required],
      nombre_producto: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.01)]],
      numero_factura: ['', Validators.required],
      lote: ['', Validators.required],
      comentario: [''],
    });
    grp.get('categoria_id')?.valueChanges.subscribe((cid) => {
      const rid = grp.get('rowId')?.value as string;
      grp.patchValue({ producto_catalogo_id: null, nombre_producto: '' }, { emitEvent: false });
      if (!cid) {
        this.clearOpcionesRow(rid);
        return;
      }
      this.catalogo.productosPorCategoria(cid, true).subscribe((list) => this.setOpcionesRow(rid, list));
    });
    grp.get('producto_catalogo_id')?.valueChanges.subscribe((pid) => {
      if (!pid) {
        grp.patchValue({ nombre_producto: '' }, { emitEvent: false });
        return;
      }
      const rid = grp.get('rowId')?.value as string;
      const list = this.opcionesByRowId()[rid] || [];
      const pr = list.find((x) => x.id === pid);
      if (pr) grp.patchValue({ nombre_producto: pr.nombre }, { emitEvent: false });
    });
    this.productos.push(grp);
  }

  removeProducto(i: number): void {
    const rid = this.productos.at(i).get('rowId')?.value as string | undefined;
    if (rid) this.clearOpcionesRow(rid);
    this.productos.removeAt(i);
  }

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.archivos.set([...this.archivos(), ...Array.from(input.files)]);
  }

  private searchTimer: any;
  onClienteSearch(text: string): void {
    this.clienteLabel.set(text);
    this.form.patchValue({ cliente_id: null });
    clearTimeout(this.searchTimer);
    if (text.trim().length < 2) {
      this.sugerencias.set([]);
      return;
    }
    this.searchTimer = setTimeout(() => {
      this.clientes.list({ q: text, size: 8 }).subscribe((r) => this.sugerencias.set(r.items));
    }, 250);
  }

  seleccionarCliente(c: Cliente): void {
    this.form.patchValue({ cliente_id: c.id });
    this.clienteLabel.set(`${c.nombre} ${c.apellidos ?? ''} · NIT ${c.nit}`);
    this.sugerencias.set([]);
  }

  save(): void {
    this.submitted.set(true);
    if (this.form.invalid || !this.archivos().length || !this.productos.length) {
      this.form.markAllAsTouched();
      if (!this.archivos().length) {
        this.snack.open('Debes subir al menos una foto o evidencia.', 'Cerrar', { duration: 2500 });
      }
      return;
    }
    this.saving.set(true);
    const data = this.form.getRawValue();
    const payload: any = {
      ...data,
      productos: data.productos.map((p: any) => {
        const row: Record<string, unknown> = {
          nombre_producto: p.nombre_producto,
          cantidad: Number(p.cantidad),
          numero_factura: p.numero_factura?.trim() || null,
          lote: p.lote?.trim() || null,
          comentario: p.comentario?.trim() || null,
        };
        if (p.producto_catalogo_id != null) {
          row['producto_catalogo_id'] = p.producto_catalogo_id;
        }
        return row;
      }),
    };
    if (!payload.inconformidad_id) delete payload.inconformidad_id;
    if (!this.puedeAsignarVendedor() || !payload.vendedor_id) {
      delete payload.vendedor_id;
    }

    this.pqrs.create(payload).subscribe({
      next: (creada) => {
        const files = this.archivos();
        if (!files.length) {
          this.finalize(creada.id);
          return;
        }
        let remaining = files.length;
        files.forEach((f) => {
          this.pqrs.subirEvidencia(creada.id, f, true).subscribe({
            next: () => { if (--remaining === 0) this.finalize(creada.id); },
            error: () => { if (--remaining === 0) this.finalize(creada.id); },
          });
        });
      },
      error: () => this.saving.set(false),
    });
  }

  private finalize(id: number): void {
    this.pqrs.notificarCalidad(id).subscribe({
      next: () => this.finishCreate(id),
      error: () => this.finishCreate(id),
    });
  }

  private finishCreate(id: number): void {
    this.snack.open('PQRS creada correctamente', 'Cerrar', { duration: 2500 });
    this.router.navigate(['/pqrs', id]);
  }
}
