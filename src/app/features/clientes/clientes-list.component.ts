import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Cliente } from '@app/core/models/api.models';
import { ClienteService } from '@app/core/services/cliente.service';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatTooltipModule],
  template: `
    <div class="space-y-4">
      <div class="page-head">
        <h2>Clientes</h2>
        <div class="actions">
          <a *ngIf="auth.hasRole('ADMINISTRADOR','ADMINISTRATIVO_COMERCIAL','VENDEDOR')"
             routerLink="/clientes/nuevo" class="btn-primary">
            <mat-icon>add</mat-icon>
            <span class="hidden sm:inline">Nuevo cliente</span>
            <span class="sm:hidden">Nuevo</span>
          </a>
        </div>
      </div>

      <div class="card">
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            [(ngModel)]="q"
            (ngModelChange)="onSearch()"
            placeholder="Buscar por nombre, NIT o correo..."
            class="input flex-1" />
        </div>

        <!-- Tabla (sm+) -->
        <div class="em-scroll hidden sm:block">
          <table class="em-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Ciudad</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of items()">
                <td class="font-medium">{{ c.nombre }} {{ c.apellidos }}</td>
                <td>{{ c.nit }}</td>
                <td>{{ c.ciudad || '—' }}</td>
                <td>{{ c.telefono || '—' }}</td>
                <td>{{ c.correo || '—' }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5">
                    <span *ngIf="c.activo === false"
                          class="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 mr-1">Inactivo</span>
                    <a *ngIf="auth.hasRole('ADMINISTRADOR','ADMINISTRATIVO_COMERCIAL','VENDEDOR')"
                       [routerLink]="['/clientes', c.id, 'editar']"
                       class="icon-btn icon-edit"
                       matTooltip="Editar cliente"
                       aria-label="Editar cliente">
                      <mat-icon>edit</mat-icon>
                    </a>
                    <button *ngIf="auth.hasRole('ADMINISTRADOR')"
                            (click)="remove(c)"
                            class="icon-btn icon-delete"
                            matTooltip="Eliminar cliente"
                            aria-label="Eliminar cliente">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!items().length">
                <td colspan="6" class="py-6 text-center text-gray-400">Sin resultados.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tarjetas (móvil) -->
        <div class="sm:hidden space-y-2">
          <div *ngFor="let c of items()" class="p-3 rounded-lg border border-border hover:bg-gray-50">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-semibold text-sm truncate">
                  {{ c.nombre }} {{ c.apellidos }}
                </div>
                <div class="text-xs text-gray-500">NIT {{ c.nit }}</div>
              </div>
            </div>
            <div class="text-xs text-gray-600 mt-1 space-y-0.5">
              <div *ngIf="c.telefono"><mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">phone</mat-icon> {{ c.telefono }}</div>
              <div *ngIf="c.correo" class="truncate"><mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">mail</mat-icon> {{ c.correo }}</div>
              <div *ngIf="c.ciudad"><mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle">place</mat-icon> {{ c.ciudad }}</div>
            </div>
            <div class="flex gap-2 mt-2 justify-end items-center flex-wrap">
              <span *ngIf="c.activo === false" class="text-xs text-gray-600">Inactivo</span>
              <a *ngIf="auth.hasRole('ADMINISTRADOR','ADMINISTRATIVO_COMERCIAL','VENDEDOR')"
                 [routerLink]="['/clientes', c.id, 'editar']"
                 class="icon-btn icon-edit"
                 matTooltip="Editar cliente"
                 aria-label="Editar cliente">
                <mat-icon>edit</mat-icon>
              </a>
              <button *ngIf="auth.hasRole('ADMINISTRADOR')"
                      (click)="remove(c)"
                      class="icon-btn icon-delete"
                      matTooltip="Eliminar cliente"
                      aria-label="Eliminar cliente">
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
export class ClientesListComponent implements OnInit {
  protected auth = inject(AuthService);
  private svc = inject(ClienteService);
  private snack = inject(MatSnackBar);

  protected items = signal<Cliente[]>([]);
  protected total = signal(0);
  protected page = signal(1);
  protected pages = signal(0);
  protected q = '';

  private debounce: any;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.list({ q: this.q, page: this.page(), size: 20 }).subscribe((res) => {
      this.items.set(res.items);
      this.total.set(res.total);
      this.pages.set(res.pages);
    });
  }

  onSearch(): void {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 300);
  }

  prev() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  next() { if (this.page() < this.pages()) { this.page.update(p => p + 1); this.load(); } }

  remove(c: Cliente) {
    if (!confirm(`¿Eliminar cliente ${c.nombre}?`)) return;
    this.svc.remove(c.id).subscribe(() => {
      this.snack.open('Cliente eliminado', 'Cerrar', { duration: 2000 });
      this.load();
    });
  }
}
