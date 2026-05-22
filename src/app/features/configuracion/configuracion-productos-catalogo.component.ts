import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CategoriaProducto, ProductoCatalogo } from '@app/core/models/api.models';
import { ConfiguracionService } from '@app/core/services/configuracion.service';

@Component({
  selector: 'app-configuracion-productos-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="card space-y-4">
      <h2 class="text-lg font-semibold">Productos del catálogo</h2>
      <div>
        <label class="label">Categoría</label>
        <select class="input max-w-xl" [value]="catProdId() ?? ''" (change)="onCatProdSelect($event)">
          <option value="">— Seleccione —</option>
          <option *ngFor="let c of categorias()" [value]="c.id">{{ c.nombre }}</option>
        </select>
      </div>
      <form *ngIf="catProdId()" [formGroup]="formProd" (ngSubmit)="crearProd()" class="flex flex-wrap gap-2 items-end">
        <div class="flex-1 min-w-12rem">
          <label class="label">Nombre producto</label>
          <input class="input" formControlName="nombre" />
        </div>
        <button class="btn-primary" type="submit" [disabled]="formProd.invalid">Agregar</button>
      </form>
      <div *ngIf="catProdId()" class="em-scroll max-h-28rem">
        <table class="em-table text-sm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Orden</th>
              <th>Activo</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of productosCat()">
              <ng-container *ngIf="editProdId() !== p.id">
                <td>{{ p.nombre }}</td>
                <td>{{ p.orden }}</td>
                <td>{{ p.activo ? 'Sí' : 'No' }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      class="icon-btn icon-edit"
                      (click)="startEditProd(p)"
                      matTooltip="Editar"
                      aria-label="Editar producto">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-toggle"
                      (click)="toggleActivoProd(p)"
                      matTooltip="Activar o desactivar"
                      aria-label="Activar o desactivar producto">
                      <mat-icon>toggle_on</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-delete"
                      (click)="borrarProd(p)"
                      matTooltip="Eliminar"
                      aria-label="Eliminar producto">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>
              <ng-container *ngIf="editProdId() === p.id">
                <td colspan="3" class="align-top">
                  <div class="flex flex-wrap gap-2 py-1">
                    <div class="flex-1 min-w-10rem">
                      <label class="label text-xs">Nombre</label>
                      <input class="input text-sm" [(ngModel)]="editProd.nombre" [ngModelOptions]="{standalone: true}" />
                    </div>
                    <div class="w-24">
                      <label class="label text-xs">Orden</label>
                      <input class="input text-sm" type="number" [(ngModel)]="editProd.orden" [ngModelOptions]="{standalone: true}" />
                    </div>
                  </div>
                </td>
                <td class="text-right align-top whitespace-nowrap">
                  <button type="button" class="btn-primary text-sm px-2 py-1" (click)="guardarProd(p.id)">Guardar</button>
                  <button type="button" class="btn-secondary text-sm px-2 py-1 ml-1" (click)="cancelEditProd()">Cancelar</button>
                </td>
              </ng-container>
            </tr>
            <tr *ngIf="catProdId() && !productosCat().length">
              <td colspan="4" class="py-6 text-center text-gray-400">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ConfiguracionProductosCatalogoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ConfiguracionService);
  private snack = inject(MatSnackBar);

  categorias = signal<CategoriaProducto[]>([]);
  productosCat = signal<ProductoCatalogo[]>([]);
  catProdId = signal<number | null>(null);
  editProdId = signal<number | null>(null);
  editProd: { nombre: string; orden: number } = { nombre: '', orden: 0 };

  formProd = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    this.reloadCategorias();
  }

  reloadCategorias(): void {
    this.api.listarCategoriasProducto().subscribe({
      next: (r) => this.categorias.set(r),
      error: () => this.snack.open('No se pudieron cargar categorías', 'Cerrar'),
    });
  }

  onCatProdSelect(ev: Event): void {
    const raw = (ev.target as HTMLSelectElement).value;
    if (!raw) {
      this.onCatProdChange(null);
      return;
    }
    const id = Number(raw);
    this.onCatProdChange(Number.isFinite(id) ? id : null);
  }

  onCatProdChange(id: number | null): void {
    this.editProdId.set(null);
    this.catProdId.set(id);
    this.formProd.reset();
    if (!id) {
      this.productosCat.set([]);
      return;
    }
    this.api.listarProductosCatalogo(id).subscribe({
      next: (r) => this.productosCat.set(r),
      error: () => this.snack.open('No se pudieron cargar productos', 'Cerrar'),
    });
  }

  crearProd(): void {
    const cid = this.catProdId();
    if (!cid) return;
    this.api
      .crearProductoCatalogo({
        categoria_id: cid,
        nombre: this.formProd.get('nombre')!.value.trim(),
      })
      .subscribe({
        next: () => {
          this.formProd.reset();
          this.onCatProdChange(cid);
          this.snack.open('Producto creado', 'Cerrar', { duration: 2000 });
        },
        error: () => this.snack.open('Error al crear', 'Cerrar'),
      });
  }

  startEditProd(p: ProductoCatalogo): void {
    this.editProdId.set(p.id);
    this.editProd = { nombre: p.nombre, orden: p.orden };
  }

  cancelEditProd(): void {
    this.editProdId.set(null);
  }

  guardarProd(id: number): void {
    const cid = this.catProdId();
    if (!cid) return;
    const orden = Number(this.editProd.orden);
    this.api
      .actualizarProductoCatalogo(id, {
        nombre: this.editProd.nombre.trim(),
        orden: Number.isFinite(orden) ? orden : 0,
      })
      .subscribe({
        next: () => {
          this.editProdId.set(null);
          this.onCatProdChange(cid);
          this.snack.open('Actualizado', 'Cerrar', { duration: 2000 });
        },
        error: () => this.snack.open('Error al guardar', 'Cerrar'),
      });
  }

  toggleActivoProd(p: ProductoCatalogo): void {
    this.api.actualizarProductoCatalogo(p.id, { activo: !p.activo }).subscribe({
      next: () => this.onCatProdChange(this.catProdId()),
      error: () => this.snack.open('Error', 'Cerrar'),
    });
  }

  borrarProd(p: ProductoCatalogo): void {
    if (!confirm(`¿Eliminar producto "${p.nombre}"?`)) return;
    const cid = this.catProdId();
    this.api.eliminarProductoCatalogo(p.id).subscribe({
      next: () => {
        if (cid) this.onCatProdChange(cid);
        this.snack.open('Eliminado', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('Error al eliminar', 'Cerrar'),
    });
  }
}
