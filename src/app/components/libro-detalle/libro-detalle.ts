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
import { Libro, Autor } from '../../models/biblioteca';
import { finalize, forkJoin, map, catchError, of, switchMap } from 'rxjs';
import { SecureImagePipe } from '../../pipes/secure-image.pipe';

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
  private ejemplarService = inject(EjemplarService);
  private catalogService = inject(CatalogService);

  libro: Libro | null = null;
  loading = true;
  error = false;
  mensajeError = ''; 
  imagenUrl?: string;

  ngOnInit(): void {
    const uuid = this.dialogConfig.data.uuid;
    this.imagenUrl = this.dialogConfig.data.imagenUrl;
    const estaActivo = this.dialogConfig.data.estaActivo; 

    if (uuid) {
      this.loadBookDetails(uuid, estaActivo);
    }
  }

  loadBookDetails(uuid: string, estaActivo: boolean): void {

    const usarRutaDesactivado = estaActivo === false;

    const peticionLibro$ = usarRutaDesactivado 
        ? this.bookService.getLibroDesactivadoByUuid(uuid) 
        : this.bookService.getLibroByUuid(uuid);

    peticionLibro$.pipe(
      catchError((err: any) => {
        console.error("Fallo al obtener el libro base", err);
        
        if (err.status === 403) {
            this.mensajeError = 'No tienes permisos (ELIMINAR_LIBRO) para ver detalles de libros desactivados.';
        } else if (err.status === 404 && !usarRutaDesactivado) {
            return this.bookService.getLibroDesactivadoByUuid(uuid);
        }
        
        this.error = true;
        this.loading = false;
        throw err; 
      }),
      switchMap((libroObtenido: Libro) => {
        return forkJoin({
          libro: of(libroObtenido),
          autores: this.bookService.getAutoresForLibro(uuid).pipe(catchError(() => of([]))),
          ejemplares: this.ejemplarService.getEjemplares().pipe(catchError(() => of([]))),
          estados: this.catalogService.getEstadosEjemplares().pipe(catchError(() => of([])))
        });
      }),
      map(({ libro, autores, ejemplares, estados }) => {
        const ejemplaresDelLibro = ejemplares
          .filter((e: any) => e.idLibro === libro.id)
          .map((ejemplar: any) => ({
            ...ejemplar,
            estado: estados.find((est: any) => est.id === ejemplar.idEstadoEjemplar)
          }));
        
        return {
          ...libro,
          imagen: this.imagenUrl || libro.imagen,
          autores: autores,
          ejemplares: ejemplaresDelLibro
        };
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (libroCompleto: any) => {
        this.libro = libroCompleto;
        this.error = false;
      },
      error: (err: any) => {
        this.error = true;
      }
    });
  }

  formatIsbn(isbn: string | undefined): string {
    if (!isbn || isbn.length !== 13) return isbn || 'N/A';
    return [isbn.slice(0, 3), isbn.slice(3, 6), isbn.slice(6, 9), isbn.slice(9, 12), isbn.slice(12, 13)].join('-');
  }

  getAutoresAsString(autores?: Autor[]): string {
    if (!autores || autores.length === 0) return 'Autor desconocido';
    return autores.map(a => `${a.nombre} ${a.apPaterno || ''}`).join(', ');
  }

  getStatusClass(estadoNombre?: string): string {
    if (!estadoNombre) return 'unknown';
    const nombre = estadoNombre.toLowerCase();
    if (nombre.includes('disponible')) return 'available';
    if (nombre.includes('prestado')) return 'borrowed';
    if (nombre.includes('reparación')) return 'repair';
    return 'unknown';
  }

  cerrarModal(): void {
    this.dialogRef.close();
  }
}