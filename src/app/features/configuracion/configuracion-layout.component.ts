import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-configuracion-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="max-w-5xl mx-auto">
      <router-outlet />
    </div>
  `,
})
export class ConfiguracionLayoutComponent {}
