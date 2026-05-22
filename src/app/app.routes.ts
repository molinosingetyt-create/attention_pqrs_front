import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes-list.component').then(
            (m) => m.ClientesListComponent
          ),
      },
      {
        path: 'clientes/nuevo',
        loadComponent: () =>
          import('./features/clientes/cliente-form.component').then(
            (m) => m.ClienteFormComponent
          ),
      },
      {
        path: 'clientes/:id/editar',
        loadComponent: () =>
          import('./features/clientes/cliente-form.component').then(
            (m) => m.ClienteFormComponent
          ),
      },
      {
        path: 'pqrs',
        loadComponent: () =>
          import('./features/pqrs/pqrs-list.component').then(
            (m) => m.PqrsListComponent
          ),
      },
      {
        path: 'pqrs/nuevo',
        loadComponent: () =>
          import('./features/pqrs/pqrs-form.component').then(
            (m) => m.PqrsFormComponent
          ),
      },
      {
        path: 'pqrs/:id',
        loadComponent: () =>
          import('./features/pqrs/pqrs-detail.component').then(
            (m) => m.PqrsDetailComponent
          ),
      },
      {
        path: 'devoluciones',
        canActivate: [roleGuard(['ADMINISTRADOR', 'CALIDAD'])],
        loadComponent: () =>
          import('./features/devoluciones/devoluciones-list.component').then(
            (m) => m.DevolucionesListComponent
          ),
      },
      {
        path: 'devoluciones/:id',
        canActivate: [roleGuard(['ADMINISTRADOR', 'CALIDAD'])],
        loadComponent: () =>
          import('./features/devoluciones/devolucion-registro.component').then(
            (m) => m.DevolucionRegistroComponent
          ),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list.component').then(
            (m) => m.UsuariosListComponent
          ),
      },
      {
        path: 'configuracion',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadComponent: () =>
          import('./features/configuracion/configuracion-layout.component').then(
            (m) => m.ConfiguracionLayoutComponent
          ),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'areas' },
          {
            path: 'areas',
            loadComponent: () =>
              import('./features/configuracion/configuracion-areas.component').then(
                (m) => m.ConfiguracionAreasComponent
              ),
          },
          {
            path: 'inconformidades',
            loadComponent: () =>
              import('./features/configuracion/configuracion-inconformidades.component').then(
                (m) => m.ConfiguracionInconformidadesComponent
              ),
          },
          {
            path: 'categorias-producto',
            loadComponent: () =>
              import('./features/configuracion/configuracion-categorias-producto.component').then(
                (m) => m.ConfiguracionCategoriasProductoComponent
              ),
          },
          {
            path: 'productos',
            loadComponent: () =>
              import('./features/configuracion/configuracion-productos-catalogo.component').then(
                (m) => m.ConfiguracionProductosCatalogoComponent
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
