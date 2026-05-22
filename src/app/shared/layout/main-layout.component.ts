import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="shell" [class.sidebar-open]="sidebarOpen()">
      <!-- Backdrop móvil -->
      <div class="backdrop" (click)="closeSidebar()" *ngIf="isMobile() && sidebarOpen()"></div>

      <!-- Sidebar corporativo -->
      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="brand">
          <span class="brand-logo-frame">
            <img
              src="assets/logo-la-nieve.svg"
              alt="Molinos del Atlántico · La Nieve"
              class="brand-logo"
              width="180"
              height="220"
              decoding="async" />
          </span>
          <div class="brand-text">
            <div class="brand-title">Molinos del Atlántico</div>
            <div class="brand-sub">Gestión PQRS</div>
          </div>
          <button class="close-btn" type="button" (click)="closeSidebar()" aria-label="Cerrar menú">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <nav class="nav">
          <a *ngFor="let item of menu"
             [routerLink]="item.route"
             routerLinkActive="active"
             class="nav-item"
             (click)="onNavItemClick()">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
          <a *ngIf="auth.hasRole('ADMINISTRADOR','CALIDAD')"
             routerLink="/devoluciones"
             routerLinkActive="active"
             class="nav-item"
             (click)="onNavItemClick()">
            <mat-icon>assignment_return</mat-icon>
            <span>Devoluciones</span>
          </a>
          <a *ngIf="auth.hasRole('ADMINISTRADOR')"
             routerLink="/usuarios"
             routerLinkActive="active"
             class="nav-item"
             (click)="onNavItemClick()">
            <mat-icon>group</mat-icon>
            <span>Usuarios</span>
          </a>
          <div *ngIf="auth.hasRole('ADMINISTRADOR')" class="nav-config-block">
            <button
              type="button"
              class="nav-item nav-config-parent"
              [class.active]="configNavActive()"
              (click)="toggleConfigMenu()">
              <mat-icon>tune</mat-icon>
              <span>Configuración</span>
              <mat-icon class="nav-config-chev">{{ cfgMenuOpen() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
            <div class="nav-config-children" *ngIf="cfgMenuOpen()">
              <a
                routerLink="/configuracion/areas"
                routerLinkActive="active"
                class="nav-item nav-config-child"
                (click)="onNavItemClick()">
                <mat-icon>layers</mat-icon>
                <span>Áreas</span>
              </a>
              <a
                routerLink="/configuracion/inconformidades"
                routerLinkActive="active"
                class="nav-item nav-config-child"
                (click)="onNavItemClick()">
                <mat-icon>rule</mat-icon>
                <span>Inconformidades</span>
              </a>
              <a
                routerLink="/configuracion/categorias-producto"
                routerLinkActive="active"
                class="nav-item nav-config-child"
                (click)="onNavItemClick()">
                <mat-icon>category</mat-icon>
                <span>Categorías de producto</span>
              </a>
              <a
                routerLink="/configuracion/productos"
                routerLinkActive="active"
                class="nav-item nav-config-child"
                (click)="onNavItemClick()">
                <mat-icon>inventory_2</mat-icon>
                <span>Productos</span>
              </a>
            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <span class="pill">v1.0</span>
          <span class="year">© {{ year }}</span>
        </div>
      </aside>

      <!-- Contenido principal -->
      <div class="main">
        <header class="topbar">
          <button class="menu-btn" type="button" (click)="toggleSidebar()" aria-label="Abrir menú">
            <mat-icon>menu</mat-icon>
          </button>

          <div class="topbar-title">
            <h1 class="page-title">Gestión de PQRS</h1>
            <p class="page-sub">Peticiones, quejas, reclamos y sugerencias</p>
          </div>

          <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
            <span class="user-btn-content">
              <span class="user-stack">
                <span class="avatar">{{ initials() }}</span>
                <span class="user-info">
                  <span class="user-name">{{ auth.currentUser()?.nombre }}</span>
                  <span class="user-role">{{ auth.currentUser()?.rol }}</span>
                </span>
              </span>
            </span>
            <mat-icon class="chevron">expand_more</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-head">
              <div class="menu-name">{{ auth.currentUser()?.nombre }}</div>
              <div class="menu-mail">{{ auth.currentUser()?.email }}</div>
              <div class="menu-role">{{ auth.currentUser()?.rol }}</div>
            </div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Cerrar sesión</span>
            </button>
          </mat-menu>
        </header>

        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }

      .shell {
        display: flex;
        min-height: 100vh;
        background: var(--em-bg);
        position: relative;
      }

      /* ===== Backdrop móvil ===== */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(16, 56, 71, 0.55);
        backdrop-filter: blur(2px);
        z-index: 30;
        animation: fadeIn 0.15s ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

      /* ===== Sidebar (desktop por defecto) ===== */
      .sidebar {
        width: 260px;
        background: linear-gradient(180deg, #103847 0%, #0066CC 100%);
        color: #FCEDD9;
        display: flex;
        flex-direction: column;
        position: sticky;
        top: 0;
        height: 100vh;
        flex: none;
        z-index: 40;
        transition: transform 0.25s ease;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.1rem 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        position: relative;
      }
      .brand-logo-frame {
        width: 54px;
        aspect-ratio: 4 / 5;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.38rem;
        border-radius: 50% / 42%;
        background: #ffffff;
        border: 1px solid rgba(252, 237, 217, 0.35);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
        flex: none;
      }
      .brand-logo {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      .brand-title {
        font-weight: 700;
        font-size: 0.95rem;
        letter-spacing: -0.01em;
        line-height: 1.1;
      }
      .brand-sub { font-size: 0.75rem; opacity: 0.75; }
      .close-btn {
        display: none;
        background: transparent;
        border: 0;
        color: #FCEDD9;
        padding: 0.35rem;
        border-radius: 8px;
        cursor: pointer;
        margin-left: auto;
      }
      .close-btn:hover { background: rgba(255,255,255,0.08); }

      .nav {
        flex: 1;
        padding: 1rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow-y: auto;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        border-radius: 10px;
        color: rgba(248, 250, 252, 0.82);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 500;
        transition: background 0.15s, color 0.15s;
      }
      .nav-item mat-icon { color: inherit; flex: none; }
      .nav-item:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
      .nav-item.active {
        background: rgba(163, 127, 62, 0.18);
        color: #fff;
        box-shadow: inset 3px 0 0 #A37F3E;
      }

      .nav-config-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav-config-parent {
        width: 100%;
        border: 0;
        background: transparent;
        cursor: pointer;
        text-align: left;
        font: inherit;
      }
      .nav-config-chev {
        margin-left: auto;
        font-size: 1.1rem !important;
        width: 1.1rem !important;
        height: 1.1rem !important;
        opacity: 0.75;
      }
      .nav-config-children {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px 0 4px 0.35rem;
        border-left: 2px solid rgba(255, 255, 255, 0.12);
        margin-left: 0.65rem;
      }
      .nav-config-child {
        font-size: 0.82rem;
        padding: 0.5rem 0.65rem;
        opacity: 0.92;
      }
      .nav-config-child mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .sidebar-footer {
        padding: 0.9rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 0.72rem;
        color: rgba(248, 250, 252, 0.55);
      }
      .pill {
        background: rgba(163, 127, 62, 0.22);
        color: #FFDD00;
        padding: 2px 8px;
        border-radius: 999px;
        font-weight: 600;
      }

      /* ===== Main ===== */
      .main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .topbar {
        min-height: 64px;
        background: linear-gradient(180deg, #103847 0%, #0066CC 100%);
        border-bottom: 1px solid rgba(252, 237, 217, 0.22);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .menu-btn {
        display: none;
        background: transparent;
        border: 0;
        padding: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        color: #FCEDD9;
      }
      .menu-btn:hover { background: rgba(255, 255, 255, 0.1); }
      .topbar-title { flex: 1; min-width: 0; }
      .page-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #FCEDD9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .page-sub {
        margin: 0;
        font-size: 0.78rem;
        color: rgba(252, 237, 217, 0.78);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .user-btn {
        display: flex !important;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 0.35rem 0.75rem !important;
        min-width: 0 !important;
        min-height: 56px;
      }
      .user-btn-content,
      .user-stack {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .user-stack {
        flex-direction: column;
        gap: 0.2rem;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #FCEDD9;
        color: var(--em-brand-navy);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.85rem;
        flex: none;
      }
      .user-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        line-height: 1.15;
        max-width: 140px;
      }
      .user-name {
        font-weight: 600;
        font-size: 0.85rem;
        color: #FCEDD9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 140px;
      }
      .user-role {
        font-size: 0.7rem;
        color: rgba(252, 237, 217, 0.75);
      }
      .menu-head {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--em-border);
      }
      .menu-name { font-weight: 600; font-size: 0.9rem; }
      .menu-mail { font-size: 0.8rem; color: var(--em-text-muted); }
      .menu-role {
        margin-top: 2px;
        font-size: 0.72rem;
        color: var(--em-brand-navy);
        font-weight: 600;
      }

      .content {
        flex: 1;
        width: 100%;
        padding: 1.25rem 1.5rem 2rem;
      }

      /* =================================================================
       * TABLET (≤ 1024px): sidebar colapsa a íconos
       * ================================================================= */
      @media (max-width: 1024px) {
        .sidebar { width: 76px; }
        .brand-text,
        .nav-item span,
        .sidebar-footer .year,
        .nav-config-chev { display: none; }
        .nav-item { justify-content: center; }
        .nav-config-children {
          margin-left: 0;
          padding-left: 0;
          border-left: 0;
        }
        .nav-config-child span {
          display: none;
        }
        .nav-config-child {
          justify-content: center;
        }
        .brand { justify-content: center; padding: 1rem 0.5rem; }
        .content { padding: 1rem 1rem 2rem; }
      }

      /* =================================================================
       * MÓVIL (≤ 768px): sidebar como drawer fijo + hamburguesa
       * ================================================================= */
      @media (max-width: 768px) {
        .menu-btn { display: inline-flex; }
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 270px;
          height: 100dvh;
          transform: translateX(-100%);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
        }
        .sidebar.open { transform: translateX(0); }
        .brand { justify-content: flex-start; padding: 1.1rem 1rem; }
        .brand-text,
        .nav-item span,
        .sidebar-footer .year { display: inline; }
        .nav-item { justify-content: flex-start; }
        .close-btn { display: inline-flex; }
        .content { padding: 1rem 0.85rem 1.75rem; }
        .page-title { font-size: 0.98rem; }
        .page-sub { display: none; }
        .user-info { display: none; }
        .chevron { display: none; }
      }

      /* =================================================================
       * MÓVIL CHICO (≤ 420px)
       * ================================================================= */
      @media (max-width: 420px) {
        .content { padding: 0.85rem 0.75rem 1.5rem; }
        .topbar { padding: 0.4rem 0.6rem; }
        .avatar { width: 34px; height: 34px; }
      }
    `,
  ],
})
export class MainLayoutComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);
  protected year = new Date().getFullYear();

  protected sidebarOpen = signal(false);
  protected isMobile = signal(window.innerWidth <= 768);
  /** Submenú de Configuración en el sidebar principal */
  protected cfgMenuOpen = signal(false);
  private lastNavPath = '';

  protected menu = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'PQRS', icon: 'assignment', route: '/pqrs' },
    { label: 'Clientes', icon: 'people', route: '/clientes' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.isMobile()) this.sidebarOpen.set(false);
        const path = (e as NavigationEnd).urlAfterRedirects.split('?')[0];
        const wasCfg = this.lastNavPath.startsWith('/configuracion');
        const nowCfg = path.startsWith('/configuracion');
        if (!wasCfg && nowCfg) {
          this.cfgMenuOpen.set(true);
        } else if (wasCfg && !nowCfg) {
          this.cfgMenuOpen.set(false);
        }
        this.lastNavPath = path;
      });
  }

  protected configNavActive(): boolean {
    return this.router.url.split('?')[0].startsWith('/configuracion');
  }

  protected toggleConfigMenu(): void {
    const next = !this.cfgMenuOpen();
    this.cfgMenuOpen.set(next);
    if (next && !this.configNavActive()) {
      void this.router.navigate(['/configuracion/areas']);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth <= 768;
    this.isMobile.set(mobile);
    if (!mobile) this.sidebarOpen.set(false);
  }

  toggleSidebar(): void { this.sidebarOpen.update((v) => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }

  onNavItemClick(): void {
    if (this.isMobile()) this.sidebarOpen.set(false);
  }

  initials(): string {
    const n = this.auth.currentUser()?.nombre || '';
    return n
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
