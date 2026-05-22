import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Area } from '@app/core/models/api.models';
import { ConfiguracionService } from '@app/core/services/configuracion.service';

@Component({
  selector: 'app-configuracion-areas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="card space-y-4">
      <h2 class="text-lg font-semibold">Áreas</h2>
      <form [formGroup]="formArea" (ngSubmit)="crearArea()" class="grid sm:grid-cols-3 gap-2 items-end">
        <div><label class="label">Código</label><input class="input" formControlName="codigo" /></div>
        <div><label class="label">Nombre</label><input class="input" formControlName="nombre" /></div>
        <button class="btn-primary" type="submit" [disabled]="formArea.invalid">Agregar</button>
      </form>
      <div class="em-scroll">
        <table class="em-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of areas()">
              <ng-container *ngIf="editAreaId() !== a.id">
                <td>{{ a.codigo }}</td>
                <td>{{ a.nombre }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      class="icon-btn icon-edit"
                      (click)="startEditArea(a)"
                      matTooltip="Editar área"
                      aria-label="Editar área">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-delete"
                      (click)="borrarArea(a)"
                      matTooltip="Eliminar área"
                      aria-label="Eliminar área">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>
              <ng-container *ngIf="editAreaId() === a.id">
                <td colspan="2">
                  <div class="flex flex-wrap gap-2 py-1">
                    <input class="input w-32" [value]="editArea.codigo" (input)="editArea.codigo = $any($event.target).value" />
                    <input class="input flex-1 min-w-8rem" [value]="editArea.nombre" (input)="editArea.nombre = $any($event.target).value" />
                  </div>
                </td>
                <td class="text-right whitespace-nowrap">
                  <button type="button" class="btn-primary text-sm px-2 py-1" (click)="guardarArea(a.id)">Guardar</button>
                  <button type="button" class="btn-secondary text-sm px-2 py-1 ml-1" (click)="cancelEditArea()">Cancelar</button>
                </td>
              </ng-container>
            </tr>
            <tr *ngIf="!areas().length">
              <td colspan="3" class="py-6 text-center text-gray-400">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ConfiguracionAreasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ConfiguracionService);
  private snack = inject(MatSnackBar);

  areas = signal<Area[]>([]);
  editAreaId = signal<number | null>(null);
  editArea: { codigo: string; nombre: string } = { codigo: '', nombre: '' };

  formArea = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(2)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.listarAreas().subscribe({
      next: (r) => this.areas.set(r),
      error: () => this.snack.open('No se pudieron cargar áreas', 'Cerrar'),
    });
  }

  crearArea(): void {
    const v = this.formArea.getRawValue();
    this.api.crearArea(v).subscribe({
      next: () => {
        this.formArea.reset();
        this.reload();
        this.snack.open('Área creada', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('Error al crear área', 'Cerrar'),
    });
  }

  startEditArea(a: Area): void {
    this.editAreaId.set(a.id);
    this.editArea = { codigo: a.codigo, nombre: a.nombre };
  }

  cancelEditArea(): void {
    this.editAreaId.set(null);
  }

  guardarArea(id: number): void {
    this.api.actualizarArea(id, this.editArea).subscribe({
      next: () => {
        this.editAreaId.set(null);
        this.reload();
        this.snack.open('Área actualizada', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('Error al guardar', 'Cerrar'),
    });
  }

  borrarArea(a: Area): void {
    if (!confirm(`¿Eliminar área ${a.codigo}?`)) return;
    this.api.eliminarArea(a.id).subscribe({
      next: () => {
        this.reload();
        this.snack.open('Eliminada', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('No se puede eliminar (¿tiene inconformidades?)', 'Cerrar'),
    });
  }
}
