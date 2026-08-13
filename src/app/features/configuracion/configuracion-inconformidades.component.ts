import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Area, Inconformidad } from '@app/core/models/api.models';
import { ConfiguracionService } from '@app/core/services/configuracion.service';

@Component({
  selector: 'app-configuracion-inconformidades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="card space-y-4">
      <h2 class="text-lg font-semibold">Motivos</h2>
      <form [formGroup]="formInc" (ngSubmit)="crearInc()" class="space-y-3">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
          <div>
            <label class="label">Área</label>
            <select class="input" formControlName="area_id">
              <option *ngFor="let a of areas()" [ngValue]="a.id">{{ a.nombre }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="label">Nombre</label>
            <input class="input" formControlName="nombre" />
          </div>
          <button class="btn-primary" type="submit" [disabled]="formInc.invalid">Agregar</button>
        </div>
        <div>
          <label class="label">Descripción (opcional)</label>
          <input class="input" formControlName="descripcion" />
        </div>
      </form>
      <div class="em-scroll max-h-32rem">
        <table class="em-table text-sm">
          <thead>
            <tr>
              <th>Área</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Activo</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let i of inconformidades()">
              <ng-container *ngIf="editIncId() !== i.id">
                <td>{{ i.area?.nombre }}</td>
                <td>{{ i.nombre }}</td>
                <td class="max-w-xs truncate" [title]="i.descripcion || ''">{{ i.descripcion || '—' }}</td>
                <td>{{ i.activo ? 'Sí' : 'No' }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      class="icon-btn icon-edit"
                      (click)="startEditInc(i)"
                      matTooltip="Editar"
                      aria-label="Editar motivo">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-toggle"
                      (click)="toggleActivoInc(i)"
                      matTooltip="Activar o desactivar"
                      aria-label="Activar o desactivar">
                      <mat-icon>toggle_on</mat-icon>
                    </button>
                    <button
                      type="button"
                      class="icon-btn icon-delete"
                      (click)="borrarInc(i)"
                      matTooltip="Eliminar"
                      aria-label="Eliminar motivo">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>
              <ng-container *ngIf="editIncId() === i.id">
                <td colspan="4" class="align-top">
                  <div class="grid sm:grid-cols-2 gap-2 py-1">
                    <div>
                      <label class="label text-xs">Área</label>
                      <select class="input text-sm" [(ngModel)]="editInc.area_id" [ngModelOptions]="{standalone: true}">
                        <option *ngFor="let a of areas()" [ngValue]="a.id">{{ a.nombre }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="label text-xs">Nombre</label>
                      <input class="input text-sm" [(ngModel)]="editInc.nombre" [ngModelOptions]="{standalone: true}" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="label text-xs">Descripción</label>
                      <input class="input text-sm" [(ngModel)]="editInc.descripcion" [ngModelOptions]="{standalone: true}" />
                    </div>
                  </div>
                </td>
                <td class="text-right align-top whitespace-nowrap">
                  <button type="button" class="btn-primary text-sm px-2 py-1" (click)="guardarInc(i.id)">Guardar</button>
                  <button type="button" class="btn-secondary text-sm px-2 py-1 ml-1" (click)="cancelEditInc()">Cancelar</button>
                </td>
              </ng-container>
            </tr>
            <tr *ngIf="!inconformidades().length">
              <td colspan="5" class="py-6 text-center text-gray-400">Sin resultados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ConfiguracionInconformidadesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ConfiguracionService);
  private snack = inject(MatSnackBar);

  areas = signal<Area[]>([]);
  inconformidades = signal<Inconformidad[]>([]);
  editIncId = signal<number | null>(null);
  editInc: { area_id: number; nombre: string; descripcion: string } = {
    area_id: 0,
    nombre: '',
    descripcion: '',
  };

  formInc = this.fb.nonNullable.group({
    area_id: [null as unknown as number, Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.reloadAreas();
    this.loadInc();
  }

  reloadAreas(): void {
    this.api.listarAreas().subscribe({
      next: (r) => {
        this.areas.set(r);
        const first = r[0]?.id;
        if (first != null && this.formInc.get('area_id')?.value == null) {
          this.formInc.patchValue({ area_id: first });
        }
      },
      error: () => this.snack.open('No se pudieron cargar áreas', 'Cerrar'),
    });
  }

  loadInc(): void {
    this.api.listarInconformidades().subscribe({
      next: (r) => this.inconformidades.set(r),
      error: () => this.snack.open('No se pudieron cargar motivos', 'Cerrar'),
    });
  }

  crearInc(): void {
    const v = this.formInc.getRawValue();
    this.api
      .crearInconformidad({
        area_id: v.area_id,
        nombre: v.nombre,
        descripcion: v.descripcion?.trim() || null,
      })
      .subscribe({
        next: () => {
          this.formInc.patchValue({ nombre: '', descripcion: '' });
          this.loadInc();
          this.snack.open('Motivo creado', 'Cerrar', { duration: 2000 });
        },
        error: () => this.snack.open('Error al crear', 'Cerrar'),
      });
  }

  startEditInc(i: Inconformidad): void {
    this.editIncId.set(i.id);
    this.editInc = {
      area_id: i.area_id,
      nombre: i.nombre,
      descripcion: i.descripcion ?? '',
    };
  }

  cancelEditInc(): void {
    this.editIncId.set(null);
  }

  guardarInc(id: number): void {
    this.api
      .actualizarInconformidad(id, {
        area_id: this.editInc.area_id,
        nombre: this.editInc.nombre.trim(),
        descripcion: this.editInc.descripcion.trim() || null,
      })
      .subscribe({
        next: () => {
          this.editIncId.set(null);
          this.loadInc();
          this.snack.open('Actualizada', 'Cerrar', { duration: 2000 });
        },
        error: () => this.snack.open('Error al guardar', 'Cerrar'),
      });
  }

  toggleActivoInc(i: Inconformidad): void {
    this.api.actualizarInconformidad(i.id, { activo: !i.activo }).subscribe({
      next: () => this.loadInc(),
      error: () => this.snack.open('Error', 'Cerrar'),
    });
  }

  borrarInc(i: Inconformidad): void {
    if (!confirm(`¿Eliminar motivo "${i.nombre}"?`)) return;
    this.api.eliminarInconformidad(i.id).subscribe({
      next: () => {
        this.loadInc();
        this.snack.open('Motivo eliminado', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snack.open('Error al eliminar', 'Cerrar'),
    });
  }
}
