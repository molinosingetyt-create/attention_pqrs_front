import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '@env/environment';
import { AuthService } from '@app/core/services/auth.service';
import { PqrsService } from '@app/core/services/pqrs.service';
import { UsuarioService } from '@app/core/services/usuario.service';
import { Inconformidad, PQRSDetail, TIPOS_EVIDENCIA_LABELS, TipoEvidencia, TipoPQRS, Usuario, CategoriaProducto, ProductoCatalogo } from '@app/core/models/api.models';
import { P } from '@app/core/permissions';
import { CatalogoProductosService } from '@app/core/services/catalogo-productos.service';

type ProductoDraft = {
  categoria_id: number | null;
  producto_catalogo_id: number | null;
  cantidad: number;
  numero_factura: string;
  lote: string;
  comentario: string;
};

const TIPOS_PRODUCTO_MOTIVO_OPCIONALES: ReadonlySet<TipoPQRS> = new Set([
  'QUEJA',
  'SUGERENCIA',
  'OTRO',
]);

const emptyNuevoProducto = (): ProductoDraft => ({
  categoria_id: null,
  producto_catalogo_id: null,
  cantidad: 1,
  numero_factura: '',
  lote: '',
  comentario: '',
});

@Component({
  selector: 'app-pqrs-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, MatIconModule, DatePipe, DecimalPipe],
  template: `
    <div *ngIf="pqrs() as p" class="space-y-6">
      <a routerLink="/pqrs" class="text-brand hover:underline flex items-center">
        <mat-icon>arrow_back</mat-icon> Volver al listado
      </a>

      <!-- Edición PQRS -->
      <div *ngIf="editMode() && puedeEditarPQRS()" class="card border border-[rgba(0,102,204,0.25)]">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 class="font-semibold text-gray-800">Editar / Gestionar PQRS</h3>
            <p class="text-xs text-gray-500">
              Puedes modificar los datos de cualquier PQRS si tienes permiso de edición.
            </p>
          </div>
          <button
            type="button"
            class="btn-secondary"
            (click)="toggleEdit(false)">
            <mat-icon>close</mat-icon> Cerrar edición
          </button>
        </div>

        <p *ngIf="pqrsEsTerminal(p)" class="text-sm text-gray-600 mt-3">
          Esta PQRS está cerrada o rechazada; no se permite modificar.
        </p>

        <form
          *ngIf="!pqrsEsTerminal(p)"
          [formGroup]="editForm"
          (ngSubmit)="guardarCambios()"
          class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div class="field">
            <label class="block text-sm font-medium mb-1">Estado</label>
            <select class="input" formControlName="estado">
              <option value="ABIERTA">Abierta</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="CERRADA">Cerrada</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
          </div>

          <div class="field">
            <label class="block text-sm font-medium mb-1">Vendedor</label>
            <select class="input" formControlName="vendedor_id">
              <option [ngValue]="null">—</option>
              <option *ngFor="let v of vendedores()" [ngValue]="v.id">{{ v.nombre }} · {{ v.email }}</option>
            </select>
          </div>

          <div class="field">
            <label class="block text-sm font-medium mb-1">Factura</label>
            <input class="input w-full" formControlName="numero_factura" />
          </div>

          <div class="field">
            <label class="block text-sm font-medium mb-1">Lote</label>
            <input class="input w-full" formControlName="lote" />
          </div>

          <div class="field md:col-span-2">
            <label class="block text-sm font-medium mb-1">Motivo</label>
            <select class="input" formControlName="inconformidad_id">
              <option [ngValue]="null">—</option>
              <option *ngFor="let inc of inconformidades()" [ngValue]="inc.id">
                {{ inc.area?.nombre }} · {{ inc.nombre }}
              </option>
            </select>
          </div>

          <div class="field md:col-span-2">
            <label class="block text-sm font-medium mb-1">Descripción / detalle</label>
            <textarea class="input w-full" rows="4" formControlName="descripcion"></textarea>
          </div>

          <div class="md:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" class="btn-secondary" (click)="resetEditForm(p)">
              Restablecer
            </button>
            <button type="submit" class="btn-primary">
              <mat-icon>save</mat-icon> Guardar cambios
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-2xl font-bold">{{ p.radicado }} · {{ p.tipo }}</h2>
            <p class="text-sm text-gray-500">Creada el {{ p.fecha_creacion | date:'medium' }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              *ngIf="puedeEditarPQRS() && !pqrsEsTerminal(p)"
              type="button"
              class="btn-secondary text-sm"
              (click)="toggleEdit(!editMode())">
              <mat-icon>{{ editMode() ? 'close' : 'edit' }}</mat-icon>
              {{ editMode() ? 'Cerrar edición' : 'Editar' }}
            </button>
            <button type="button" class="btn-secondary text-sm" (click)="descargarPdf()">
              <mat-icon>picture_as_pdf</mat-icon>
              Descargar PDF
            </button>
            <span class="badge text-base"
                  [class.badge-open]="p.estado === 'ABIERTA'"
                  [class.badge-progress]="p.estado === 'EN_PROCESO'"
                  [class.badge-closed]="p.estado === 'CERRADA'"
                  [class.badge-rejected]="p.estado === 'RECHAZADA'">
              {{ p.estado }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 class="font-semibold mb-2 text-gray-700">Cliente</h3>
            <div class="text-sm space-y-1">
              <div><strong>Nombre:</strong> {{ p.cliente.nombre }} {{ p.cliente.apellidos }}</div>
              <div><strong>NIT:</strong> {{ p.cliente.nit }}</div>
              <div><strong>Teléfono:</strong> {{ p.cliente.telefono || '—' }}</div>
              <div><strong>Correo:</strong> {{ p.cliente.correo || '—' }}</div>
              <div><strong>Ciudad:</strong> {{ p.cliente.ciudad || '—' }}</div>
            </div>
          </div>
          <div>
            <h3 class="font-semibold mb-2 text-gray-700">Detalles</h3>
            <div class="text-sm space-y-1">
              <div><strong>Factura:</strong> {{ p.numero_factura || '—' }}</div>
              <div><strong>Lote:</strong> {{ p.lote || '—' }}</div>
              <div>
                <strong>Motivo:</strong>
                <ng-container *ngIf="p.inconformidad; else sinInc">
                  {{ p.inconformidad.nombre }}
                  <span *ngIf="p.inconformidad.descripcion" class="text-gray-600">
                    ({{ p.inconformidad.descripcion }})
                  </span>
                  <span *ngIf="p.inconformidad.area" class="text-xs text-gray-500 block mt-1">
                    Área: {{ p.inconformidad.area.nombre }}
                  </span>
                </ng-container>
                <ng-template #sinInc>—</ng-template>
              </div>
              <div><strong>Vendedor:</strong> {{ p.vendedor?.nombre || '—' }}</div>
            </div>
          </div>
          <div class="md:col-span-2">
            <h3 class="font-semibold mb-2 text-gray-700">Descripción</h3>
            <p class="text-sm whitespace-pre-line">{{ p.descripcion || 'Sin descripción.' }}</p>
          </div>
        </div>
      </div>

      <div
        *ngIf="!productosFotosCompletas(p) && !pqrsEsTerminal(p)"
        class="card border border-amber-200 bg-amber-50 text-amber-900 text-sm">
        Faltan fotos obligatorias por producto. Debes cargar <strong>Por no conformidad</strong> y
        <strong>Foto del lote</strong> para cada producto antes de continuar el proceso.
      </div>

      <!-- Productos -->
      <div class="card">
        <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 class="font-semibold mb-0">Productos ({{ p.productos.length }})</h3>
          <button
            *ngIf="puedeEditarProductos(p)"
            type="button"
            class="btn-secondary text-sm"
            (click)="toggleNuevoProducto()">
            <mat-icon>{{ mostrandoNuevoProducto() ? 'close' : 'add' }}</mat-icon>
            {{ mostrandoNuevoProducto() ? 'Cancelar' : 'Agregar producto' }}
          </button>
        </div>

        <div
          *ngIf="mostrandoNuevoProducto() && puedeEditarProductos(p)"
          class="border border-dashed border-brand/40 rounded-lg p-4 mb-4 bg-brand/5 space-y-3">
          <p class="text-sm text-gray-600">Nuevo producto para esta PQRS</p>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Categoría</label>
              <select
                class="input text-sm w-full"
                [ngModel]="nuevoProducto().categoria_id"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="onNuevoCategoriaChange($event)">
                <option [ngValue]="null">— Seleccione —</option>
                <option *ngFor="let c of categorias()" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Producto</label>
              <select
                class="input text-sm w-full"
                [ngModel]="nuevoProducto().producto_catalogo_id"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="patchNuevoProducto('producto_catalogo_id', $event)">
                <option [ngValue]="null">— Seleccione —</option>
                <option *ngFor="let pr of opcionesNuevo()" [ngValue]="pr.id">{{ pr.nombre }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Cantidad</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                class="input text-sm w-full"
                [ngModel]="nuevoProducto().cantidad"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="patchNuevoProducto('cantidad', $event)" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Factura</label>
              <input
                class="input text-sm w-full"
                [ngModel]="nuevoProducto().numero_factura"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="patchNuevoProducto('numero_factura', $event)" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Lote</label>
              <input
                class="input text-sm w-full"
                [ngModel]="nuevoProducto().lote"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="patchNuevoProducto('lote', $event)" />
            </div>
            <div class="md:col-span-2 xl:col-span-3">
              <label class="block text-xs text-gray-500 mb-1">Comentario</label>
              <input
                class="input text-sm w-full"
                [ngModel]="nuevoProducto().comentario"
                [ngModelOptions]="{standalone: true}"
                (ngModelChange)="patchNuevoProducto('comentario', $event)" />
            </div>
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="btn-primary text-sm"
              [disabled]="savingNuevoProducto()"
              (click)="guardarNuevoProducto()">
              <mat-icon>save</mat-icon>
              Guardar nuevo producto
            </button>
          </div>
        </div>

        <div class="space-y-4">
          <div *ngFor="let prod of p.productos" class="border border-border rounded-lg p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm mb-4">
              <ng-container *ngIf="puedeEditarProductos(p) && draftProducto(prod.id!); else soloLecturaProd">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Categoría</label>
                  <select
                    class="input text-sm w-full"
                    [ngModel]="draftProducto(prod.id!)!.categoria_id"
                    [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="onDraftCategoriaChange(prod.id!, $event)">
                    <option [ngValue]="null">— Seleccione —</option>
                    <option *ngFor="let c of categorias()" [ngValue]="c.id">{{ c.nombre }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Producto</label>
                  <select
                    class="input text-sm w-full"
                    [ngModel]="draftProducto(prod.id!)!.producto_catalogo_id"
                    [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="patchProductoDraft(prod.id!, 'producto_catalogo_id', $event)">
                    <option [ngValue]="null">— Seleccione —</option>
                    <option *ngFor="let pr of opcionesProducto(prod.id!)" [ngValue]="pr.id">{{ pr.nombre }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="input text-sm w-full"
                    [ngModel]="draftProducto(prod.id!)!.cantidad"
                    [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="patchProductoDraft(prod.id!, 'cantidad', $event)" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Factura</label>
                  <input
                    class="input text-sm w-full"
                    [ngModel]="draftProducto(prod.id!)!.numero_factura"
                    [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="patchProductoDraft(prod.id!, 'numero_factura', $event)" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Lote</label>
                  <input
                    class="input text-sm w-full"
                    [ngModel]="draftProducto(prod.id!)!.lote"
                    [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="patchProductoDraft(prod.id!, 'lote', $event)" />
                </div>
                <div class="md:col-span-2 xl:col-span-3">
                  <label class="block text-xs text-gray-500 mb-1">Comentario</label>
                  <input
                    class="input text-sm w-full"
                    [ngModel]="draftProducto(prod.id!)!.comentario"
                    [ngModelOptions]="{standalone: true}"
                    (ngModelChange)="patchProductoDraft(prod.id!, 'comentario', $event)" />
                </div>
                <div class="md:col-span-2 xl:col-span-4 flex justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    class="btn-text-danger text-sm"
                    [disabled]="deletingProductoId() === prod.id || !puedeEliminarProducto(p)"
                    [title]="puedeEliminarProducto(p) ? 'Quitar producto' : 'No se puede quitar el último producto en este tipo de PQRS'"
                    (click)="eliminarProducto(prod.id!)">
                    <mat-icon>delete</mat-icon>
                    Quitar producto
                  </button>
                  <button
                    type="button"
                    class="btn-primary text-sm"
                    [disabled]="savingProductoId() === prod.id"
                    (click)="guardarProducto(prod.id!)">
                    <mat-icon>save</mat-icon>
                    Guardar producto
                  </button>
                </div>
              </ng-container>

              <ng-template #soloLecturaProd>
                <div>
                  <strong>Producto:</strong> {{ prod.nombre_producto }}
                  <div *ngIf="prod.categoria_nombre" class="text-xs text-gray-500">
                    {{ prod.categoria_nombre }}
                  </div>
                </div>
                <div><strong>Cantidad:</strong> {{ prod.cantidad | number:'1.0-2' }}</div>
                <div><strong>Factura:</strong> {{ prod.numero_factura || '—' }}</div>
                <div><strong>Lote:</strong> {{ prod.lote || '—' }}</div>
                <div *ngIf="prod.comentario" class="md:col-span-2 xl:col-span-4">
                  <strong>Comentario:</strong> {{ prod.comentario }}
                </div>
              </ng-template>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div *ngFor="let tipo of tiposEvidencia" class="border border-gray-100 rounded-lg p-3">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-sm font-medium text-gray-700">{{ TIPOS_EVIDENCIA_LABELS[tipo] }}</span>
                  <span
                    class="text-xs px-2 py-0.5 rounded-full"
                    [class.bg-green-100]="evidenciaProducto(prod, tipo)"
                    [class.text-green-700]="evidenciaProducto(prod, tipo)"
                    [class.bg-red-100]="!evidenciaProducto(prod, tipo)"
                    [class.text-red-700]="!evidenciaProducto(prod, tipo)">
                    {{ evidenciaProducto(prod, tipo) ? 'Cargada' : 'Obligatoria' }}
                  </span>
                </div>

                <div *ngIf="evidenciaProducto(prod, tipo) as ev; else sinFoto">
                  <a [href]="fullUrl(ev.archivo_url)" target="_blank" class="text-brand hover:underline text-sm inline-flex items-center gap-1">
                    <mat-icon style="font-size:18px">image</mat-icon>
                    {{ ev.nombre_original || ev.titulo || 'Ver foto' }}
                  </a>
                  <div class="text-xs text-gray-400 mt-1">{{ ev.fecha_subida | date:'short' }}</div>
                </div>

                <ng-template #sinFoto>
                  <p class="text-xs text-gray-500 mb-2">Falta subir esta foto obligatoria.</p>
                </ng-template>

                <label
                  *ngIf="puedeSubirEvidencia() && !pqrsEsTerminal(p) && prod.id"
                  class="btn-secondary cursor-pointer inline-flex mt-2 text-xs">
                  <mat-icon style="font-size:16px">upload</mat-icon>
                  {{ evidenciaProducto(prod, tipo) ? 'Reemplazar foto' : 'Subir foto' }}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    (change)="subirEvidenciaProducto($event, prod.id!, tipo)" />
                </label>
              </div>
            </div>
          </div>

          <p *ngIf="!p.productos.length" class="text-center text-gray-400 text-sm py-3">
            Sin productos.
          </p>
        </div>
      </div>

      <!-- Análisis y asignación de responsabilidad -->
      <div class="card">
        <h3 class="font-semibold mb-2">Análisis y Asignación de responsabilidad</h3>
        <p *ngIf="p.inconformidad?.area as area" class="text-xs text-gray-500 mb-4">
          Área responsable: <strong>{{ area.nombre }}</strong>
          <span *ngIf="!puedeGestionarAnalisis(p)"> · Solo usuarios de esta área pueden editar.</span>
        </p>
        <p *ngIf="!p.inconformidad?.area" class="text-sm text-gray-500 mb-4">
          Esta PQRS no tiene un motivo con área responsable asignada.
        </p>

        <ng-container *ngIf="p.analisis_responsabilidad as analisis">
          <div *ngIf="!puedeGestionarAnalisis(p)" class="space-y-3 mb-2">
            <div class="flex flex-wrap gap-4 text-sm">
              <span class="badge" [class.badge-closed]="analisis.procedente" [class.badge-rejected]="!analisis.procedente">
                {{ analisis.procedente ? 'Procedente' : 'No procedente' }}
              </span>
              <span class="text-xs text-gray-500">
                {{ analisis.fecha_actualizacion | date:'short' }}
                <span *ngIf="analisis.usuario_nombre"> · {{ analisis.usuario_nombre }}</span>
              </span>
            </div>
            <p class="text-sm whitespace-pre-line">{{ analisis.comentario }}</p>
          </div>
        </ng-container>

        <form
          *ngIf="puedeGestionarAnalisis(p)"
          [formGroup]="analisisForm"
          (ngSubmit)="guardarAnalisis()"
          class="space-y-4">
          <div class="flex flex-wrap gap-6">
            <label class="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                class="input-checkbox-rounded"
                [checked]="analisisForm.get('procedente')?.value === true"
                (change)="setProcedente(true)" />
              Procedente
            </label>
            <label class="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                class="input-checkbox-rounded"
                [checked]="analisisForm.get('procedente')?.value === false"
                (change)="setProcedente(false)" />
              No procedente
            </label>
          </div>
          <p *ngIf="analisisSubmitted() && analisisForm.get('procedente')?.invalid"
             class="text-xs text-danger">
            Debes seleccionar Procedente o No procedente.
          </p>

          <div>
            <label class="label">Comentario *</label>
            <textarea rows="4" class="input w-full" formControlName="comentario"
                      placeholder="Detalle del análisis y asignación de responsabilidad..."></textarea>
            <p *ngIf="analisisSubmitted() && analisisForm.get('comentario')?.invalid"
               class="text-xs text-danger mt-1">
              El comentario es obligatorio.
            </p>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary" [disabled]="analisisSaving()">
              <mat-icon>save</mat-icon> Guardar análisis
            </button>
          </div>
        </form>

        <p *ngIf="!puedeGestionarAnalisis(p) && !p.analisis_responsabilidad"
           class="text-sm text-gray-500">
          Aún no se ha registrado el análisis de responsabilidad.
        </p>
      </div>

      <!-- Seguimientos -->
      <div class="card">
        <h3 class="font-semibold mb-3">Historial / Seguimiento</h3>
        <p *ngIf="pqrsEsTerminal(p)" class="text-sm text-gray-600 mb-4">
          Esta PQRS está {{ p.estado === 'CERRADA' ? 'cerrada' : 'rechazada' }}; el historial queda en solo lectura.
        </p>
        <form *ngIf="puedeGestionarSeguimiento() && !pqrsEsTerminal(p)" [formGroup]="segForm" (ngSubmit)="addSeguimiento()"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <select class="input" formControlName="estado">
            <option value="ABIERTA">Abierta</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="CERRADA">Cerrada</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
          <input class="input sm:col-span-1 lg:col-span-2" formControlName="descripcion"
                 placeholder="Descripción del seguimiento..." />
          <button type="submit" class="btn-primary sm:col-span-2 lg:col-span-1">Agregar seguimiento</button>
        </form>
        <p *ngIf="!puedeGestionarSeguimiento() && !pqrsEsTerminal(p)" class="text-sm text-gray-500 mb-4">
          El historial de seguimiento lo gestionan administración o administrativo comercial.
        </p>

        <ol class="relative timeline-line">
          <li *ngFor="let s of p.seguimientos" class="ms-4 pb-4">
            <div class="timeline-dot"></div>
            <div class="flex items-center gap-2 text-sm">
              <span class="badge"
                    [class.badge-open]="s.estado === 'ABIERTA'"
                    [class.badge-progress]="s.estado === 'EN_PROCESO'"
                    [class.badge-closed]="s.estado === 'CERRADA'"
                    [class.badge-rejected]="s.estado === 'RECHAZADA'">{{ s.estado }}</span>
              <span class="text-xs text-gray-500">
                {{ s.fecha | date:'short' }} · {{ s.usuario_nombre || 'Sistema' }}
              </span>
            </div>
            <p class="text-sm mt-1">{{ s.descripcion || '—' }}</p>
          </li>
        </ol>
      </div>

      <!-- Satisfacción del cliente -->
      <div class="card">
        <h3 class="font-semibold mb-4">Satisfacción del cliente</h3>

        <ng-container *ngIf="p.satisfaccion_cliente as sat">
          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-700 mb-1">
                La respuesta, dada a su requerimiento cumplió sus expectativas:
              </p>
              <p class="font-medium">{{ sat.expectativa_cumplida ? 'Sí' : 'No' }}</p>
            </div>
            <div *ngIf="sat.comentarios">
              <p class="text-sm text-gray-700 mb-1">Comentarios:</p>
              <p class="text-sm whitespace-pre-line">{{ sat.comentarios }}</p>
            </div>
            <p class="text-xs text-gray-500">
              {{ sat.fecha_actualizacion | date:'short' }}
              <span *ngIf="sat.usuario_nombre"> · {{ sat.usuario_nombre }}</span>
            </p>
          </div>
        </ng-container>

        <form
          *ngIf="puedeGestionarSatisfaccion(p) && !p.satisfaccion_cliente"
          [formGroup]="satisfaccionForm"
          (ngSubmit)="guardarSatisfaccion()"
          class="space-y-5">
          <div>
            <p class="text-sm font-medium text-gray-800 mb-3">
              La respuesta, dada a su requerimiento cumplió sus expectativas *
            </p>
            <div class="flex flex-wrap gap-4">
              <label class="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" formControlName="expectativa_cumplida" [value]="true" class="input-checkbox-rounded" />
                Sí
              </label>
              <label class="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" formControlName="expectativa_cumplida" [value]="false" class="input-checkbox-rounded" />
                No
              </label>
            </div>
            <p *ngIf="satisfaccionSubmitted() && satisfaccionForm.get('expectativa_cumplida')?.invalid"
               class="text-xs text-danger mt-1">
              Debes seleccionar Sí o No.
            </p>
          </div>

          <div>
            <label class="label">Comentarios</label>
            <textarea
              rows="3"
              class="input w-full"
              formControlName="comentarios"
              placeholder="Observaciones adicionales (opcional)"></textarea>
          </div>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary" [disabled]="satisfaccionSaving()">
              <mat-icon>save</mat-icon> Guardar satisfacción
            </button>
          </div>
        </form>

        <p *ngIf="!puedeGestionarSatisfaccion(p) && !p.satisfaccion_cliente"
           class="text-sm text-gray-500">
          Aún no se ha registrado la satisfacción del cliente.
        </p>
      </div>
    </div>
  `,
})
export class PqrsDetailComponent implements OnInit {
  protected readonly TIPOS_EVIDENCIA_LABELS = TIPOS_EVIDENCIA_LABELS;
  protected readonly tiposEvidencia: TipoEvidencia[] = ['NO_CONFORMIDAD', 'FOTO_LOTE'];

