  import { Component, OnInit, inject } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
  import { ProgressSpinnerModule } from 'primeng/progressspinner';
  import { TagModule } from 'primeng/tag';
  import { DividerModule } from 'primeng/divider';
  import { ButtonModule } from 'primeng/button';

  import { BookService } from '../../services/book.service';
  import { EjemplarService } from '../../services/ejemplar.service';
  import { CatalogService } from '../../services/catalog.service';
  import { Libro, Autor } from '../../models/biblioteca';
  import { finalize, forkJoin, map } from 'rxjs';
  import { DialogService } from 'primeng/dynamicdialog';
  import EjemplarFormularioComponent from '../ejemplar-formulario/ejemplar-formulario';

  @Component({
    selector: 'app-libro-detalle',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule, TagModule, DividerModule, ButtonModule],
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
    
    imagenUrl?: string;

    ngOnInit(): void {
      const uuid = this.dialogConfig.data.uuid;
      this.imagenUrl = this.dialogConfig.data.imagenUrl;

      if (uuid) {
        this.loadBookDetails(uuid);
      }
    }

    loadBookDetails(uuid: string): void {
      forkJoin({
        libro: this.bookService.getLibroByUuid(uuid),
        autores: this.bookService.getAutoresForLibro(uuid),
        ejemplares: this.ejemplarService.getEjemplares(),
        estados: this.catalogService.getEstadosEjemplares()
      }).pipe(
        map(({ libro, autores, ejemplares, estados }) => {
          const ejemplaresDelLibro = ejemplares
            .filter(e => e.idLibro === libro.id)
            .map(ejemplar => ({
              ...ejemplar,
              estado: estados.find(est => est.id === ejemplar.idEstadoEjemplar)
            }));
          
          return {
            ...libro,
            imagen: this.imagenUrl,
            autores: autores,
            ejemplares: ejemplaresDelLibro
          };
        }),
        finalize(() => this.loading = false)
      ).subscribe({
        next: (libroCompleto) => this.libro = libroCompleto,
        error: (err) => {
          console.error("Error al cargar detalles del libro:", err);
          this.error = true;
        }
      });
    }

    formatIsbn(isbn: string | undefined): string {
    if (!isbn || isbn.length !== 13) {
      return isbn || 'N/A';
    }
    return [
      isbn.slice(0, 3),
      isbn.slice(3, 6),
      isbn.slice(6, 9),
      isbn.slice(9, 12),
      isbn.slice(12, 13)
    ].join('-');
   }

    getAutoresAsString(autores?: Autor[]): string {
      if (!autores || autores.length === 0) {
        return 'Autor desconocido';
      }
      return autores.map(a => `${a.nombre} ${a.apPaterno}`).join(', ');
    }

    getStatusClass(estadoNombre?: string): string {
      if (!estadoNombre) return 'unknown';
      switch (estadoNombre.toLowerCase()) {
        case 'disponible': return 'available';
        case 'prestado': return 'borrowed';
        case 'en reparación': return 'repair';
        default: return 'unknown';
      }
    }

    cerrarModal(): void {
      this.dialogRef.close();
    }

}