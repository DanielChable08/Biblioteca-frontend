import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { BookService } from '../../services/book.service';

@Component({
  selector: 'app-descargas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    CheckboxModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    SelectButtonModule,
    DialogModule,
    DividerModule
  ],
  templateUrl: './descargas.html',
  styleUrl: './descargas.css'
})
export class DescargasComponent {
  private bookService = inject(BookService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  modoDescarga: 'libros' | 'ejemplares' = 'libros';

  opcionesModo = [
    { label: 'Libros', value: 'libros', icon: 'pi pi-barcode' },
    { label: 'Ejemplares / Copias físicas', value: 'ejemplares', icon: 'pi pi-bookmark' },
  ];

  camposOpcionales = [
    { label: 'ISBN', value: 'isbn', checked: false },
    { label: 'Año', value: 'anho', checked: false },
    { label: 'Resumen', value: 'resumen', checked: false },
    { label: 'Edición', value: 'edicion', checked: false },
    { label: 'Pasta', value: 'pasta', checked: false },
    { label: 'Páginas', value: 'paginas', checked: false },
    { label: 'Facultad', value: 'tipoLibro', checked: false },
    { label: 'Editorial', value: 'editorial', checked: false },
    { label: 'Idioma', value: 'idioma', checked: false },
    { label: 'Procedencia', value: 'procedencia', checked: false },
    { label: 'Áreas', value: 'areas', checked: false },
  ];

  tiposArchivo = [
    { label: 'Excel', value: 'excel' },
  ];

  tipoArchivoSeleccionado = null;
  mostrarOpcionesExport = false;
  todosSeleccionados = false;

  loading = false;

  exportarExcel(): void {
    this.loading = true;

    // Campos opcionales seleccionados
    const campos = this.camposOpcionales
      .filter(c => c.checked)
      .map(c => c.value);

    if (this.tipoArchivoSeleccionado === 'excel') {
      if (this.modoDescarga === 'libros') {
        this.bookService.exportarLibrosExcel(campos).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'libros.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);

            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Listado exportado exitosamente.'
            });
          },
          error: (err) => {
            let errorDetail = 'No se pudo exportar el listado.';
            let errorSummary = 'Error';

            if (err.status === 400) {
              if (err.error && typeof err.error === 'object') {
                const errores = Object.values(err.error).join(' ');
                errorDetail = errores;
              }
              errorSummary = 'Conflicto';
            } else if (err.status === 409) {
              errorSummary = 'Conflicto';
              errorDetail = err.error.error;
            }

            this.messageService?.add({
              severity: 'error',
              summary: errorSummary,
              detail: errorDetail
            });
          },
          complete: () => {
            this.loading = false;
            this.mostrarOpcionesExport = false;
          }
        });
      } else if (this.modoDescarga === 'ejemplares') {
        this.bookService.exportarEjemplaresExcel(campos).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ejemplares.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);

            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Listado exportado exitosamente.'
            });
          },
          error: (err) => {
            let errorDetail = 'No se pudo exportar el listado.';
            let errorSummary = 'Error';

            if (err.status === 400) {
              if (err.error && typeof err.error === 'object') {
                const errores = Object.values(err.error).join(' ');
                errorDetail = errores;
              }
              errorSummary = 'Conflicto';
            } else if (err.status === 409) {
              errorSummary = 'Conflicto';
              errorDetail = err.error.error;
            }

            this.messageService?.add({
              severity: 'error',
              summary: errorSummary,
              detail: errorDetail
            });
          },
          complete: () => {
            this.loading = false;
            this.mostrarOpcionesExport = false;
          }
        });
      }
    } else {
      let errorDetail = 'No se pudo exportar el listado.';
      let errorSummary = 'Error';

      this.messageService?.add({
        severity: 'error',
        summary: errorSummary,
        detail: errorDetail
      });
      this.loading = false;
      this.mostrarOpcionesExport = false;
    }
  }

  toggleTodos(): void {
    this.camposOpcionales.forEach(c => c.checked = this.todosSeleccionados);
  }

  // Para que el "Seleccionar todos" se actualice si se marca/desmarca uno por uno
  onCampoChange(): void {
    this.todosSeleccionados = this.camposOpcionales.every(c => c.checked);
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }
}
