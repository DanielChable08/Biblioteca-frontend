import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast'; // 1. Importar ToastModule

@Component({
  selector: 'app-root',
  standalone: true, // <- Importante: es standalone
  imports: [
    RouterOutlet,
    ToastModule // 2. Añadirlo aquí
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('biblioteca-frontend');
}