import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, map, switchMap, of } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { MessageService, MenuItem } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { MenuModule } from 'primeng/menu';

import { BookService } from '../../services/book.service';
import { CatalogService } from '../../services/catalog.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { AuthService } from '../../services/auth.service';
import { SecureImagePipe } from '../../pipes/secure-image.pipe';
import { Libro, Catalogo, Autor } from '../../models/biblioteca';
import { environment } from '../../../environments/enviroment';

import LibroDetalleComponent from '../libro-detalle/libro-detalle';

type CategoriaKey = 'Todas' | string;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule,
    DynamicDialogModule,
    DividerModule,
    ChipModule,
    MenuModule,
    SecureImagePipe
  ],
  providers: [DialogService, MessageService],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export default class DashboardComponent implements OnInit, OnDestroy {
  private bookService = inject(BookService);
  private catalogService = inject(CatalogService);
  private ejemplarService = inject(EjemplarService);
  private dialogService = inject(DialogService);
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

  mostrarStats = true;

  private readonly IMAGES_BASE_URL = environment.plainURL + '/assets/img/';

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadInitialData();
    this.setupCatalogMenu();
  }

  ngOnDestroy(): void {}

  setupCatalogMenu(): void {
    this.catalogMenuItems = [
      { separator: true },
      { 
        label: 'Cerrar Sesión', 
        icon: 'pi pi-sign-out', 
        styleClass: 'logout-menu-item', 
        command: () => this.logout() 
      }
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
              
              let imagenCorregida = libro.imagen;
              if (libro.imagen && !libro.imagen.startsWith('http')) {
                  imagenCorregida = `${this.IMAGES_BASE_URL}${libro.imagen}`;
              }

              const categoriaDelLibro = categorias.find(cat => cat.id === libro.idCategoria);
              const ejemplaresDelLibro = ejemplares
                .filter(e => e.idLibro === libro.id)
                .map(ejemplar => {
                  const estadoDelEjemplar = estados.find(est => est.id === ejemplar.idEstadoEjemplar);
                  return { ...ejemplar, estado: estadoDelEjemplar };
                });

              return {
                ...libro,
                imagen: imagenCorregida,
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

  getEstadoPrincipal(libro: Libro): { estado: string; cantidad: number; clase: string; icono: string } {
    const disponibles = this.getEjemplaresDisponibles(libro);
    const prestados = this.getEjemplaresPrestados(libro);
    const reparacion = this.getEjemplaresReparacion(libro);
    const total = libro.ejemplares?.length || 0;

    if (total === 0) {
      return { estado: 'Sin ejemplares', cantidad: 0, clase: 'unavailable', icono: 'pi-times-circle' };
    }

    if (disponibles > 0) {
      return { estado: 'Disponible', cantidad: disponibles, clase: 'available', icono: 'pi-check-circle' };
    }

    if (prestados > 0) {
      return { estado: 'No disponible', cantidad: prestados, clase: 'unavailable', icono: 'pi-times-circle' };
    }

    if (reparacion > 0) {
      return { estado: 'En reparación', cantidad: reparacion, clase: 'repair', icono: 'pi-wrench' };
    }

    return { estado: 'No disponible', cantidad: 0, clase: 'unavailable', icono: 'pi-times-circle' };
  }

  getTooltipEstados(libro: Libro): string {
    const disponibles = this.getEjemplaresDisponibles(libro);
    const prestados = this.getEjemplaresPrestados(libro);
    const reparacion = this.getEjemplaresReparacion(libro);
    const total = libro.ejemplares?.length || 0;

    if (total === 0) {
      return 'Sin ejemplares';
    }

    let html = '<div style="text-align: left; font-size: 13px;">';
    html += '<strong style="display: block; margin-bottom: 8px; color: #D4AF37;">Desglose de ejemplares</strong>';
    
    if (disponibles > 0) {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
          <i class="pi pi-check-circle" style="color: #27ae60; font-size: 14px;"></i>
          <span style="flex: 1;">Disponibles:</span>
          <strong>${disponibles}</strong>
        </div>
      `;
    }

    if (prestados > 0) {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
          <i class="pi pi-arrow-right-arrow-left" style="color: #95a5a6; font-size: 14px;"></i>
          <span style="flex: 1;">Prestados:</span>
          <strong>${prestados}</strong>
        </div>
      `;
    }

    if (disponibles === 0 && prestados > 0) {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; padding-top: 8px;">
          <i class="pi pi-times-circle" style="color: #e67e22; font-size: 14px;"></i>
          <span style="flex: 1; color: #e67e22;">No disponible</span>
        </div>
      `;
    }

    if (reparacion > 0) {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
          <i class="pi pi-wrench" style="color: #e74c3c; font-size: 14px;"></i>
          <span style="flex: 1;">En reparación:</span>
          <strong>${reparacion}</strong>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

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
        libro.isbn?.toLowerCase().includes(termino)
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

  toggleStats(): void {
    this.mostrarStats = !this.mostrarStats;
  }

  logout(): void {
    this.authService.logout();
  }
}