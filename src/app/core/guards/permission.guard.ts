import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermisoCodigo } from '../permissions';

/** Exige al menos uno de los permisos indicados (según matriz del backend). */
export const permissionGuard = (permisos: PermisoCodigo[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.canAny(...permisos)) return true;
  router.navigate(['/dashboard']);
  return false;
};
