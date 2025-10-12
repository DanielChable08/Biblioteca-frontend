import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { BookService } from '../../services/book.service';
import { CatalogService } from '../../services/catalog.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { Libro, Catalogo, Autor, Ejemplar } from '../../models/biblioteca';
import { finalize, forkJoin, map, switchMap, of } from 'rxjs';
import LibroFormularioComponent from '../libro-formulario/libro-formulario';
import EjemplarFormularioComponent from '../ejemplar-formulario/ejemplar-formulario';
import { Router } from '@angular/router';  

import LibroDetalleComponent from '../libro-detalle/libro-detalle'; 
type CategoriaKey = 'Todas' | string;

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DynamicDialogModule
  ],
  templateUrl: './bibliotecario.html',
  styleUrls: ['./bibliotecario.css']
})
export default class BibliotecarioComponent implements OnInit {
  private bookService = inject(BookService);
  private catalogService = inject(CatalogService);
  private ejemplarService = inject(EjemplarService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router); 

  libros: Libro[] = [];
  allLibros: Libro[] = []; 
  categorias: Catalogo[] = [];
  
  categoriaSeleccionada: CategoriaKey = 'Todas';
  terminoBusqueda = '';
  loading = true;
  dropdownOpen = false;

  contadoresCategoria: { [key: string]: number } = {};

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    
    forkJoin({
      libros: this.bookService.getLibros(),
      categorias: this.catalogService.getCategorias(),
      ejemplares: this.ejemplarService.getEjemplares(),
      estados: this.catalogService.getEstadosEjemplares()
    }).pipe(
      switchMap(({ libros, categorias, ejemplares, estados }) => {
        if (libros.length === 0) {
          return of({ libros: [], categorias });
        }
        
        const autorRequests = libros.map(libro => 
          this.bookService.getAutoresForLibro(libro.uuid)
        );

        return forkJoin(autorRequests).pipe(
          map(autoresArray => {
            const librosCompletos = libros.map((libro, index) => {
              const categoriaDelLibro = categorias.find(cat => cat.id === libro.idCategoria);
              const ejemplaresDelLibro = ejemplares
                .filter(e => e.idLibro === libro.id)
                .map(ejemplar => {
                  const estadoDelEjemplar = estados.find(est => est.id === ejemplar.idEstadoEjemplar);
                  return { ...ejemplar, estado: estadoDelEjemplar };
                });
              
              return {
                ...libro,
                categoria: categoriaDelLibro,
                autores: autoresArray[index],
                ejemplares: ejemplaresDelLibro
              };
            });
            return { libros: librosCompletos, categorias };
          })
        );
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ libros, categorias }) => {
        this.allLibros = libros;
        this.categorias = categorias;
        this.actualizarContadores();
        this.filtrarLibros();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos.' });
      }
    });
  }


  

  agregarLibro(): void {

    this.router.navigate(['/admin/libros/nuevo']);
  }
  
  filtrarLibros(): void {
    let resultado = this.allLibros;

    if (this.categoriaSeleccionada !== 'Todas') {
      resultado = resultado.filter(libro => libro.categoria?.nombre === this.categoriaSeleccionada);
    }
    
    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(libro => 
        libro.titulo.toLowerCase().includes(termino) ||
        this.getAutoresAsString(libro.autores).toLowerCase().includes(termino) ||
        libro.isbn.toLowerCase().includes(termino)
      );
    }
    this.libros = resultado;
  }
  
  getAutoresAsString(autores?: Autor[]): string {
    if (!autores || autores.length === 0) {
      return 'Autor no asignado';
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

EjemplaresPrestados(): number {
  if (!this.libros) return 0;
  return this.libros.reduce((total, libro) => {
    const prestados = libro.ejemplares?.filter(
      (e: any) => e.estado?.nombre?.toLowerCase() === 'prestado'
    ).length || 0;
    return total + prestados;
  }, 0);
}

EjemplaresDisponibles(): number {
  if (!this.libros) return 0;
  return this.libros.reduce((total, libro) => {
    const disponibles = libro.ejemplares?.filter(
      (e: any) => e.estado?.nombre?.toLowerCase() === 'disponible'
    ).length || 0;
    return total + disponibles;
  }, 0);
}

EjemplaresReparacion(): number {
  if (!this.libros) return 0;
  return this.libros.reduce((total, libro) => {
    const reparacion = libro.ejemplares?.filter(
      (e: any) => e.estado?.nombre?.toLowerCase() === 'en reparación'
    ).length || 0;
    return total + reparacion;
  }, 0);
}


  private actualizarContadores(): void {
    const contadores: { [key: string]: number } = {};
    this.categorias.forEach(cat => {
      contadores[cat.nombre] = this.allLibros.filter(libro => libro.categoria?.id === cat.id).length;
    });
    this.contadoresCategoria = contadores;
  }

  buscar(): void { this.filtrarLibros(); }
  filtrarCategoria(categoria: CategoriaKey): void { this.categoriaSeleccionada = categoria; this.filtrarLibros(); }
  toggleDropdown(): void { this.dropdownOpen = !this.dropdownOpen; }
  selectCategoria(categoria: CategoriaKey): void { this.categoriaSeleccionada = categoria; this.dropdownOpen = false; this.filtrarLibros(); }
  getDropdownText(): string { return this.categoriaSeleccionada === 'Todas' ? 'Todas las categorías' : this.categoriaSeleccionada; }
  esCategoriaActiva(categoria: CategoriaKey): boolean { return this.categoriaSeleccionada === categoria; }
  
  editarLibro(libro: Libro): void { this.messageService.add({ severity: 'info', summary: 'Próximamente', detail: 'La edición de libros se implementará a continuación.' }); }
  

  verLibro(libro: Libro): void {
    this.dialogService.open(LibroDetalleComponent, {
      header: 'Detalles del Libro',
      width: '65%',
      contentStyle: { "max-height": "90vh", "overflow": "auto" },
      baseZIndex: 10000,
      data: {
        uuid: libro.uuid,
        imagenUrl: libro.imagen
      }
    });
  }

  abrirModalAgregarEjemplar(libro : Libro): void {
      const ref = this.dialogService.open(EjemplarFormularioComponent, {
        header: `Agregar Ejemplar para: ${libro.titulo}`,
        width: '600px',
        data: {
          idLibro: libro.id
        }
      });

      ref.onClose.subscribe((ejemplarAgregado) => {
        if (ejemplarAgregado) {
          this.loadInitialData();
        }
      });
  }

  eliminarLibro(libro: Libro): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el libro "${libro.titulo}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle' ,
      accept: () => {
        this.loading = true;
        this.bookService.deleteLibro(libro.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Libro eliminado.' });
            this.allLibros = this.allLibros.filter(l => l.id !== libro.id);
            this.filtrarLibros();
            this.actualizarContadores();
          },
          error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el libro.' })
        });
      }
    });
  }
}