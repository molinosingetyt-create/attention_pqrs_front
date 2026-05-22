import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CategoriaProducto } from '@app/core/models/api.models';
import { ConfiguracionService } from '@app/core/services/configuracion.service';

@Component({
  selector: 'app-configuracion-categorias-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="card space-y-4">
      <h2 class="text-lg font-semibold">Categorías de producto</h2>
      <form [formGroup]="formCat" (ngSubmit)="crearCat()" class="flex flex-wrap gap-2 items-end">
        <div class="flex-1 min-w-12rem">
          <label class="label">Nombre</label>
          <input class="input" formControlName="nombre" />
        </div>
        <button class="btn-primary" type="submit" [disabled]="formCat.invalid">Agregar</button>
      </form>
      <div class="em-scroll">
        <table class="em-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Orden</th>
              <th>Activo</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of categorias()">
              <ng-container *ngIf="editCatId() !== c.id">
                <td>{{ c.nombre }}</td>
                <td>{{ c.orden }}</td>
                <td>{{ c.activo ? 'Sí' : 'No' }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      class="icon-btn icon-edit"
                      (click)="startEditCat(c)"
                      matTooltip="Editar"
                      aria-label="Editar categoría">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-toggle"
                      (click)="toggleActivoCat(c)"
                      matTooltip="Activar o desactivar"
                      aria-label="Activar o desactivar categoría">
                      <mat-icon>toggle_on</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-delete"
                      (click)="borrarCat(c)"
                      matTooltip="Eliminar"
                      aria-label="Eliminar categoría">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>
              <ng-container *ngIf="editCatId() === c.id">
                <td colspan="3" class="align-top">
                  <div class="flex flex-wrap gap-2 py-1">
                    <div class="flex-1 min-w-10rem">
                      <label class="label text-xs">Nombre</label>
                      <input class="input text-sm" [(ngModel)]="editCat.nombre" [ngModelOptions]="{standalone: true}" />
                    </div>
                    <div class="w-24">
                      <label class="label text-xs">Orden</label>
                      <input class="input text-sm" type="number" [(ngModel)]="editCat.orden" [ngModelOptions]="{standalone: true}" />
                    </div>
                  </div>
                </td>
                <td class="text-right align-top whitespace-nowrap">
                  <button type="button" class="btn-primary text-sm px-2 py-1" (click)="guardarCat(c.id)">Guardar</button>
                  <button type="button" class="btn-secondary text-sm px-2 py-1 ml-1" (click)="cancelEditCat()">Cancelar</button>
                </td>
              </ng-container>
            </tr>
            <tr *ngIf="!categorias().length">
              <td colspan="4" class="py-6 text-center text-gray-400">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ConfiguracionCategoriasProductoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ConfiguracionService);
  private snack = inject(MatSnackBar);

  categorias = signal<CategoriaProducto[]>([]);
  editCatId = signal<number | null>(null);
  editCat: { nombre: string; orden: number } = { nombre: '', orden: 0 };

  formCat = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
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

  crearCat(): void {
    this.api.crearCategoriaProducto({ nombre: this.formCat.get('nombre')!.value.trim() }).subscribe({
      next: () => {
        this.formCat.reset();
        this.reloadCategorias();
        this.snack.open('Categoría creada', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('Error al crear', 'Cerrar'),
    });
  }

  startEditCat(c: CategoriaProducto): void {
    this.editCatId.set(c.id);
    this.editCat = { nombre: c.nombre, orden: c.orden };
  }

  cancelEditCat(): void {
    this.editCatId.set(null);
  }

  guardarCat(id: number): void {
    const orden = Number(this.editCat.orden);
    this.api
      .actualizarCategoriaProducto(id, {
        nombre: this.editCat.nombre.trim(),
        orden: Number.isFinite(orden) ? orden : 0,
      })
      .subscribe({
        next: () => {
          this.editCatId.set(null);
          this.reloadCategorias();
          this.snack.open('Actualizada', 'Cerrar', { duration: 2000 });
        },
        error: () => this.snack.open('Error al guardar', 'Cerrar'),
      });
  }

  toggleActivoCat(c: CategoriaProducto): void {
    this.api.actualizarCategoriaProducto(c.id, { activo: !c.activo }).subscribe({
      next: () => this.reloadCategorias(),
      error: () => this.snack.open('Error', 'Cerrar'),
    });
  }

  borrarCat(c: CategoriaProducto): void {
    if (!confirm(`¿Eliminar categoría "${c.nombre}" y todos sus productos?`)) return;
    this.api.eliminarCategoriaProducto(c.id).subscribe({
      next: () => {
        this.reloadCategorias();
        this.snack.open('Eliminada', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('Error al eliminar', 'Cerrar'),
    });
  }
}
