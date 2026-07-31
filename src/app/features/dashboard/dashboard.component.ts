import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PqrsService } from '@app/core/services/pqrs.service';
import { DashboardResponse } from '@app/core/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule, DatePipe],
  template: `
    <div *ngIf="loading()" class="flex justify-center p-10">
      <mat-spinner diameter="40"></mat-spinner>
    </div>

    <div *ngIf="data() as d" class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-800">Dashboard</h2>

      <!-- KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="card border-l-4" style="border-color:#0066CC">
          <div class="text-sm text-muted">Total PQRS</div>
          <div class="text-3xl font-bold" style="color:#0066CC">{{ d.kpis.total }}</div>
        </div>
        <div class="card border-l-4" style="border-color:#0066CC">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-sm text-muted">Abiertas</div>
              <div class="text-3xl font-bold">{{ d.kpis.abiertas }}</div>
            </div>
            <mat-icon style="color:#0066CC">inbox</mat-icon>
          </div>
        </div>
        <div class="card border-l-4" style="border-color:#A37F3E">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-sm text-muted">En proceso</div>
              <div class="text-3xl font-bold">{{ d.kpis.en_proceso }}</div>
            </div>
            <mat-icon style="color:#A37F3E">hourglass_top</mat-icon>
          </div>
        </div>
        <div class="card border-l-4" style="border-color:#103847">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-sm text-muted">Cerradas</div>
              <div class="text-3xl font-bold">{{ d.kpis.cerradas }}</div>
            </div>
            <mat-icon style="color:#103847">check_circle</mat-icon>
          </div>
        </div>
        <div class="card border-l-4" style="border-color:#DD0A1E">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-sm text-muted">Rechazadas</div>
              <div class="text-3xl font-bold">{{ d.kpis.rechazadas }}</div>
            </div>
            <mat-icon style="color:#DD0A1E">block</mat-icon>
          </div>
        </div>
      </div>

      <!-- Productos por categoría -->
      <div class="card">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-800">Productos por categoría</h3>
            <mat-icon class="text-gray-400">category</mat-icon>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:w-auto">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Fecha inicio</label>
              <input
                type="date"
                [(ngModel)]="fechaInicio"
                (ngModelChange)="onCategoryDateChange()"
                class="input"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Fecha fin</label>
              <input
                type="date"
                [(ngModel)]="fechaFin"
                (ngModelChange)="onCategoryDateChange()"
                class="input"
              />
            </div>
          </div>
        </div>

        <div *ngIf="categoryLoading()" class="flex justify-center py-8">
          <mat-spinner diameter="32"></mat-spinner>
        </div>

        <div *ngIf="!categoryLoading() && (d.por_categoria_producto?.length || 0) > 0; else noCategoryData" class="space-y-6">
          <div *ngFor="let cat of categoriasAgrupadas(d); let ci = index">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span
                  [style.background]="areaColor(ci)"
                  style="width:12px;height:12px;border-radius:9999px;display:inline-block;"></span>
                <span class="font-semibold text-gray-800">{{ cat.categoria }}</span>
              </div>
              <span class="text-sm text-gray-500 tabular-nums">{{ cat.total }} líneas</span>
            </div>
            <div class="space-y-2 pl-4 border-l-2" [style.border-color]="areaColor(ci)">
              <div *ngFor="let p of cat.productos">
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700 truncate pr-4">{{ p.producto }}</span>
                  <span class="text-gray-500 tabular-nums flex-shrink-0">{{ p.cantidad }}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    class="h-1.5 rounded-full transition-all"
                    [style.background]="areaColor(ci)"
                    [style.width.%]="(p.cantidad / (cat.total || 1)) * 100">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ng-template #noCategoryData>
          <p *ngIf="!categoryLoading()" class="text-gray-400 text-sm">
            {{ fechaInicio || fechaFin
              ? 'No hay productos registrados en PQRS para el rango seleccionado.'
              : 'Aún no hay productos registrados en PQRS.' }}
          </p>
        </ng-template>
      </div>

      <!-- Distribución por tipo -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-800">Distribución por tipo</h3>
            <mat-icon class="text-gray-400">pie_chart</mat-icon>
          </div>
          <div class="space-y-3">
            <div *ngFor="let t of d.por_tipo">
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium">{{ t.tipo }}</span>
                <span class="text-gray-500">{{ t.cantidad }}</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all"
                  style="background: linear-gradient(90deg, #0066CC, #A37F3E)"
                  [style.width.%]="(t.cantidad / (d.kpis.total || 1)) * 100">
                </div>
              </div>
            </div>
            <p *ngIf="!d.por_tipo.length" class="text-gray-400 text-sm">
              Aún no hay PQRS registradas.
            </p>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-800">PQRS por mes</h3>
            <mat-icon class="text-gray-400">show_chart</mat-icon>
          </div>

          <div *ngIf="(d.por_mes?.length || 0) > 0; else noMonthData">
            <svg
              viewBox="0 0 600 220"
              style="width:100%;height:auto;display:block;">
              <!-- grid -->
              <g stroke="#e5e7eb" stroke-width="1">
                <line x1="40" y1="20" x2="580" y2="20" />
                <line x1="40" y1="70" x2="580" y2="70" />
                <line x1="40" y1="120" x2="580" y2="120" />
                <line x1="40" y1="170" x2="580" y2="170" />
              </g>

              <!-- axis -->
              <g stroke="#9ca3af" stroke-width="1">
                <line x1="40" y1="190" x2="580" y2="190" />
                <line x1="40" y1="20" x2="40" y2="190" />
              </g>

              <!-- line -->
              <path
                [attr.d]="linePath(d)"
                fill="none"
                stroke="#0066CC"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>

              <!-- area fill -->
              <path
                [attr.d]="areaPath(d)"
                fill="rgba(0,102,204,0.10)"
                stroke="none"
              ></path>

              <!-- points -->
              <g *ngFor="let p of linePoints(d); let i = index">
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="#0066CC"></circle>
              </g>

              <!-- x labels (cada 2 meses) -->
              <g fill="#6b7280" font-size="10" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial">
                <text
                  *ngFor="let lab of monthLabels(d); let i = index"
                  [attr.x]="lab.x"
                  y="210"
                  text-anchor="middle"
                >{{ lab.label }}</text>
              </g>
            </svg>

            <div class="mt-2 text-xs text-gray-500">
              Últimos 12 meses · Total: <span class="font-semibold text-gray-700">{{ sumMonths(d) }}</span>
            </div>
          </div>

          <ng-template #noMonthData>
            <p class="text-gray-400 text-sm">Aún no hay datos para graficar.</p>
          </ng-template>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-800">PQRS por área responsable</h3>
            <mat-icon class="text-gray-400">donut_large</mat-icon>
          </div>

          <div *ngIf="(d.por_area?.length || 0) > 0; else noAreaData" class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div class="flex justify-center">
              <div
                [style.background]="donutBackground(d)"
                style="width:200px;height:200px;border-radius:9999px;position:relative;">
                <div
                  style="position:absolute;inset:18px;background:#fff;border-radius:9999px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px solid #e5e7eb;">
                  <div class="text-xs text-gray-500">Total</div>
                  <div class="text-2xl font-bold text-gray-800">{{ d.kpis.total }}</div>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div
                *ngFor="let a of areasSorted(d); let i = index"
                class="flex items-center justify-between gap-3 text-sm">
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    [style.background]="areaColor(i)"
                    style="width:10px;height:10px;border-radius:9999px;display:inline-block;flex:0 0 auto;"></span>
                  <span class="font-medium text-gray-800 truncate">{{ a.area_nombre }}</span>
                </div>
                <div class="flex items-center gap-2 text-gray-600 flex:0 0 auto">
                  <span class="tabular-nums">{{ a.cantidad }}</span>
                  <span class="text-gray-400">·</span>
                  <span class="tabular-nums">{{ percent(a.cantidad, d.kpis.total) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <ng-template #noAreaData>
            <p class="text-gray-400 text-sm">Aún no hay PQRS registradas con área.</p>
          </ng-template>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-800">PQRS recientes</h3>
            <a routerLink="/pqrs" class="text-brand text-sm hover:underline">Ver todas</a>
          </div>
          <ul class="divide-y divide-gray-100">
            <li *ngFor="let p of d.recientes" class="py-3 flex items-center justify-between">
              <div>
                <a [routerLink]="['/pqrs', p.id]" class="font-medium text-brand-dark hover:underline">
                  {{ p.radicado }} · {{ p.tipo }}
                </a>
                <div class="text-xs text-gray-500">{{ p.cliente }}</div>
              </div>
              <div class="text-right">
                <span class="badge"
                      [class.badge-open]="p.estado === 'ABIERTA'"
                      [class.badge-progress]="p.estado === 'EN_PROCESO'"
                      [class.badge-closed]="p.estado === 'CERRADA'"
                      [class.badge-rejected]="p.estado === 'RECHAZADA'">
                  {{ p.estado }}
                </span>
                <div class="text-xs text-gray-400 mt-1">
                  {{ p.fecha_creacion | date:'dd/MM/yy HH:mm' }}
                </div>
              </div>
            </li>
            <li *ngIf="!d.recientes.length" class="py-4 text-center text-gray-400 text-sm">
              Sin actividad reciente.
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private svc = inject(PqrsService);
  protected data = signal<DashboardResponse | null>(null);
  protected loading = signal(true);
  protected categoryLoading = signal(false);
  protected fechaInicio = '';
  protected fechaFin = '';

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected onCategoryDateChange(): void {
    this.loadCategoryData();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.svc.dashboard(this.categoryFilters()).subscribe({
      next: (r) => {
        this.data.set(r);
        this.loading.set(false);
        this.categoryLoading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.categoryLoading.set(false);
      },
    });
  }

  private loadCategoryData(): void {
    const current = this.data();
    if (!current) return;

    this.categoryLoading.set(true);
    this.svc.dashboard(this.categoryFilters()).subscribe({
      next: (r) => {
        this.data.set({ ...current, por_categoria_producto: r.por_categoria_producto });
        this.categoryLoading.set(false);
      },
      error: () => this.categoryLoading.set(false),
    });
  }

  private categoryFilters() {
    return {
      fecha_inicio: this.fechaInicio || undefined,
      fecha_fin: this.fechaFin || undefined,
    };
  }

  protected areasSorted(d: DashboardResponse) {
    const list = (d.por_area || []).slice();
    return list.sort((a, b) => (b.cantidad || 0) - (a.cantidad || 0));
  }

  protected categoriasAgrupadas(d: DashboardResponse) {
    const map = new Map<string, { producto: string; cantidad: number }[]>();
    for (const row of d.por_categoria_producto || []) {
      const list = map.get(row.categoria) || [];
      list.push({ producto: row.producto, cantidad: row.cantidad });
      map.set(row.categoria, list);
    }
    return Array.from(map.entries())
      .map(([categoria, productos]) => ({
        categoria,
        productos: productos.sort((a, b) => b.cantidad - a.cantidad),
        total: productos.reduce((s, p) => s + p.cantidad, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }

  protected percent(part: number, total: number): string {
    if (!total) return '0.0';
    return ((part / total) * 100).toFixed(1);
  }

  protected areaColor(i: number): string {
    const palette = [
      '#0066CC', // azul
      '#A37F3E', // dorado
      '#103847', // azul oscuro
      '#DD0A1E', // rojo
      '#53927b', // verde
      '#0a4874', // azul corporativo
      '#cf8f18', // naranja
      '#6ca674', // verde claro
    ];
    return palette[i % palette.length];
  }

  protected donutBackground(d: DashboardResponse): string {
    const total = d.kpis.total || 0;
    const areas = this.areasSorted(d).filter((x) => (x.cantidad || 0) > 0);
    if (!total || !areas.length) return '#e5e7eb';

    let acc = 0;
    const parts = areas.map((a, i) => {
      const start = acc;
      const slice = (a.cantidad / total) * 100;
      acc += slice;
      const end = acc;
      const color = this.areaColor(i);
      return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  protected sumMonths(d: DashboardResponse): number {
    return (d.por_mes || []).reduce((acc, x) => acc + (x.cantidad || 0), 0);
  }

  protected linePoints(d: DashboardResponse) {
    const data = (d.por_mes || []).slice(0, 12);
    const w = 540; // plot width
    const h = 170; // plot height
    const ox = 40; // origin x
    const oy = 190; // origin y (bottom)
    const max = Math.max(1, ...data.map((x) => x.cantidad || 0));
    const step = data.length > 1 ? w / (data.length - 1) : w;
    return data.map((m, i) => {
      const x = ox + i * step;
      const y = oy - ((m.cantidad || 0) / max) * h;
      return { x, y, mes: m.mes, cantidad: m.cantidad || 0 };
    });
  }

  protected linePath(d: DashboardResponse): string {
    const pts = this.linePoints(d);
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  }

  protected areaPath(d: DashboardResponse): string {
    const pts = this.linePoints(d);
    if (!pts.length) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    const baseY = 190;
    const line = this.linePath(d);
    return `${line} L ${last.x.toFixed(2)} ${baseY} L ${first.x.toFixed(2)} ${baseY} Z`;
  }

  protected monthLabels(d: DashboardResponse) {
    const pts = this.linePoints(d);
    return pts
      .filter((_, i) => i % 2 === 0)
      .map((p) => {
        const [, mm] = p.mes.split('-');
        return { x: p.x, label: mm };
      });
  }
}
