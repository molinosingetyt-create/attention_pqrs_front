import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { RadioButtonModule } from 'primeng/radiobutton';

import { PqrsService } from '@app/core/services/pqrs.service';
import {
  DevolucionDetalle,
  DevolucionDestino,
  DevolucionRegistroPayload,
  DevolucionResponsable,
  ProductoPQRS,
} from '@app/core/models/api.models';

function productoDesdePqrs(d: DevolucionDetalle): string {
  return d.pqrs.productos
    .map((p) => {
      const categoria = p.categoria_nombre ? ` (${p.categoria_nombre})` : '';
      const detalles = [
        p.numero_factura ? `Factura ${p.numero_factura}` : null,
        p.lote ? `Lote ${p.lote}` : null,
      ].filter(Boolean);
      const detalle = detalles.length ? ` · ${detalles.join(' · ')}` : '';
      return `${p.nombre_producto}${categoria} x ${p.cantidad}${detalle}`;
    })
    .join(' · ');
}

function causaDesdeInconformidad(d: DevolucionDetalle): string {
  const descripcion = d.inconformidad_descripcion?.trim();
  return descripcion
    ? `${d.inconformidad_nombre} - ${descripcion}`
    : d.inconformidad_nombre;
}

@Component({
  selector: 'app-devolucion-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    DatePipe,
    RadioButtonModule,
    InputTextModule,
    InputTextareaModule,
    ButtonModule,
  ],
  template: `
    <a routerLink="/devoluciones" class="text-brand hover:underline inline-flex items-center gap-1 mb-4">
      <mat-icon>arrow_back</mat-icon> Volver a devoluciones
    </a>

    <div *ngIf="loading()" class="flex justify-center py-16">
      <span class="text-gray-500">Cargando…</span>
    </div>

    <div *ngIf="detalle() as d" class="space-y-4">
      <div class="card">
        <h2 class="text-xl font-bold text-[var(--em-brand-navy)]">Registro de devoluciones</h2>
        <p class="text-sm text-gray-600 mt-1">
          PQRS {{ d.pqrs.radicado }} · {{ d.pqrs.tipo }} · Nombre y apellido:
          <strong>{{ d.cliente_nombre }} {{ d.cliente_apellidos }}</strong>
        </p>
        <p class="text-sm text-gray-600">
          Motivo: {{ d.inconformidad_nombre }}
          <span *ngIf="d.inconformidad_descripcion" class="text-gray-500">
            ({{ d.inconformidad_descripcion }})
          </span>
        </p>
        <p class="text-sm text-gray-600">
          Área: {{ d.area_nombre }} · <strong>Fecha de registro (al cierre de PQRS):</strong>
          {{ d.fecha_registro | date: 'medium' }}
        </p>
        <p *ngIf="d.codigo_devolucion" class="text-sm text-[var(--em-brand-navy)] font-semibold mt-1">
          Código devolución: {{ d.codigo_devolucion }}
        </p>
        <div *ngIf="d.pqrs.descripcion || d.observaciones" class="mt-3 rounded-lg border border-border bg-gray-50 p-3">
          <div class="text-xs text-gray-500 mb-1">Comentario / descripción tomada de la PQRS cerrada</div>
          <p class="text-sm text-gray-700 whitespace-pre-line m-0">
            {{ d.observaciones || d.pqrs.descripcion }}
          </p>
        </div>
        <p *ngIf="!d.pendiente" class="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 mt-2">
          Esta devolución ya fue radicada. Los datos se muestran en solo lectura.
        </p>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="card space-y-5">
        <div class="field">
          <label class="block text-sm font-medium mb-1">Nombre y apellido</label>
          <input
            pInputText
            class="w-full"
            [value]="(d.cliente_nombre + (d.cliente_apellidos ? ' ' + d.cliente_apellidos : '')).trim()"
            readonly
          />
        </div>

        <div class="field" *ngIf="d.pqrs.productos?.length">
          <label class="block text-sm font-medium mb-1">Productos de la queja</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div *ngFor="let p of d.pqrs.productos" class="border border-border rounded-lg p-3 bg-gray-50">
              <div class="font-medium">{{ p.nombre_producto }}</div>
              <div class="text-gray-600" *ngIf="p.categoria_nombre">{{ p.categoria_nombre }}</div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <span class="text-gray-500 block">Cantidad</span>
                  <span class="font-medium">{{ p.cantidad }}</span>
                </div>
                <div>
                  <span class="text-gray-500 block">Factura</span>
                  <span class="font-medium">{{ p.numero_factura || '—' }}</span>
                </div>
                <div>
                  <span class="text-gray-500 block">Lote</span>
                  <span class="font-medium">{{ p.lote || '—' }}</span>
                </div>
              </div>
              <div *ngIf="p.comentario" class="text-xs text-gray-500 mt-2">
                Comentario: {{ p.comentario }}
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Responsable *</label>
          <div class="flex flex-wrap gap-4">
            <div *ngFor="let opt of responsables" class="flex items-center gap-2">
              <p-radioButton
                formControlName="responsable"
                name="responsable"
                [inputId]="'resp-' + opt.v"
                [value]="opt.v"
              ></p-radioButton>
              <label [for]="'resp-' + opt.v" class="cursor-pointer">{{ opt.l }}</label>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="field">
            <label class="block text-sm font-medium mb-1">Costo</label>
            <input pInputText formControlName="costo" class="w-full" />
          </div>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-2">Destino de la devolución por producto</label>
          <div formArrayName="productos_devolucion" class="space-y-3">
            <div
              *ngFor="let item of productosDevolucion.controls; let i = index"
              [formGroupName]="i"
              class="border border-border rounded-lg bg-gray-50 p-3 space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="field">
                  <label class="block text-xs font-medium mb-1">Producto *</label>
                  <input pInputText formControlName="producto" class="w-full" readonly />
                </div>
                <div class="field">
                  <label class="block text-xs font-medium mb-1">Motivo *</label>
                  <input pInputText formControlName="causa" class="w-full" readonly />
                </div>
                <div class="field">
                  <label class="block text-xs font-medium mb-1">Factura</label>
                  <input pInputText formControlName="numero_factura" class="w-full" />
                </div>
                <div class="field">
                  <label class="block text-xs font-medium mb-1">Lote</label>
                  <input pInputText formControlName="lote" class="w-full" />
                </div>
                <div class="field">
                  <label class="block text-xs font-medium mb-1">Cantidad *</label>
                  <input pInputText type="number" formControlName="cantidad" class="w-full" />
                </div>
              </div>

              <div class="field">
                <label class="block text-xs font-medium mb-2">Destino *</label>
                <div class="flex flex-wrap gap-4">
                  <div *ngFor="let opt of destinos" class="flex items-center gap-2">
                    <p-radioButton
                      formControlName="destino"
                      [inputId]="'dest-' + i + '-' + opt.v"
                      [value]="opt.v"
                    ></p-radioButton>
                    <label [for]="'dest-' + i + '-' + opt.v" class="cursor-pointer">{{ opt.l }}</label>
                  </div>
                </div>
              </div>

              <div class="field">
                <label class="block text-xs font-medium mb-2">Acción correctiva</label>
                <div class="flex gap-4">
                  <div class="flex items-center gap-2">
                    <p-radioButton
                      formControlName="accion_correctiva"
                      [inputId]="'acorr-' + i + '-si'"
                      [value]="true"
                    ></p-radioButton>
                    <label [for]="'acorr-' + i + '-si'" class="cursor-pointer">Sí</label>
                  </div>
                  <div class="flex items-center gap-2">
                    <p-radioButton
                      formControlName="accion_correctiva"
                      [inputId]="'acorr-' + i + '-no'"
                      [value]="false"
                    ></p-radioButton>
                    <label [for]="'acorr-' + i + '-no'" class="cursor-pointer">No</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-1">Detalle de la respuesta de la devolución *</label>
          <textarea
            pInputTextarea
            formControlName="detalle_respuesta"
            rows="4"
            class="w-full"
          ></textarea>
        </div>

        <div class="field">
          <label class="block text-sm font-medium mb-1">Comentario de la devolución</label>
          <textarea
            pInputTextarea
            formControlName="comentario_devolucion"
            rows="3"
            class="w-full"
            placeholder="Comentario adicional tomado de la PQRS o de la gestión de la devolución"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1">
            Diligencia aquí el comentario propio de la devolución.
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            pButton
            type="submit"
            label="Radicar devolución"
            [disabled]="form.invalid || saving() || !d.pendiente"
            class="p-button-primary"
          ></button>
        </div>
      </form>
    </div>
  `,
})
export class DevolucionRegistroComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(PqrsService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  protected detalle = signal<DevolucionDetalle | null>(null);
  protected loading = signal(true);
  protected saving = signal(false);

  protected responsables: { v: DevolucionResponsable; l: string }[] = [
    { v: 'CLIENTE', l: 'Cliente' },
    { v: 'EMPRESA', l: 'Empresa' },
  ];

  protected destinos: { v: DevolucionDestino; l: string }[] = [
    { v: 'PRIMERA', l: 'Producto de primera' },
    { v: 'SUBPRODUCTO', l: 'Subproducto' },
    { v: 'ELIMINACION', l: 'Eliminación' },
  ];

  protected form = this.fb.nonNullable.group({
    responsable: this.fb.control<DevolucionResponsable>('CLIENTE', Validators.required),
    costo: [''],
    productos_devolucion: this.fb.array<FormGroup>([]),
    detalle_respuesta: ['', Validators.required],
    comentario_devolucion: ['', Validators.required],
  });

  private devolucionId = 0;

  get productosDevolucion(): FormArray<FormGroup> {
    return this.form.get('productos_devolucion') as FormArray<FormGroup>;
  }

  protected productoRegistroLabel(p: ProductoPQRS): string {
    const categoria = p.categoria_nombre ? ` (${p.categoria_nombre})` : '';
    const detalles = [
      p.numero_factura ? `Factura ${p.numero_factura}` : null,
      p.lote ? `Lote ${p.lote}` : null,
    ].filter(Boolean);
    const detalle = detalles.length ? ` · ${detalles.join(' · ')}` : '';
    return `${p.nombre_producto}${categoria} x ${p.cantidad}${detalle}`;
  }

  private buildProductoDevolucion(
    producto: ProductoPQRS,
    causa: string,
    registro?: Record<string, unknown>
  ): FormGroup {
    return this.fb.nonNullable.group({
      producto: [(registro?.['producto'] as string) || this.productoRegistroLabel(producto), Validators.required],
      causa: [(registro?.['causa'] as string) || causa, Validators.required],
      destino: this.fb.control<DevolucionDestino>(
        (registro?.['destino'] as DevolucionDestino) ?? 'PRIMERA',
        Validators.required
      ),
      cantidad: this.fb.control<number | string>(
        Number(registro?.['cantidad'] ?? producto.cantidad ?? 1),
        [Validators.required, Validators.min(0.01)]
      ),
      numero_factura: [
        (registro?.['numero_factura'] as string) ?? producto.numero_factura ?? '',
      ],
      lote: [(registro?.['lote'] as string) ?? producto.lote ?? ''],
      accion_correctiva: this.fb.control<boolean>(
        Boolean(registro?.['accion_correctiva']),
        { nonNullable: true }
      ),
    });
  }

  private setProductosDevolucion(d: DevolucionDetalle, dr: Record<string, unknown>): void {
    const registros = Array.isArray(dr['productos_devolucion'])
      ? (dr['productos_devolucion'] as Record<string, unknown>[])
      : dr['producto']
        ? [dr]
      : [];
    const causa = causaDesdeInconformidad(d);
    this.productosDevolucion.clear();
    d.pqrs.productos.forEach((producto, index) => {
      this.productosDevolucion.push(
        this.buildProductoDevolucion(producto, causa, registros[index])
      );
    });
  }

  ngOnInit(): void {
    this.devolucionId = Number(this.route.snapshot.paramMap.get('id'));
    this.svc.devolucionDetalle(this.devolucionId).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.aplicarPrefill(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('No se pudo cargar la devolución', 'Cerrar', { duration: 3500 });
      },
    });
  }

  private aplicarPrefill(d: DevolucionDetalle): void {
    const dr = (d.datos_registro || {}) as Record<string, unknown>;
    this.setProductosDevolucion(d, dr);

    if (!d.pendiente) {
      const legadoDesc =
        typeof dr['descripcion_devolucion'] === 'string'
          ? dr['descripcion_devolucion'].trim()
          : '';
      const textoDetalle =
        (typeof dr['detalle_respuesta'] === 'string'
          ? dr['detalle_respuesta'].trim()
          : '') ||
        legadoDesc ||
        (d.observaciones ?? '').trim() ||
        '';
      this.form.patchValue({
        responsable: (dr['responsable'] as DevolucionResponsable) ?? 'CLIENTE',
        costo: (dr['costo'] as string) ?? '',
        detalle_respuesta: textoDetalle,
        comentario_devolucion:
          (typeof dr['comentario_devolucion'] === 'string'
            ? dr['comentario_devolucion']
            : '') ||
          (d.observaciones ?? '') ||
          '',
      });
      this.form.disable();
    } else {
      this.form.patchValue({
        detalle_respuesta: '',
        comentario_devolucion: '',
      });
    }
  }

  guardar(): void {
    const d = this.detalle();
    if (!d?.pendiente || this.form.invalid) return;
    const v = this.form.getRawValue();
    const productosDevolucion = v.productos_devolucion.map((p: any) => {
      const cantidadRaw =
        typeof p.cantidad === 'string' ? parseFloat(p.cantidad) : p.cantidad;
      const cantidadNum =
        typeof cantidadRaw === 'number' && !Number.isNaN(cantidadRaw)
          ? cantidadRaw
          : NaN;
      return {
        producto: p.producto?.trim() ?? '',
        causa: p.causa?.trim() ?? '',
        destino: p.destino as DevolucionDestino,
        cantidad: cantidadNum,
        numero_factura: p.numero_factura?.trim() ? p.numero_factura.trim() : null,
        lote: p.lote?.trim() ? p.lote.trim() : null,
        accion_correctiva: Boolean(p.accion_correctiva),
      };
    });
    const primerProducto = productosDevolucion[0];
    const detalle = v.detalle_respuesta?.trim() ?? '';
    const comentarioDevolucion = v.comentario_devolucion?.trim() ?? '';
    if (
      v.responsable == null ||
      !primerProducto ||
      productosDevolucion.some(
        (p) =>
          !p.producto ||
          !p.causa ||
          !p.destino ||
          Number.isNaN(p.cantidad) ||
          p.cantidad <= 0
      ) ||
      !detalle ||
      !comentarioDevolucion
    ) {
      return;
    }
    const payload: DevolucionRegistroPayload = {
      responsable: v.responsable,
      costo: v.costo?.trim() ? v.costo.trim() : null,
      destino: primerProducto.destino,
      cantidad: primerProducto.cantidad,
      numero_factura: primerProducto.numero_factura,
      lote: primerProducto.lote,
      accion_correctiva: primerProducto.accion_correctiva,
      producto: primerProducto.producto,
      causa: primerProducto.causa,
      detalle_respuesta: detalle,
      comentario_devolucion: comentarioDevolucion,
      productos_devolucion: productosDevolucion,
    };
    this.saving.set(true);
    this.svc.guardarRadicadoDevolucion(this.devolucionId, payload).subscribe({
      next: (r) => {
        this.detalle.set(r);
        this.form.disable();
        this.saving.set(false);
        this.snack.open(`Devolución radicada ${r.codigo_devolucion ?? ''}`.trim(), 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.saving.set(false);
        this.snack.open('No se pudo guardar', 'Cerrar', { duration: 3500 });
      },
    });
  }
}
