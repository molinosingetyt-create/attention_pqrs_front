import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PermisoCatalogo, Rol } from '@app/core/models/api.models';
import { PermisoService } from '@app/core/services/permiso.service';
import { P } from '@app/core/permissions';

const ROLES: Rol[] = [
  'ADMINISTRADOR',
  'VENDEDOR',
  'ADMINISTRATIVO_COMERCIAL',
  'CALIDAD',
];

@Component({
  selector: 'app-configuracion-permisos',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="card space-y-4">
      <div>
        <h2 class="text-lg font-semibold">Permisos por perfil</h2>
        <p class="text-sm text-gray-500 mt-1">
          Solo el administrador puede ver y modificar esta matriz. Los demás usuarios
          reciben sus permisos según el perfil asignado.
        </p>
      </div>

      <div *ngIf="loading()" class="flex justify-center py-8">
        <mat-progress-spinner diameter="36" mode="indeterminate"></mat-progress-spinner>
      </div>

      <ng-container *ngIf="!loading()">
        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div class="flex-1 min-w-[200px]">
            <label class="label">Perfil (rol)</label>
            <select class="input" [value]="rolSeleccionado()" (change)="onRolChange($event)">
              <option *ngFor="let r of roles" [value]="r">{{ etiquetaRol(r) }}</option>
            </select>
          </div>
          <button type="button" class="btn-primary" (click)="guardar()" [disabled]="saving()">
            <mat-icon>save</mat-icon>
            Guardar permisos
          </button>
        </div>

        <p *ngIf="rolSeleccionado() === 'ADMINISTRADOR'" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          El perfil Administrador conserva siempre el permiso de gestión de permisos.
        </p>

        <div class="space-y-4">
          <div *ngFor="let grupo of permisosPorModulo()" class="border border-border rounded-lg p-3">
            <h3 class="font-medium text-gray-800 mb-2 capitalize">{{ grupo.modulo }}</h3>
            <div class="grid sm:grid-cols-2 gap-2">
              <label
                *ngFor="let p of grupo.items"
                class="flex items-start gap-2 text-sm cursor-pointer"
                [class.opacity-50]="esSoloAdmin(p.codigo)">
                <input
                  type="checkbox"
                  class="mt-0.5"
                  [checked]="seleccionados().has(p.codigo)"
                  [disabled]="esSoloAdmin(p.codigo)"
                  (change)="toggle(p.codigo, $event)" />
                <span>
                  <span class="font-mono text-xs text-gray-500 block">{{ p.codigo }}</span>
                  {{ p.descripcion }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class ConfiguracionPermisosComponent implements OnInit {
  private api = inject(PermisoService);
  private snack = inject(MatSnackBar);

  protected roles = ROLES;
  protected loading = signal(true);
  protected saving = signal(false);
  protected catalogo = signal<PermisoCatalogo[]>([]);
  protected matriz = signal<Record<string, string[]>>({});
  protected rolSeleccionado = signal<Rol>('VENDEDOR');
  protected seleccionados = signal<Set<string>>(new Set());

  protected permisosPorModulo = computed(() => {
    const map = new Map<string, PermisoCatalogo[]>();
    for (const p of this.catalogo()) {
      if (!map.has(p.modulo)) map.set(p.modulo, []);
      map.get(p.modulo)!.push(p);
    }
    return Array.from(map.entries()).map(([modulo, items]) => ({ modulo, items }));
  });

  ngOnInit(): void {
    this.api.catalogo().subscribe({
      next: (cat) => {
        this.catalogo.set(cat);
        this.api.matriz().subscribe({
          next: (m) => {
            const map: Record<string, string[]> = {};
            for (const r of m.roles) map[r.rol] = r.permisos;
            this.matriz.set(map);
            this.cargarSeleccion(this.rolSeleccionado());
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  protected etiquetaRol(rol: Rol): string {
    const labels: Record<Rol, string> = {
      ADMINISTRADOR: 'Administrador',
      VENDEDOR: 'Vendedor',
      ADMINISTRATIVO_COMERCIAL: 'Administrativo comercial',
      CALIDAD: 'Calidad',
    };
    return labels[rol] ?? rol;
  }

  protected esSoloAdmin(codigo: string): boolean {
    return (
      this.rolSeleccionado() !== 'ADMINISTRADOR' &&
      codigo === P.PERMISOS_GESTIONAR
    );
  }

  onRolChange(ev: Event): void {
    const rol = (ev.target as HTMLSelectElement).value as Rol;
    this.rolSeleccionado.set(rol);
    this.cargarSeleccion(rol);
  }

  toggle(codigo: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const next = new Set(this.seleccionados());
    if (checked) next.add(codigo);
    else next.delete(codigo);
    this.seleccionados.set(next);
  }

  guardar(): void {
    const rol = this.rolSeleccionado();
    let permisos = Array.from(this.seleccionados());
    if (rol !== 'ADMINISTRADOR') {
      permisos = permisos.filter((c) => c !== P.PERMISOS_GESTIONAR);
    }
    this.saving.set(true);
    this.api.actualizarRol(rol, permisos).subscribe({
      next: (res) => {
        this.matriz.update((m) => ({ ...m, [rol]: res.permisos }));
        this.cargarSeleccion(rol);
        this.saving.set(false);
        this.snack.open(`Permisos actualizados para ${this.etiquetaRol(rol)}`, 'Cerrar', {
          duration: 3000,
        });
      },
      error: () => this.saving.set(false),
    });
  }

  private cargarSeleccion(rol: Rol): void {
    const perms = this.matriz()[rol] ?? [];
    this.seleccionados.set(new Set(perms));
  }
}
