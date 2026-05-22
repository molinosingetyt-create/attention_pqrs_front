import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models/api.models';

export const roleGuard = (roles: Rol[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole(...roles)) return true;
  router.navigate(['/dashboard']);
  return false;
};
