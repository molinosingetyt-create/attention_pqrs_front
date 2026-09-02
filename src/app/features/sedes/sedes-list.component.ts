import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Sede } from '@app/core/models/api.models';
import { SedeService } from '@app/core/services/sede.service';

@Component({
  selector: 'app-sedes-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="space-y-4">
      <div class="page-head">
        <h2>Sedes</h2>
      </div>

      <div class="card space-y-4">
        <form [formGroup]="form" (ngSubmit)="crear()" class="grid sm:grid-cols-3 gap-2 items-end">
          <div><label class="label">Código</label><input class="input" formControlName="codigo" /></div>
          <div><label class="label">Nombre</label><input class="input" formControlName="nombre" /></div>
          <button class="btn-primary" type="submit" [disabled]="form.invalid">Agregar sede</button>
        </form>

        <div class="em-scroll">
          <table class="em-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of sedes()">
                <ng-container *ngIf="editId() !== s.id">
                  <td>{{ s.codigo }}</td>
                  <td>{{ s.nombre }}</td>
                  <td>
                    <span class="badge" [class.badge-closed]="s.activa" [class.badge-rejected]="!s.activa">
                      {{ s.activa ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        class="icon-btn icon-edit"
                        (click)="startEdit(s)"
                        matTooltip="Editar sede"
                        aria-label="Editar sede">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        (click)="toggleActiva(s)"
                        [matTooltip]="s.activa ? 'Desactivar sede' : 'Activar sede'"
                        [attr.aria-label]="s.activa ? 'Desactivar sede' : 'Activar sede'">
                        <mat-icon>{{ s.activa ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                      </button>
                      <button
                        type="button"
                        class="icon-btn icon-delete"
                        (click)="borrar(s)"
                        matTooltip="Eliminar sede"
                        aria-label="Eliminar sede">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>
                <ng-container *ngIf="editId() === s.id">
                  <td colspan="2">
                    <div class="flex flex-wrap gap-2 py-1">
                      <input class="input w-32" [value]="editValue.codigo" (input)="editValue.codigo = $any($event.target).value" />
                      <input class="input flex-1 min-w-8rem" [value]="editValue.nombre" (input)="editValue.nombre = $any($event.target).value" />
                    </div>
                  </td>
                  <td></td>
                  <td class="text-right whitespace-nowrap">
                    <button type="button" class="btn-primary text-sm px-2 py-1" (click)="guardar(s.id)">Guardar</button>
                    <button type="button" class="btn-secondary text-sm px-2 py-1 ml-1" (click)="cancelEdit()">Cancelar</button>
                  </td>
                </ng-container>
              </tr>
              <tr *ngIf="!sedes().length">
                <td colspan="4" class="py-6 text-center text-gray-400">Sin resultados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class SedesListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(SedeService);
  private snack = inject(MatSnackBar);

  sedes = signal<Sede[]>([]);
  editId = signal<number | null>(null);
  editValue: { codigo: string; nombre: string } = { codigo: '', nombre: '' };

  form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(2)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.svc.list(false).subscribe({
      next: (r) => this.sedes.set(r),
      error: () => this.snack.open('No se pudieron cargar las sedes', 'Cerrar'),
    });
  }

  crear(): void {
    const v = this.form.getRawValue();
    this.svc.create(v).subscribe({
      next: () => {
        this.form.reset();
        this.reload();
        this.snack.open('Sede creada', 'Cerrar', { duration: 2000 });
      },
      error: (err) => this.snack.open(err?.error?.detail ?? 'Error al crear la sede', 'Cerrar'),
    });
  }

  startEdit(s: Sede): void {
    this.editId.set(s.id);
    this.editValue = { codigo: s.codigo, nombre: s.nombre };
  }

  cancelEdit(): void {
    this.editId.set(null);
  }

  guardar(id: number): void {
    this.svc.update(id, this.editValue).subscribe({
      next: () => {
        this.editId.set(null);
        this.reload();
        this.snack.open('Sede actualizada', 'Cerrar', { duration: 2000 });
      },
      error: (err) => this.snack.open(err?.error?.detail ?? 'Error al guardar', 'Cerrar'),
    });
  }

  toggleActiva(s: Sede): void {
    this.svc.update(s.id, { activa: !s.activa }).subscribe({
      next: () => this.reload(),
      error: (err) => this.snack.open(err?.error?.detail ?? 'Error al actualizar', 'Cerrar'),
    });
  }

  borrar(s: Sede): void {
    if (!confirm(`¿Eliminar la sede ${s.nombre}?`)) return;
    this.svc.delete(s.id).subscribe({
      next: () => {
        this.reload();
        this.snack.open('Sede eliminada', 'Cerrar', { duration: 2000 });
      },
      error: () =>
        this.snack.open('No se puede eliminar (tiene usuarios o clientes asociados)', 'Cerrar'),
    });
  }
}
