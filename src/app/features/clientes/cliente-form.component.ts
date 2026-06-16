import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ClienteService } from '@app/core/services/cliente.service';
import { AuthService } from '@app/core/services/auth.service';
import { UsuarioService } from '@app/core/services/usuario.service';
import { Usuario } from '@app/core/models/api.models';
import { P } from '@app/core/permissions';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-4">
      <div class="flex items-center gap-3">
        <a routerLink="/clientes" class="text-brand hover:underline flex items-center">
          <mat-icon>arrow_back</mat-icon> Volver
        </a>
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-gray-800">
        {{ id() ? 'Editar' : 'Nuevo' }} cliente
      </h2>

      <form [formGroup]="form" (ngSubmit)="save()" class="card grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="label">Nombre *</label>
          <input class="input" formControlName="nombre" />
        </div>
        <div>
          <label class="label">Apellidos</label>
          <input class="input" formControlName="apellidos" />
        </div>
        <div>
          <label class="label">NIT *</label>
          <input class="input" formControlName="nit" [attr.disabled]="id() ? true : null" />
        </div>
        <div>
          <label class="label">Ciudad</label>
          <input class="input" formControlName="ciudad" />
        </div>
        <div>
          <label class="label">Teléfono</label>
          <input class="input" formControlName="telefono" />
        </div>
        <div>
          <label class="label">Correo</label>
          <input type="email" class="input" formControlName="correo" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Dirección</label>
          <input class="input" formControlName="direccion" />
        </div>

        <div *ngIf="puedeAsignarVendedor()" class="sm:col-span-2">
          <label class="label">Vendedor asignado</label>
          <select class="input" formControlName="vendedor_asignado_id">
            <option [ngValue]="null">(Sin asignar)</option>
            <option *ngFor="let v of vendedores()" [ngValue]="v.id">{{ v.nombre }} · {{ v.email }}</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Requiere permiso de asignación de vendedor.</p>
        </div>

        <div *ngIf="puedeActivarCliente() && id()" class="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="activo" formControlName="activo" class="input-checkbox-rounded" />
          <label for="activo" class="text-sm text-gray-700">Cliente activo (desmarcar para deshabilitar)</label>
        </div>

        <div class="sm:col-span-2 flex flex-wrap gap-2 justify-end mt-4">
          <a routerLink="/clientes" class="btn-secondary">Cancelar</a>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
            {{ id() ? 'Actualizar' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ClienteService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  protected auth = inject(AuthService);
  private usuarios = inject(UsuarioService);

  protected id = signal<number | null>(null);
  protected saving = signal(false);
  protected vendedores = signal<Usuario[]>([]);

  protected puedeAsignarVendedor = (): boolean =>
    this.auth.can(P.CLIENTES_ASIGNAR_VENDEDOR);
  protected puedeActivarCliente = (): boolean => this.auth.can(P.CLIENTES_ACTIVAR);

  protected form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    apellidos: [''],
    nit: ['', [Validators.required, Validators.maxLength(40)]],
    direccion: [''],
    telefono: [''],
    correo: [''],
    ciudad: [''],
    vendedor_asignado_id: [null as number | null],
    activo: [true],
  });

  ngOnInit(): void {
    if (this.puedeAsignarVendedor()) {
      this.usuarios.vendedores().subscribe({
        next: (list) => this.vendedores.set(list),
        error: () => this.vendedores.set([]),
      });
    } else {
      this.form.get('vendedor_asignado_id')?.disable();
      this.form.get('activo')?.disable();
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.id.set(Number(id));
      this.svc.get(Number(id)).subscribe((c) => {
        this.form.patchValue({
          nombre: c.nombre,
          apellidos: c.apellidos || '',
          nit: c.nit,
          direccion: c.direccion || '',
          telefono: c.telefono || '',
          correo: c.correo || '',
          ciudad: c.ciudad || '',
          vendedor_asignado_id: c.vendedor_asignado_id ?? null,
          activo: c.activo !== false,
        });
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const raw: Record<string, unknown> = { ...this.form.getRawValue() };
    Object.keys(raw).forEach((k) => {
      if (raw[k] === '') raw[k] = null;
    });

    if (!this.puedeAsignarVendedor()) {
      delete raw['vendedor_asignado_id'];
    } else if (raw['vendedor_asignado_id'] == null) {
      delete raw['vendedor_asignado_id'];
    }
    if (!this.puedeActivarCliente() || !this.id()) {
      delete raw['activo'];
    }

    const req = this.id()
      ? this.svc.update(this.id()!, raw)
      : this.svc.create(raw);

    req.subscribe({
      next: () => {
        this.snack.open('Cliente guardado', 'Cerrar', { duration: 2000 });
        this.router.navigate(['/clientes']);
      },
      error: () => this.saving.set(false),
    });
  }
}