  private route = inject(ActivatedRoute);
  private svc = inject(PqrsService);
  private catalogo = inject(CatalogoProductosService);
  private usuarios = inject(UsuarioService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  protected auth = inject(AuthService);

  protected pqrs = signal<PQRSDetail | null>(null);
  protected editMode = signal(false);
  protected analisisSubmitted = signal(false);
  protected analisisSaving = signal(false);
  protected satisfaccionSubmitted = signal(false);
  protected satisfaccionSaving = signal(false);
  protected savingProductoId = signal<number | null>(null);
  protected deletingProductoId = signal<number | null>(null);
  protected productDrafts = signal<Record<number, ProductoDraft>>({});
  protected opcionesByProductoId = signal<Record<number, ProductoCatalogo[]>>({});
  protected categorias = signal<CategoriaProducto[]>([]);
  protected mostrandoNuevoProducto = signal(false);
  protected nuevoProducto = signal<ProductoDraft>(emptyNuevoProducto());
  protected opcionesNuevo = signal<ProductoCatalogo[]>([]);
  protected savingNuevoProducto = signal(false);
  protected vendedores = signal<Usuario[]>([]);
  protected inconformidades = signal<Inconformidad[]>([]);

  protected puedeEditarPQRS = (): boolean => this.auth.can(P.PQRS_EDITAR);
  protected puedeGestionarSeguimiento = (): boolean => this.auth.can(P.PQRS_SEGUIMIENTO_CREAR);
  protected puedeSubirEvidencia = (): boolean =>
    this.auth.can(P.PQRS_EVIDENCIA_SUBIR) || this.auth.can(P.PQRS_EDITAR);

  protected puedeEditarProductos(p: PQRSDetail): boolean {
    return this.puedeEditarPQRS() && !this.pqrsEsTerminal(p);
  }

  protected puedeEliminarProducto(p: PQRSDetail): boolean {
    if (!this.puedeEditarProductos(p)) return false;
    if (TIPOS_PRODUCTO_MOTIVO_OPCIONALES.has(p.tipo)) return true;
    return p.productos.length > 1;
  }

  protected opcionesProducto(productoId: number): ProductoCatalogo[] {
    return this.opcionesByProductoId()[productoId] || [];
  }

  protected draftProducto(productoId: number): ProductoDraft | null {
    return this.productDrafts()[productoId] ?? null;
  }

  protected patchProductoDraft(
    productoId: number,
    field: keyof ProductoDraft,
    value: string | number | null
  ): void {
    const current = this.productDrafts()[productoId];
    if (!current) return;
    this.productDrafts.update((m) => ({
      ...m,
      [productoId]: { ...current, [field]: value },
    }));
  }

  protected onDraftCategoriaChange(productoId: number, categoriaId: number | null): void {
    this.patchProductoDraft(productoId, 'categoria_id', categoriaId);
    this.patchProductoDraft(productoId, 'producto_catalogo_id', null);
    if (!categoriaId) {
      this.opcionesByProductoId.update((m) => {
        const n = { ...m };
        delete n[productoId];
        return n;
      });
      return;
    }
    this.catalogo.productosPorCategoria(categoriaId, true).subscribe({
      next: (list) =>
        this.opcionesByProductoId.update((m) => ({ ...m, [productoId]: list })),
      error: () =>
        this.opcionesByProductoId.update((m) => ({ ...m, [productoId]: [] })),
    });
  }

  protected patchNuevoProducto(field: keyof ProductoDraft, value: string | number | null): void {
    this.nuevoProducto.update((d) => ({ ...d, [field]: value }));
  }

  protected onNuevoCategoriaChange(categoriaId: number | null): void {
    this.nuevoProducto.update((d) => ({
      ...d,
      categoria_id: categoriaId,
      producto_catalogo_id: null,
    }));
    if (!categoriaId) {
      this.opcionesNuevo.set([]);
      return;
    }
    this.catalogo.productosPorCategoria(categoriaId, true).subscribe({
      next: (list) => this.opcionesNuevo.set(list),
      error: () => this.opcionesNuevo.set([]),
    });
  }

  protected toggleNuevoProducto(): void {
    const next = !this.mostrandoNuevoProducto();
    this.mostrandoNuevoProducto.set(next);
    if (next) {
      this.nuevoProducto.set(emptyNuevoProducto());
      this.opcionesNuevo.set([]);
    }
  }

  protected puedeGestionarAnalisis(p: PQRSDetail): boolean {
    if (this.pqrsEsTerminal(p)) return false;
    const areaCodigo = p.inconformidad?.area?.codigo;
    const rol = this.auth.currentUser()?.rol;
    return !!areaCodigo && !!rol && rol === areaCodigo;
  }

  protected puedeGestionarSatisfaccion(p: PQRSDetail): boolean {
    if (this.pqrsEsTerminal(p)) return false;
    if (this.auth.can(P.PQRS_SEGUIMIENTO_CREAR) || this.auth.can(P.PQRS_EDITAR)) return true;
    const uid = this.auth.currentUser()?.id;
    return !!uid && p.vendedor?.id === uid;
  }

  protected evidenciaProducto(prod: PQRSDetail['productos'][number], tipo: TipoEvidencia) {
    return (prod.evidencias || []).find((e) => e.tipo === tipo) ?? null;
  }

  protected productosFotosCompletas(p: PQRSDetail): boolean {
    return p.productos.every((prod) =>
      this.tiposEvidencia.every((tipo) => !!this.evidenciaProducto(prod, tipo))
    );
  }

  protected pqrsEsTerminal(p: PQRSDetail): boolean {
    return p.estado === 'CERRADA' || p.estado === 'RECHAZADA';
  }

  protected segForm = this.fb.nonNullable.group({
    estado: ['EN_PROCESO'],
    descripcion: [''],
  });

  protected analisisForm = this.fb.group({
    procedente: [null as boolean | null, Validators.required],
    comentario: ['', Validators.required],
  });

  protected satisfaccionForm = this.fb.group({
    expectativa_cumplida: [null as boolean | null, Validators.required],
    comentarios: [''],
  });

  protected editForm = this.fb.group({
    estado: ['EN_PROCESO'],
    descripcion: [''],
    numero_factura: [''],
    lote: [''],
    inconformidad_id: [null as number | null],
    vendedor_id: [null as number | null],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.editMode.set(this.route.snapshot.queryParamMap.get('edit') === '1');
    this.load(id);
    this.loadCatalogos();
  }

  load(id: number): void {
    this.svc.detail(id).subscribe((p) => {
      this.pqrs.set(p);
      this.resetEditForm(p);
      this.resetProductoDrafts(p);
      this.resetAnalisisForm(p);
      this.resetSatisfaccionForm(p);
    });
  }

  protected resetProductoDrafts(p: PQRSDetail): void {
    const drafts: Record<number, ProductoDraft> = {};
    for (const prod of p.productos) {
      if (!prod.id) continue;
      drafts[prod.id] = {
        categoria_id: prod.categoria_id ?? null,
        producto_catalogo_id: prod.producto_catalogo_id ?? null,
        cantidad: Number(prod.cantidad) || 1,
        numero_factura: prod.numero_factura || '',
        lote: prod.lote || '',
        comentario: prod.comentario || '',
      };
      if (prod.categoria_id) {
        this.catalogo.productosPorCategoria(prod.categoria_id, true).subscribe({
          next: (list) =>
            this.opcionesByProductoId.update((m) => ({ ...m, [prod.id!]: list })),
          error: () =>
            this.opcionesByProductoId.update((m) => ({ ...m, [prod.id!]: [] })),
        });
      }
    }
    this.productDrafts.set(drafts);
  }

  protected toggleEdit(value: boolean): void {
    this.editMode.set(value);
  }

  protected guardarProducto(productoId: number): void {
    const p = this.pqrs();
    const draft = this.productDrafts()[productoId];
    if (!p || !draft || !this.puedeEditarProductos(p)) return;

    const cantidad = Number(draft.cantidad);
    if (!draft.producto_catalogo_id) {
      this.snack.open('Selecciona un producto del catálogo.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!cantidad || cantidad <= 0) {
      this.snack.open('La cantidad debe ser mayor a 0.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!draft.numero_factura.trim() || !draft.lote.trim()) {
      this.snack.open('Factura y lote son obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.savingProductoId.set(productoId);
    this.svc
      .updateProducto(p.id, productoId, {
        producto_catalogo_id: draft.producto_catalogo_id,
        cantidad,
        numero_factura: draft.numero_factura.trim(),
        lote: draft.lote.trim(),
        comentario: draft.comentario.trim() || null,
      })
      .subscribe({
        next: () => {
          this.savingProductoId.set(null);
          this.snack.open('Producto actualizado', 'Cerrar', { duration: 2000 });
          this.load(p.id);
        },
        error: (e) => {
          this.savingProductoId.set(null);
          const msg = e?.error?.detail || 'No se pudo actualizar el producto';
          this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
        },
      });
  }

  protected eliminarProducto(productoId: number): void {
    const p = this.pqrs();
    if (!p || !this.puedeEliminarProducto(p)) return;
    if (!confirm('¿Quitar este producto de la PQRS? Se eliminarán también sus fotos.')) return;

    this.deletingProductoId.set(productoId);
    this.svc.deleteProducto(p.id, productoId).subscribe({
      next: () => {
        this.deletingProductoId.set(null);
        this.snack.open('Producto eliminado', 'Cerrar', { duration: 2000 });
        this.load(p.id);
      },
      error: (e) => {
        this.deletingProductoId.set(null);
        const msg = e?.error?.detail || 'No se pudo eliminar el producto';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  protected guardarNuevoProducto(): void {
    const p = this.pqrs();
    const draft = this.nuevoProducto();
    if (!p || !this.puedeEditarProductos(p)) return;

    const cantidad = Number(draft.cantidad);
    if (!draft.producto_catalogo_id) {
      this.snack.open('Selecciona un producto del catálogo.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!cantidad || cantidad <= 0) {
      this.snack.open('La cantidad debe ser mayor a 0.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!draft.numero_factura.trim() || !draft.lote.trim()) {
      this.snack.open('Factura y lote son obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    const nombre =
      this.opcionesNuevo().find((x) => x.id === draft.producto_catalogo_id)?.nombre || '';

    this.savingNuevoProducto.set(true);
    this.svc
      .addProductos(p.id, [
        {
          nombre_producto: nombre,
          producto_catalogo_id: draft.producto_catalogo_id,
          cantidad,
          numero_factura: draft.numero_factura.trim(),
          lote: draft.lote.trim(),
          comentario: draft.comentario.trim() || null,
        },
      ])
      .subscribe({
        next: () => {
          this.savingNuevoProducto.set(false);
          this.mostrandoNuevoProducto.set(false);
          this.nuevoProducto.set(emptyNuevoProducto());
          this.opcionesNuevo.set([]);
          this.snack.open('Producto agregado', 'Cerrar', { duration: 2000 });
          this.load(p.id);
        },
        error: (e) => {
          this.savingNuevoProducto.set(false);
          const msg = e?.error?.detail || 'No se pudo agregar el producto';
          this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
        },
      });
  }

  protected setProcedente(value: boolean): void {
    this.analisisForm.patchValue({ procedente: value });
  }

  protected resetAnalisisForm(p: PQRSDetail): void {
    const a = p.analisis_responsabilidad;
    this.analisisForm.reset({
      procedente: a ? a.procedente : null,
      comentario: a?.comentario ?? '',
    });
    this.analisisSubmitted.set(false);
  }

  protected guardarAnalisis(): void {
    this.analisisSubmitted.set(true);
    if (this.analisisForm.invalid) {
      this.analisisForm.markAllAsTouched();
      return;
    }
    const p = this.pqrs();
    if (!p || !this.puedeGestionarAnalisis(p)) return;

    const raw = this.analisisForm.getRawValue();
    if (raw.procedente === null || raw.procedente === undefined) return;

    this.analisisSaving.set(true);
    this.svc.guardarAnalisisResponsabilidad(p.id, {
      procedente: raw.procedente,
      comentario: (raw.comentario || '').trim(),
    }).subscribe({
      next: () => {
        this.snack.open('Análisis guardado', 'Cerrar', { duration: 2000 });
        this.analisisSaving.set(false);
        this.load(p.id);
      },
      error: (e) => {
        this.analisisSaving.set(false);
        const msg = e?.error?.detail || 'No se pudo guardar el análisis';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  protected resetSatisfaccionForm(p: PQRSDetail): void {
    const s = p.satisfaccion_cliente;
    this.satisfaccionForm.reset({
      expectativa_cumplida: s ? s.expectativa_cumplida : null,
      comentarios: s?.comentarios ?? '',
    });
    this.satisfaccionSubmitted.set(false);
  }

  protected guardarSatisfaccion(): void {
    this.satisfaccionSubmitted.set(true);
    if (this.satisfaccionForm.invalid) {
      this.satisfaccionForm.markAllAsTouched();
      return;
    }
    const p = this.pqrs();
    if (!p || !this.puedeGestionarSatisfaccion(p)) return;

    const raw = this.satisfaccionForm.getRawValue();
    if (raw.expectativa_cumplida == null) return;

    this.satisfaccionSaving.set(true);
    this.svc.guardarSatisfaccionCliente(p.id, {
      expectativa_cumplida: raw.expectativa_cumplida,
      comentarios: (raw.comentarios || '').trim() || null,
    }).subscribe({
      next: () => {
        this.snack.open('Satisfacción guardada', 'Cerrar', { duration: 2000 });
        this.satisfaccionSaving.set(false);
        this.load(p.id);
      },
      error: (e) => {
        this.satisfaccionSaving.set(false);
        const msg = e?.error?.detail || 'No se pudo guardar la satisfacción';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  private loadCatalogos(): void {
    this.usuarios.vendedores().subscribe({
      next: (list) => this.vendedores.set(list),
      error: () => this.vendedores.set([]),
    });
    this.svc.inconformidades().subscribe({
      next: (list) => this.inconformidades.set(list),
      error: () => this.inconformidades.set([]),
    });
    this.catalogo.categorias(true).subscribe({
      next: (list) => this.categorias.set(list),
      error: () => this.categorias.set([]),
    });
  }

  protected resetEditForm(p: PQRSDetail): void {
    const incId = p.inconformidad?.id ?? null;
    const vendId = p.vendedor?.id ?? null;
    this.editForm.reset({
      estado: p.estado,
      descripcion: p.descripcion ?? '',
      numero_factura: p.numero_factura ?? '',
      lote: p.lote ?? '',
      inconformidad_id: incId,
      vendedor_id: vendId,
    });
  }

  protected guardarCambios(): void {
    if (!this.puedeEditarPQRS()) return;
    const p = this.pqrs();
    if (!p || this.pqrsEsTerminal(p)) return;

    const raw = this.editForm.getRawValue();
    const payload: any = {
      estado: raw.estado || null,
      descripcion: raw.descripcion || null,
      numero_factura: raw.numero_factura || null,
      lote: raw.lote || null,
      inconformidad_id: raw.inconformidad_id,
      vendedor_id: raw.vendedor_id,
    };

    this.svc.update(p.id, payload).subscribe({
      next: () => {
        this.snack.open('PQRS actualizada', 'Cerrar', { duration: 2000 });
        this.load(p.id);
      },
      error: (e) => {
        const msg = e?.error?.detail || 'No se pudo actualizar la PQRS';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  addSeguimiento(): void {
    if (!this.puedeGestionarSeguimiento()) return;
    const p = this.pqrs();
    if (!p || this.pqrsEsTerminal(p)) return;
    this.svc.crearSeguimiento(p.id, this.segForm.getRawValue()).subscribe(() => {
      this.snack.open('Seguimiento agregado', 'Cerrar', { duration: 2000 });
      this.load(p.id);
    });
  }

  subirEvidenciaProducto(e: Event, productoId: number, tipo: TipoEvidencia): void {
    if (!this.puedeSubirEvidencia()) return;
    const p = this.pqrs();
    if (p && this.pqrsEsTerminal(p)) return;
    const input = e.target as HTMLInputElement;
    if (!p || !input.files?.length) return;

    this.pqrsServiceSubir(p.id, input.files[0], productoId, tipo);
    input.value = '';
  }

  private pqrsServiceSubir(pqrsId: number, file: File, productoId: number, tipo: TipoEvidencia): void {
    this.svc.subirEvidencia(pqrsId, file, { productoPqrsId: productoId, tipo }).subscribe({
      next: () => {
        this.snack.open('Foto actualizada correctamente', 'Cerrar', { duration: 2000 });
        this.load(pqrsId);
      },
      error: (err) => {
        const msg = err?.error?.detail || 'No se pudo actualizar la foto';
        this.snack.open(String(msg), 'Cerrar', { duration: 3500 });
      },
    });
  }

  descargarPdf(): void {
    const p = this.pqrs();
    if (!p) return;
    this.svc.descargarPdf(p.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pqrs-${p.radicado}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.snack.open('No se pudo generar el PDF', 'Cerrar', { duration: 3000 });
      },
    });
  }

  fullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${environment.filesBaseUrl}${url}`;
  }
}
