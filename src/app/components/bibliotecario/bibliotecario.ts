import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
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
import { PaginatorModule } from 'primeng/paginator';
import { Router, NavigationEnd } from '@angular/router';
import { finalize, forkJoin, map, switchMap, of, Subscription, filter, catchError } from 'rxjs';
import { SecureImagePipe } from '../../pipes/secure-image.pipe';

import { BookService } from '../../services/book.service';
import { CatalogService } from '../../services/catalog.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { AuthService } from '../../services/auth.service';
import { SharedDataService } from '../../services/shared-data.service';
import { Libro, Catalogo, Autor, Ejemplar } from '../../models/biblioteca';

import LibroFormularioComponent from '../libro-formulario/libro-formulario';
import EjemplarFormularioComponent from '../ejemplar-formulario/ejemplar-formulario';
import LibroDetalleComponent from '../libro-detalle/libro-detalle';
import { environment } from '../../../environments/enviroment';

type CategoriaKey = 'Todas' | string;

@Component({
  selector: 'app-bibliotecario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule,
    TooltipModule, PopoverModule, ToastModule, ConfirmPopupModule,
    ConfirmDialogModule, DynamicDialogModule, DividerModule, ChipModule,
    DialogModule, SelectModule, MenuModule, SecureImagePipe, PaginatorModule
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './bibliotecario.html',
  styleUrls: ['./bibliotecario.css']
})
export default class BibliotecarioComponent implements OnInit, OnDestroy {
  private bookService = inject(BookService);
  private catalogService = inject(CatalogService);
  private ejemplarService = inject(EjemplarService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private sharedDataService = inject(SharedDataService);

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
  
  first: number = 0;
  rows: number = 15;

  private ejemplaresSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private readonly IMAGES_BASE_URL = environment.plainURL + '/assets/img/';

  get isAdmin(): boolean {
      return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadInitialData();
    this.setupCatalogMenu();
    
    this.ejemplaresSubscription = this.sharedDataService.ejemplaresActualizados$.subscribe(
      (actualizado) => {
        if (actualizado) this.loadInitialData();
      }
    );

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url === '/admin' || event.url.includes('/admin') && !event.url.includes('/admin/')) {
          this.loadInitialData();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.ejemplaresSubscription) this.ejemplaresSubscription.unsubscribe();
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
  }

