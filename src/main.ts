import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// Preset personalizado con tu paleta BEIGE/DORADO
const BibliotecaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#FFF8E7',      // Beige muy claro
      100: '#FFF0D1',     // Beige claro
      200: '#FFEEC4',     // Beige
      300: '#EDD9A3',     // Tu beige principal ✨
      400: '#DEC062',     // Beige dorado
      500: '#D4AF37',     // Tu DORADO principal ⭐
      600: '#C4A131',     // Dorado oscuro
      700: '#B8941F',     // Dorado más oscuro
      800: '#9A7A1A',     // Dorado profundo
      900: '#7D6214',     // Dorado muy oscuro
      950: '#604A0F'      // Casi marrón dorado
    }
  }
});

bootstrapApplication(App, {
  providers: [
    ...(appConfig?.providers || []),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: BibliotecaPreset,
        options: {
          prefix: 'p',
          darkModeSelector: false,
          cssLayer: false
        }
      }
    })
  ]
}).catch(err => console.error(err));
