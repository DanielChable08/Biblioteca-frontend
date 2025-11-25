import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MenuModule } from 'primeng/menu';
import { Router } from '@angular/router';
import { finalize, forkJoin, map, switchMap, of } from 'rxjs';

import { BookService } from '../../services/book.service';
import { CatalogService } from '../../services/catalog.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { AuthService } from '../../services/auth.service';
import { Libro, Catalogo, Autor, Ejemplar } from '../../models/biblioteca';

import LibroFormularioComponent from '../libro-formulario/libro-formulario';
import EjemplarFormularioComponent from '../ejemplar-formulario/ejemplar-formulario';
import LibroDetalleComponent from '../libro-detalle/libro-detalle';

type CategoriaKey = 'Todas' | string;

@Component({
  selector: 'app-bibliotecario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule,
    ConfirmPopupModule,
    ConfirmDialogModule,
    DynamicDialogModule,
    DividerModule,
    ChipModule,
    DialogModule,
    SelectModule,
    MenuModule,
  ],
  providers: [DialogService, ConfirmationService, MessageService],
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
  private authService = inject(AuthService);

  libros: Libro[] = [];
  allLibros: Libro[] = [];
  categorias: Catalogo[] = [];

  categoriaSeleccionada: CategoriaKey = 'Todas';
  terminoBusqueda = '';
  loading = true;
  dropdownOpen = false;

  contadoresCategoria: { [key: string]: number } = {};
  catalogMenuItems: MenuItem[] = [];

  currentFullName: string = '';
  currentUserRole: string = '';
  currentUserInitials: string = '';

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadInitialData();

    this.catalogMenuItems = [
      { label: 'Gestionar Catálogos', styleClass: 'menu-header' },
      { separator: true },
      { label: 'Autores', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/admin/autores']) },
      { label: 'Categorías', icon: 'pi pi-tags', command: () => this.router.navigate(['/admin/categorias']) },
      { label: 'Editoriales', icon: 'pi pi-building', command: () => this.router.navigate(['/admin/editoriales']) },
      { label: 'Idiomas', icon: 'pi pi-globe', command: () => this.router.navigate(['/admin/idiomas']) },
      { label: 'Tipos de Libros', icon: 'pi pi-book', command: () => this.router.navigate(['/admin/tipos']) },
      { separator: true },
      { label: 'Estados de Ejemplar', icon: 'pi pi-check-circle', command: () => this.router.navigate(['/admin/estados']) },
      { label: 'Condición Física', icon: 'pi pi-clipboard', command: () => this.router.navigate(['/admin/condiciones']) },
      { separator: true },
      { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', styleClass: 'logout-menu-item', command: () => this.logout() },
    ];
  }

  loadUserInfo(): void {
    this.currentFullName = this.authService.getFullName();
    this.currentUserRole = this.authService.getRoleName();
    this.currentUserInitials = this.authService.getUserInitials();
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
      error: (err: any) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los datos.' 
        });
      }
    });
  }

  // ========== MÉTODOS DE CONTEO POR LIBRO ==========
  getEjemplaresDisponibles(libro: Libro): number {
    return libro.ejemplares?.filter(
      e => e.estado?.nombre?.toLowerCase() === 'disponible'
    ).length || 0;
  }

  getEjemplaresPrestados(libro: Libro): number {
    return libro.ejemplares?.filter(
      e => e.estado?.nombre?.toLowerCase() === 'prestado'
    ).length || 0;
  }

  getEjemplaresReparacion(libro: Libro): number {
    return libro.ejemplares?.filter(
      e => e.estado?.nombre?.toLowerCase() === 'en reparación'
    ).length || 0;
  }

  // ========== TOTALES GENERALES ==========
  getTotalEjemplaresDisponibles(): number {
    return this.allLibros.reduce((total, libro) => 
      total + this.getEjemplaresDisponibles(libro), 0
    );
  }

  getTotalEjemplaresPrestados(): number {
    return this.allLibros.reduce((total, libro) => 
      total + this.getEjemplaresPrestados(libro), 0
    );
  }

  getTotalEjemplaresReparacion(): number {
    return this.allLibros.reduce((total, libro) => 
      total + this.getEjemplaresReparacion(libro), 0
    );
  }

  // ========== NAVEGACIÓN ==========
  agregarLibro(): void {
    this.router.navigate(['/admin/libros/nuevo']);
  }

  UsuariosList(): void {
    this.router.navigate(['/admin/usuarios']);
  }
 
  PrestamosList(): void {
    this.router.navigate(['/admin/prestamos']);
  }

  logout(): void {
    this.authService.logout();
  }

  // ========== FILTROS Y BÚSQUEDA ==========
  filtrarLibros(): void {
    let resultado = this.allLibros;

    if (this.categoriaSeleccionada !== 'Todas') {
      resultado = resultado.filter(libro => 
        libro.categoria?.nombre === this.categoriaSeleccionada
      );
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

  buscar(): void { 
    this.filtrarLibros(); 
  }

  filtrarCategoria(categoria: CategoriaKey): void { 
    this.categoriaSeleccionada = categoria; 
    this.filtrarLibros(); 
  }

  toggleDropdown(): void { 
    this.dropdownOpen = !this.dropdownOpen; 
  }

  selectCategoria(categoria: CategoriaKey): void { 
    this.categoriaSeleccionada = categoria; 
    this.dropdownOpen = false; 
    this.filtrarLibros(); 
  }

  getDropdownText(): string { 
    return this.categoriaSeleccionada === 'Todas' 
      ? 'Todas las categorías' 
      : this.categoriaSeleccionada; 
  }

  esCategoriaActiva(categoria: CategoriaKey): boolean { 
    return this.categoriaSeleccionada === categoria; 
  }

  // ========== UTILIDADES ==========
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
      return 'Autor no asignado';
    }
    return autores.map(a => `${a.nombre} ${a.apPaterno}`).join(', ');
  }

  private actualizarContadores(): void {
    const contadores: { [key: string]: number } = {};
    this.categorias.forEach(cat => {
      contadores[cat.nombre] = this.allLibros.filter(
        libro => libro.categoria?.id === cat.id
      ).length;
    });
    this.contadoresCategoria = contadores;
  }

  // ========== ACCIONES DE LIBROS ==========
  editarLibro(libro: Libro): void {
    this.router.navigate(['/admin/libros/editar', libro.uuid]);
  }

  verLibro(libro: Libro): void {
    this.dialogService.open(LibroDetalleComponent, {
      header: 'Detalles de ' + libro.titulo,
      width: '75%',
      contentStyle: { "max-height": "90vh", "overflow": "auto" },
      baseZIndex: 10000,
      data: {
        uuid: libro.uuid,
        imagenUrl: libro.imagen
      },
      modal: true,
      closable: true,
    });
  }

  abrirModalAgregarEjemplar(libro: Libro): void {
    const ref = this.dialogService.open(EjemplarFormularioComponent, {
      header: `Agregar Ejemplar para: ${libro.titulo}`,
      width: '600px',
      data: {
        idLibro: libro.id
      },
      modal: true,
      closable: true,
      focusOnShow: false,
    });

    ref.onClose.subscribe((ejemplarAgregado) => {
      if (ejemplarAgregado) {
        this.loadInitialData();
      }
    });
  }

  eliminarLibro(libro: Libro): void {
    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: `¿Está seguro de eliminar el libro "${libro.titulo}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle text red',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'btn-danger',
      rejectButtonStyleClass: 'btn-info text',
      accept: () => {
        this.loading = true;
        this.bookService.deleteLibro(libro.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Libro eliminado.' 
            });
            this.allLibros = this.allLibros.filter(l => l.id !== libro.id);
            this.filtrarLibros();
            this.actualizarContadores();
          },
          error: (err: any) => this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudo eliminar el libro.' 
          })
        });
      }
    });
  }
}
