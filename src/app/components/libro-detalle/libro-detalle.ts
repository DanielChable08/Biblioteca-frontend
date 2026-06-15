import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message'; // Agrega esto si quieres mensajes bonitos

import { BookService } from '../../services/book.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { CatalogService } from '../../services/catalog.service';
import { Libro, Autor, LibroListado, VerLibro } from '../../models/biblioteca';
import { finalize, forkJoin, map, catchError, of, switchMap } from 'rxjs';
import { SecureImagePipe } from '../../pipes/secure-image.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-libro-detalle',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, TagModule, DividerModule, ButtonModule, SecureImagePipe, MessageModule],
  templateUrl: './libro-detalle.html',
  styleUrls: ['./libro-detalle.css']
})
export default class LibroDetalleComponent implements OnInit {
  private dialogConfig = inject(DynamicDialogConfig);
  private dialogRef = inject(DynamicDialogRef);
  private bookService = inject(BookService);
  private readonly IMAGES_BASE_URL = environment.plainURL + '/assets/img/';

  libro: LibroListado | VerLibro | null = null;
  loading = true;
  error = false;
  mensajeError = '';
  imagenUrl?: string;

  ngOnInit(): void {
    const uuid = this.dialogConfig.data.uuid;
    this.imagenUrl = this.dialogConfig.data.imagenUrl;
    const estaActivo = this.dialogConfig.data.estaActivo;
    const libroData = this.dialogConfig.data.libroListado || null;

    if (uuid) {
      this.loadBookDetails(uuid, estaActivo, libroData);
    }
  }

  loadBookDetails(uuid: string, estaActivo: boolean, libroListado?: LibroListado): void {
    this.loading = true;
    this.error = false;

    if (libroListado) {
      let imagenCompleta = libroListado.imagen;

      if (imagenCompleta && !imagenCompleta.startsWith('http')) {
        imagenCompleta = `${this.IMAGES_BASE_URL}${imagenCompleta}`;
      }

      this.libro = {
        ...libroListado,
        imagen: imagenCompleta,
      } as any;

      this.loading = false;
      return;
    }
    const usarRutaDesactivado = estaActivo === false;
    const peticionLibro$ = usarRutaDesactivado ? this.bookService.verLibroDesactivadoPorUuid(uuid) : this.bookService.verLibroPorUuid(uuid);

    peticionLibro$
      .pipe(
        map((libro: VerLibro) => {
          let imagenCompleta = libro.imagen;

          if (imagenCompleta && !imagenCompleta.startsWith('http')) {
            imagenCompleta = `${this.IMAGES_BASE_URL}${imagenCompleta}`;
          }

          return {
            ...libro,
            imagen: imagenCompleta,
          };
        }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (libroCompleto: any) => {
          this.libro = libroCompleto;
          this.error = false;
        },
        error: (err: any) => {
          console.error(err);
          this.error = true;

          if (err.status === 403) {
            this.mensajeError = 'No tienes permisos para ver detalles de libros desactivados.';
          }
        }
      });
  }

  formatIsbn(isbn: string | undefined): string {
    if (!isbn) return 'Sin ISBN';
    const limpio = isbn.replace(/[^0-9X]/gi, '');
    if (limpio.length === 10) return `${limpio.substring(0, 1)}-${limpio.substring(1, 4)}-${limpio.substring(4, 9)}-${limpio.substring(9, 10)}`;
    if (limpio.length === 13) return `${limpio.substring(0, 3)}-${limpio.substring(3, 4)}-${limpio.substring(4, 8)}-${limpio.substring(8, 12)}-${limpio.substring(12, 13)}`;
    return isbn;
  }

  getStatusClass(estadoNombre?: string): string {
    if (!estadoNombre) return 'unknown';
    const nombre = estadoNombre.toLowerCase();
    if (nombre.includes('disponible')) return 'available';
    if (nombre.includes('prestado')) return 'borrowed';
    if (nombre.includes('reparación')) return 'repair';
    return 'unknown';
  }

  getStringListAsString(entidad: string, stringList?: string[]): string {
    if (!stringList || stringList.length === 0) {
      switch (entidad) {
        case 'autores':
          return 'Autor no asignado';
        case 'areas':
          return 'Sin áreas';

        default:
          return 'Sin datos';
      }
    }
    return stringList.map(sL => `${sL}`).join(', ');
  }

  cerrarModal(): void {
    this.dialogRef.close();
  }
}