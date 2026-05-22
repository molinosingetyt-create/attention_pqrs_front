import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.auth.logout();
          this.router.navigate(['/login']);
          this.snack.open('Tu sesión ha expirado.', 'Cerrar', { duration: 4000 });
        } else if (err.status === 403) {
          this.snack.open('No tienes permisos para esta acción.', 'Cerrar', {
            duration: 4000,
          });
        } else if (err.status >= 500) {
          this.snack.open('Error del servidor. Intenta de nuevo.', 'Cerrar', {
            duration: 4000,
          });
        } else {
          const msg = err.error?.detail || err.message;
          if (msg) {
            this.snack.open(String(msg), 'Cerrar', { duration: 4000 });
          }
        }
        return throwError(() => err);
      })
    );
  }
}
