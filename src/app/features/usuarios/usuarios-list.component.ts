import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ROL_LABELS, ROLES_CON_SEDE_OBLIGATORIA, Rol, Sede, Usuario } from '@app/core/models/api.models';
import { UsuarioService } from '@app/core/services/usuario.service';
import { SedeService } from '@app/core/services/sede.service';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatTooltipModule, DatePipe],
  template: `
    <div class="space-y-4">
      <div class="page-head">
        <h2>Usuarios</h2>
        <div class="actions">
          <button type="button" class="btn-primary" (click)="abrirNuevoUsuario()">
            <mat-icon>add</mat-icon>
            <span class="hidden sm:inline">Nuevo usuario</span>
            <span class="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      <div class="card">
        <!-- Tabla (sm+) -->
        <div class="em-scroll hidden sm:block">
          <table class="em-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Sede</th>
                <th>Estado</th>
                <th>Creado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of usuarios()">
                <td class="font-medium">{{ u.nombre }}</td>
                <td class="break-all">{{ u.email }}</td>
                <td class="text-brand-dark">{{ rolLabels[u.rol] }}</td>
                <td>{{ u.sede?.nombre ?? '—' }}</td>
                <td>
                  <span class="badge" [class.badge-closed]="u.activo" [class.badge-rejected]="!u.activo">
                    {{ u.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="text-gray-500 whitespace-nowrap">{{ u.fecha_creacion | date:'shortDate' }}</td>
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1 justify-end">
                    <button type="button"
                            class="icon-btn icon-edit"
                            (click)="abrirEditarUsuario(u)"
                            matTooltip="Editar usuario"
                            aria-label="Editar usuario">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button type="button"
                            class="icon-btn icon-view"
                            (click)="seleccionarCambioPassword(u)"
                            matTooltip="Cambiar contraseña"
                            aria-label="Cambiar contraseña">
                      <mat-icon>key</mat-icon>
                    </button>
                    <button *ngIf="u.activo"
                            type="button"
                            class="icon-btn icon-delete"
                            (click)="desactivar(u)"
                            matTooltip="Desactivar usuario"
                            aria-label="Desactivar usuario">
                      <mat-icon>person_off</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!usuarios().length">
                <td colspan="7" class="py-6 text-center text-gray-400">Sin resultados.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tarjetas (móvil) -->
        <div class="sm:hidden space-y-2">
          <div *ngFor="let u of usuarios()" class="p-3 rounded-lg border border-border hover:bg-gray-50">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-semibold text-sm truncate">{{ u.nombre }}</div>
                <div class="text-xs text-gray-500 break-all">{{ u.email }}</div>
              </div>
              <span class="badge"
                    [class.badge-closed]="u.activo"
                    [class.badge-rejected]="!u.activo">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <div class="mt-2 text-xs flex items-center justify-between">
              <span class="text-brand-dark font-medium">{{ rolLabels[u.rol] }}</span>
              <span class="text-gray-500">{{ u.fecha_creacion | date:'shortDate' }}</span>
            </div>
            <div class="mt-1 text-xs text-gray-500">{{ u.sede?.nombre ?? 'Sin sede' }}</div>
            <div class="mt-2 flex justify-end gap-1">
              <button type="button"
                      class="icon-btn icon-edit"
                      (click)="abrirEditarUsuario(u)"
                      matTooltip="Editar usuario"
                      aria-label="Editar usuario">
                <mat-icon>edit</mat-icon>
              </button>
              <button type="button"
                      class="icon-btn icon-view"
                      (click)="seleccionarCambioPassword(u)"
                      matTooltip="Cambiar contraseña"
                      aria-label="Cambiar contraseña">
                <mat-icon>key</mat-icon>
              </button>
              <button type="button"
                      *ngIf="u.activo"
                      class="icon-btn icon-delete"
                      (click)="desactivar(u)"
                      matTooltip="Desactivar usuario"
                      aria-label="Desactivar usuario">
                <mat-icon>person_off</mat-icon>
              </button>
            </div>
          </div>
          <div *ngIf="!usuarios().length" class="py-6 text-center text-gray-400 text-sm">
            Sin resultados.
          </div>
        </div>
      </div>

      <div *ngIf="mostrarModalNuevo()" class="modal-backdrop" role="presentation" (click)="cerrarNuevoUsuario()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="nuevo-usuario-title" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3 id="nuevo-usuario-title">Nuevo usuario</h3>
            <button type="button" class="icon-btn" (click)="cerrarNuevoUsuario()" aria-label="Cerrar modal">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="crear()" class="space-y-3">
            <div>
              <label class="label">Nombre</label>
              <input class="input" formControlName="nombre" />
            </div>
            <div>
              <label class="label">Email</label>
              <input type="email" class="input" formControlName="email" />
            </div>
            <div>
              <label class="label">Rol</label>
              <select class="input" formControlName="rol">
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="ADMINISTRADOR_SEDE">Administrador de sede</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="ADMINISTRATIVO_COMERCIAL">Administrativo comercial</option>
                <option value="CALIDAD">Calidad</option>
              </select>
            </div>
            <div *ngIf="sedeVisible(form.controls.rol.value)">
              <label class="label">Sede{{ sedeRequerida(form.controls.rol.value) ? '' : ' (opcional)' }}</label>
              <select class="input" formControlName="sede_id">
                <option [ngValue]="null" [disabled]="sedeRequerida(form.controls.rol.value)">
                  {{ sedeRequerida(form.controls.rol.value) ? 'Selecciona una sede' : 'Sin sede' }}
                </option>
                <option *ngFor="let s of sedes()" [ngValue]="s.id">{{ s.nombre }}</option>
              </select>
            </div>
            <div>
              <label class="label">Contraseña</label>
              <input type="password" class="input" formControlName="password" />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="cerrarNuevoUsuario()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid">Crear usuario</button>
            </div>
          </form>
        </div>
      </div>

      <div *ngIf="usuarioEditar() as usuario" class="modal-backdrop" role="presentation" (click)="cerrarEditarUsuario()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="editar-usuario-title" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3 id="editar-usuario-title">Editar usuario</h3>
            <button type="button" class="icon-btn" (click)="cerrarEditarUsuario()" aria-label="Cerrar modal">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="guardarEdicion(usuario.id)" class="space-y-3">
            <div>
              <label class="label">Nombre</label>
              <input class="input" formControlName="nombre" />
            </div>
            <div>
              <label class="label">Rol</label>
              <select class="input" formControlName="rol">
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="ADMINISTRADOR_SEDE">Administrador de sede</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="ADMINISTRATIVO_COMERCIAL">Administrativo comercial</option>
                <option value="CALIDAD">Calidad</option>
              </select>
            </div>
            <div *ngIf="sedeVisible(editForm.controls.rol.value)">
              <label class="label">Sede{{ sedeRequerida(editForm.controls.rol.value) ? '' : ' (opcional)' }}</label>
              <select class="input" formControlName="sede_id">
                <option [ngValue]="null" [disabled]="sedeRequerida(editForm.controls.rol.value)">
                  {{ sedeRequerida(editForm.controls.rol.value) ? 'Selecciona una sede' : 'Sin sede' }}
                </option>
                <option *ngFor="let s of sedes()" [ngValue]="s.id">{{ s.nombre }}</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="cerrarEditarUsuario()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="editForm.invalid">Guardar</button>
            </div>
          </form>
        </div>
      </div>

      <div *ngIf="usuarioPassword() as usuario" class="modal-backdrop" role="presentation" (click)="cancelarCambioPassword()">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="cambio-password-title" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3 id="cambio-password-title">Cambiar contraseña</h3>
            <button type="button" class="icon-btn" (click)="cancelarCambioPassword()" aria-label="Cerrar modal">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="mb-3 rounded-lg border border-border p-3">
            <div class="font-medium truncate">{{ usuario.nombre }}</div>
            <div class="text-xs text-muted break-all">{{ usuario.email }}</div>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="cambiarPassword()" class="space-y-3">
            <div>
              <label class="label">Nueva contraseña</label>
              <input type="password" class="input" formControlName="password" />
            </div>
            <div>
              <label class="label">Confirmar contraseña</label>
              <input type="password" class="input" formControlName="confirmacion" />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="cancelarCambioPassword()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="passwordForm.invalid">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
      width: min(100%, 30rem);
      max-height: calc(100vh - 2rem);
      overflow-y: auto;
      background: var(--em-surface);
      border: 1px solid var(--em-border);
      border-radius: var(--em-radius);
      box-shadow: var(--em-shadow-md);
      padding: 1.25rem;
    }

    .modal-head,
    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .modal-head {
      margin-bottom: 1rem;
    }

    .modal-head h3 {
      margin: 0;
      font-size: 1.125rem;
    }

    .modal-actions {
      justify-content: flex-end;
      margin-top: 1rem;
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
export class UsuariosListComponent implements OnInit {
  private svc = inject(UsuarioService);
  private sedeSvc = inject(SedeService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  protected rolLabels = ROL_LABELS;
  protected usuarios = signal<Usuario[]>([]);
  protected sedes = signal<Sede[]>([]);
  protected mostrarModalNuevo = signal(false);
  protected form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    rol: ['VENDEDOR', Validators.required],
    sede_id: this.fb.control<number | null>(null),
    password: ['', [Validators.required, Validators.minLength(6)]],
    activo: [true],
  });
  protected usuarioPassword = signal<Usuario | null>(null);
  protected passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmacion: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected usuarioEditar = signal<Usuario | null>(null);
  protected editForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    rol: ['VENDEDOR', Validators.required],
    sede_id: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    this.load();
    this.sedeSvc.list(true).subscribe((s) => this.sedes.set(s));
    this.form.controls.rol.valueChanges.subscribe((rol) => this.actualizarValidacionSede(this.form, rol as Rol));
    this.editForm.controls.rol.valueChanges.subscribe((rol) => this.actualizarValidacionSede(this.editForm, rol as Rol));
  }

  protected sedeRequerida(rol: string): boolean {
    return (ROLES_CON_SEDE_OBLIGATORIA as string[]).includes(rol);
  }

  /** El administrador global no tiene sede (el backend la ignora); el resto de roles
   *  admiten una sede, obligatoria solo para vendedor y administrador de sede. */
  protected sedeVisible(rol: string): boolean {
    return rol !== 'ADMINISTRADOR';
  }

  private actualizarValidacionSede(grupo: typeof this.form | typeof this.editForm, rol: Rol) {
    const control = grupo.controls.sede_id;
    if (this.sedeRequerida(rol)) {
      control.setValidators(Validators.required);
    } else {
      control.setValidators(null);
      if (!this.sedeVisible(rol)) control.setValue(null);
    }
    control.updateValueAndValidity();
  }

  load() { this.svc.list().subscribe((us) => this.usuarios.set(us)); }

  abrirNuevoUsuario() {
    this.form.reset({ rol: 'VENDEDOR', activo: true, nombre: '', email: '', password: '', sede_id: null });
    this.mostrarModalNuevo.set(true);
  }

  cerrarNuevoUsuario() {
    this.mostrarModalNuevo.set(false);
    this.form.reset({ rol: 'VENDEDOR', activo: true, nombre: '', email: '', password: '', sede_id: null });
  }

  crear() {
    if (this.form.invalid) return;
    this.svc.create(this.form.getRawValue() as any).subscribe({
      next: () => {
        this.snack.open('Usuario creado', 'Cerrar', { duration: 2000 });
        this.cerrarNuevoUsuario();
        this.load();
      },
      error: (err) => this.snack.open(err?.error?.detail ?? 'Error al crear el usuario', 'Cerrar'),
    });
  }

  abrirEditarUsuario(u: Usuario) {
    this.usuarioEditar.set(u);
    this.editForm.reset({ nombre: u.nombre, rol: u.rol, sede_id: u.sede_id ?? null });
  }

  cerrarEditarUsuario() {
    this.usuarioEditar.set(null);
  }

  guardarEdicion(id: number) {
    if (this.editForm.invalid) return;
    this.svc.update(id, this.editForm.getRawValue() as any).subscribe({
      next: () => {
        this.snack.open('Usuario actualizado', 'Cerrar', { duration: 2000 });
        this.cerrarEditarUsuario();
        this.load();
      },
      error: (err) => this.snack.open(err?.error?.detail ?? 'Error al guardar', 'Cerrar'),
    });
  }

  seleccionarCambioPassword(usuario: Usuario) {
    this.usuarioPassword.set(usuario);
    this.passwordForm.reset({ password: '', confirmacion: '' });
  }

  cancelarCambioPassword() {
    this.usuarioPassword.set(null);
    this.passwordForm.reset({ password: '', confirmacion: '' });
  }

  cambiarPassword() {
    const usuario = this.usuarioPassword();
    if (!usuario || this.passwordForm.invalid) return;

    const { password, confirmacion } = this.passwordForm.getRawValue();
    if (password !== confirmacion) {
      this.snack.open('Las contraseñas no coinciden', 'Cerrar', { duration: 2500 });
      return;
    }

    this.svc.cambiarPassword(usuario.id, password).subscribe({
      next: () => {
        this.snack.open('Contraseña actualizada', 'Cerrar', { duration: 2500 });
        this.cancelarCambioPassword();
      },
    });
  }

  desactivar(u: Usuario) {
    if (!confirm(`¿Desactivar a ${u.nombre}?`)) return;
    this.svc.desactivar(u.id).subscribe(() => {
      this.snack.open('Usuario desactivado', 'Cerrar', { duration: 2000 });
      this.load();
    });
  }
}