  onPageChange(event: any) {
      this.first = event.first;
      this.rows = event.rows;
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setupCatalogMenu(): void {
    const items: MenuItem[] = [
      { label: 'Gestionar Catálogos', styleClass: 'menu-header' },
      { separator: true },
      { label: 'Autores', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/admin/autores']) },
      { label: 'Categorías', icon: 'pi pi-tags', command: () => this.router.navigate(['/admin/categorias']) },
      { label: 'Editoriales', icon: 'pi pi-building', command: () => this.router.navigate(['/admin/editoriales']) },
      { label: 'Idiomas', icon: 'pi pi-globe', command: () => this.router.navigate(['/admin/idiomas']) },
      { label: 'Facultades', icon: 'pi pi-book', command: () => this.router.navigate(['/admin/tipos']) },
      { separator: true },
      { label: 'Ejemplares', icon: 'pi pi-inbox', command: () => this.router.navigate(['/admin/ejemplares']) },
      { label: 'Estados de Ejemplar', icon: 'pi pi-check-circle', command: () => this.router.navigate(['/admin/estados']) },
      { label: 'Condición Física', icon: 'pi pi-clipboard', command: () => this.router.navigate(['/admin/condiciones']) },
      { separator: true },
      { label: 'Multas', icon: 'pi pi-receipt', command: () => this.router.navigate(['/admin/multas']) },     
      { separator: true }
    ];

    const logoutItem: MenuItem = { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', styleClass: 'logout-menu-item', command: () => this.logout() };

    this.catalogMenuItems = [...items, logoutItem];
  }

  loadUserInfo(): void {
    this.currentFullName = this.authService.getFullName();
    this.currentUserRole = this.authService.getRoleName();
    this.currentUserInitials = this.authService.getUserInitials();
  }

  loadInitialData(): void {
    this.loading = true;

    forkJoin({
      libros: this.bookService.getAllLibrosAdmin().pipe(
        catchError(err => {
            console.error('Error cargando libros:', err);
            return of([]); 
        })
      ),
      categorias: this.catalogService.getCategorias().pipe(catchError(() => of([]))),
      ejemplares: this.ejemplarService.getEjemplares().pipe(catchError(() => of([]))),
      estados: this.catalogService.getEstadosEjemplares().pipe(catchError(() => of([])))
    }).pipe(
      switchMap(({ libros, categorias, ejemplares, estados }) => {
        if (libros.length === 0) {
          return of({ libros: [], categorias });
        }

        const autorRequests = libros.map(libro =>
          this.bookService.getAutoresForLibro(libro.uuid).pipe(
            catchError(() => {
                return of([]); 
            })
          )
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

              const estadoDesdeBack = (libro as any).activo;
              
              if (estadoDesdeBack === undefined) {
                 console.warn(`Alerta Frontend: El libro "${libro.titulo}" no trae el campo 'activo' del backend.`);
              }

              return {
                ...libro,
                imagen: imagenCorregida, 
                categoria: categoriaDelLibro,
                autores: autoresArray[index],
                ejemplares: ejemplaresDelLibro,
                activo: estadoDesdeBack !== false 
              };
            });

            librosCompletos.sort((a, b) => b.id - a.id); 

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
        console.error('Error general:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los datos.' 
        });
      }
    });
  }

  getEjemplaresDisponibles(libro: Libro): number { return libro.ejemplares?.filter(e => e.estado?.nombre?.toLowerCase() === 'disponible').length || 0; }
  getEjemplaresPrestados(libro: Libro): number { return libro.ejemplares?.filter(e => e.estado?.nombre?.toLowerCase() === 'prestado').length || 0; }
  getEjemplaresReparacion(libro: Libro): number { return libro.ejemplares?.filter(e => e.estado?.nombre?.toLowerCase() === 'en reparación').length || 0; }

  getEstadoPrincipal(libro: Libro): { estado: string; cantidad: number; clase: string; icono: string } {
    const disponibles = this.getEjemplaresDisponibles(libro);
    const prestados = this.getEjemplaresPrestados(libro);
    const reparacion = this.getEjemplaresReparacion(libro);
    const total = libro.ejemplares?.length || 0;

    if (total === 0) return { estado: 'Sin ejemplares', cantidad: 0, clase: 'unavailable', icono: 'pi-times-circle' };
    if (disponibles > 0) return { estado: 'Disponible', cantidad: disponibles, clase: 'available', icono: 'pi-check-circle' };
    if (prestados > 0) return { estado: 'No disponible', cantidad: prestados, clase: 'unavailable', icono: 'pi-times-circle' };
    if (reparacion > 0) return { estado: 'En reparación', cantidad: reparacion, clase: 'repair', icono: 'pi-wrench' };
    return { estado: 'No disponible', cantidad: 0, clase: 'unavailable', icono: 'pi-times-circle' };
  }

  getDetalleEstados(libro: Libro): { estado: string; cantidad: number; clase: string; icono: string }[] {
    const detalles = [];
    const disponibles = this.getEjemplaresDisponibles(libro);
    const prestados = this.getEjemplaresPrestados(libro);
    const reparacion = this.getEjemplaresReparacion(libro);

    if (disponibles > 0) detalles.push({ estado: 'Disponibles', cantidad: disponibles, clase: 'available', icono: 'pi-check-circle' });
    if (prestados > 0) detalles.push({ estado: 'Prestados', cantidad: prestados, clase: 'borrowed', icono: 'pi-arrow-right-arrow-left' });
    if (reparacion > 0) detalles.push({ estado: 'En reparación', cantidad: reparacion, clase: 'repair', icono: 'pi-wrench' });
    return detalles;
  }

  tieneDetallesEstados(libro: Libro): boolean { return this.getDetalleEstados(libro).length > 1; }
  getTotalEjemplaresDisponibles(): number { return this.allLibros.reduce((total, libro) => total + this.getEjemplaresDisponibles(libro), 0); }
  getTotalEjemplaresPrestados(): number { return this.allLibros.reduce((total, libro) => total + this.getEjemplaresPrestados(libro), 0); }
  getTotalEjemplaresReparacion(): number { return this.allLibros.reduce((total, libro) => total + this.getEjemplaresReparacion(libro), 0); }

  agregarLibro(): void { this.router.navigate(['/admin/libros/nuevo']); }
  UsuariosList(): void { this.router.navigate(['/admin/usuarios']); }
  PrestamosList(): void { this.router.navigate(['/admin/prestamos']); }
  PersonasList(): void { this.router.navigate(['/admin/personas']); }
  Impresiones(): void { this.router.navigate(['/admin/impresiones']); }
  irAPoliticas(): void { this.router.navigate(['/admin/politicas']); }
  logout(): void { this.authService.logout(); }

  filtrarLibros(): void {
      let resultado = this.allLibros;
      
      if (this.categoriaSeleccionada !== 'Todas') {
        resultado = resultado.filter(libro => libro.categoria?.nombre === this.categoriaSeleccionada);
      }
      
      if (this.terminoBusqueda) {
        const termino = this.terminoBusqueda.toLowerCase().trim();
        resultado = resultado.filter(libro =>
          (libro.titulo || '').toLowerCase().includes(termino) ||
          this.getAutoresAsString(libro.autores).toLowerCase().includes(termino) ||
          (libro.isbn || '').toLowerCase().includes(termino)
        );
      }
      
      this.libros = resultado;
      this.first = 0; 
    }

  buscar(): void { this.filtrarLibros(); }
  filtrarCategoria(categoria: CategoriaKey): void { this.categoriaSeleccionada = categoria; this.filtrarLibros(); }
  toggleDropdown(): void { this.dropdownOpen = !this.dropdownOpen; }
  selectCategoria(categoria: CategoriaKey): void { this.categoriaSeleccionada = categoria; this.dropdownOpen = false; this.filtrarLibros(); }
  getDropdownText(): string { return this.categoriaSeleccionada === 'Todas' ? 'Todas las categorías' : this.categoriaSeleccionada; }
  esCategoriaActiva(categoria: CategoriaKey): boolean { return this.categoriaSeleccionada === categoria; }

  formatIsbn(isbn: string | undefined): string {
    if (!isbn || isbn.length !== 13) return isbn || 'N/A';
    return [isbn.slice(0, 3), isbn.slice(3, 6), isbn.slice(6, 9), isbn.slice(9, 12), isbn.slice(12, 13)].join('-');
  }

  formatearISBN(isbn: string | undefined): string {
    if (!isbn) return 'Sin ISBN';
    const limpio = isbn.replace(/[^0-9X]/gi, '');
    if (limpio.length === 10) {
      return `${limpio.substring(0, 1)}-${limpio.substring(1, 4)}-${limpio.substring(4, 9)}-${limpio.substring(9, 10)}`;
    }
    if (limpio.length === 13) {
      return `${limpio.substring(0, 3)}-${limpio.substring(3, 4)}-${limpio.substring(4, 8)}-${limpio.substring(8, 12)}-${limpio.substring(12, 13)}`;
    }
    return isbn;
  }

  getAutoresAsString(autores?: Autor[]): string {
    if (!autores || autores.length === 0) return 'Autor no asignado';
    return autores.map(a => `${a.nombre} ${a.apPaterno || ''}`).join(', ');
  }

  getTooltipEstados(libro: Libro): string {
    const disponibles = this.getEjemplaresDisponibles(libro);
    const prestados = this.getEjemplaresPrestados(libro);
    const reparacion = this.getEjemplaresReparacion(libro);
    const total = libro.ejemplares?.length || 0;
    if (total === 0) return 'Sin ejemplares';
    const noDisponibles = total - disponibles - prestados - reparacion;
    let html = '<div style="text-align: left; font-size: 13px;">';
    html += '<strong style="display: block; margin-bottom: 8px; color: #D4AF37;">Desglose de ejemplares</strong>';
    if (disponibles > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-check-circle" style="color: #27ae60; font-size: 14px;"></i><span style="flex: 1;">Disponibles:</span><strong>${disponibles}</strong></div>`;
    if (prestados > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-arrow-right-arrow-left" style="color: #3498db; font-size: 14px;"></i><span style="flex: 1;">Prestados:</span><strong>${prestados}</strong></div>`;
    if (noDisponibles > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-times-circle" style="color: #e67e22; font-size: 14px;"></i><span style="flex: 1;">No disponibles:</span><strong>${noDisponibles}</strong></div>`;
    if (reparacion > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-wrench" style="color: #e74c3c; font-size: 14px;"></i><span style="flex: 1;">En reparación:</span><strong>${reparacion}</strong></div>`;
    html += '</div>';
    return html;
  }

  private actualizarContadores(): void {
    const contadores: { [key: string]: number } = {};
    this.categorias.forEach(cat => {
      contadores[cat.nombre] = this.allLibros.filter(libro => libro.categoria?.id === cat.id).length;
    });
    this.contadoresCategoria = contadores;
  }

  editarLibro(libro: Libro): void { this.router.navigate(['/admin/libros/editar', libro.uuid]); }
  
  verLibro(libro: Libro): void {
    this.dialogService.open(LibroDetalleComponent, {
      header: 'Detalles de ' + libro.titulo,
      width: '75%',
      contentStyle: { "max-height": "90vh", "overflow": "auto" },
      baseZIndex: 10000,
      data: { uuid: libro.uuid, imagenUrl: libro.imagen,estaActivo: libro.activo},
      modal: true,
      closable: true,
    });
  }

  abrirModalAgregarEjemplar(libro: Libro): void {
    const ref = this.dialogService.open(EjemplarFormularioComponent, {
      header: `Agregar Ejemplar para: ${libro.titulo}`,
      width: '600px',
      data: { idLibro: libro.id, messageService: this.messageService },
      modal: true,
      closable: true,
      focusOnShow: false,
    });
    ref.onClose.subscribe((ejemplarAgregado) => {
      if (ejemplarAgregado) this.loadInitialData();
    });
  }

  eliminarLibro(libro: Libro): void {
    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: `¿Está seguro de desactivar el libro "${libro.titulo}"?`,
      header: 'Confirmar desactivación',
      icon: 'pi pi-exclamation-triangle text-red-500',
      acceptLabel: 'Sí, desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.bookService.deleteLibro(libro.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Libro desactivado correctamente.' });
            const libroEnLista = this.allLibros.find(l => l.id === libro.id);
            if (libroEnLista) (libroEnLista as any).activo = false;
            this.filtrarLibros();
          },
          error: (err: any) => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar el libro.' })
        });
      }
    });
  }

  reactivarLibro(libro: Libro): void {
    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: `¿Desea reactivar el libro "${libro.titulo}"?`,
      header: 'Confirmar reactivación',
      icon: 'pi pi-refresh text-green-500',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.bookService.reactivarLibro(libro.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Libro reactivado correctamente.' });
            const libroEnLista = this.allLibros.find(l => l.id === libro.id);
            if (libroEnLista) (libroEnLista as any).activo = true;
            this.filtrarLibros();
          },
          error: (err: any) => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar el libro.' })
        });
      }
    });
  }

  toggleStats(): void { this.mostrarStats = !this.mostrarStats; }
}