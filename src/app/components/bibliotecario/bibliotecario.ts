import { finalize, forkJoin, Subscription, filter, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { Component, OnInit, OnDestroy, inject, Inject } from '@angular/core';
import { SecureImagePipe } from '../../pipes/secure-image.pipe';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { MultiSelectModule } from 'primeng/multiselect';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { DividerModule } from 'primeng/divider';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ChipModule } from 'primeng/chip';
import { MenuModule } from 'primeng/menu';
import { CardModule } from 'primeng/card';

import { Libro, Catalogo, Areas, LibroListado } from '../../models/biblioteca';
import { SharedDataService } from '../../services/shared-data.service';
import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';

import EjemplarFormularioComponent from '../ejemplar-formulario/ejemplar-formulario';
import LibroDetalleComponent from '../libro-detalle/libro-detalle';
import { environment } from '../../../environments/environment';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { StateService } from '../../services/route-state.service';
import { ListadoLibrosState } from '../../models/listadoState';

type CategoriaKey = 'Todas' | string;

@Component({
  selector: 'app-bibliotecario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule,
    TooltipModule, PopoverModule, ToastModule, ConfirmPopupModule,
    ConfirmDialogModule, DynamicDialogModule, DividerModule, ChipModule,
    DialogModule, SelectModule, MenuModule, SecureImagePipe, PaginatorModule,
    TableModule, TruncatePipe, MultiSelectModule
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './bibliotecario.html',
  styleUrls: ['./bibliotecario.css']
})
export default class BibliotecarioComponent implements OnInit, OnDestroy {
  private bookService = inject(BookService);
  private catalogService = inject(CatalogService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sharedDataService = inject(SharedDataService);
  private stateService = inject(StateService);

  private ejemplaresSubscription?: Subscription;
  private readonly IMAGES_BASE_URL = environment.plainURL + '/assets/img/';
  authService = inject(AuthService);

  // Entidades
  libros: LibroListado[] = [];
  librosSeleccionados: Libro[] = [];
  librosDesactivados: LibroListado[] = [];
  //
  categorias: Catalogo[] = [];
  categoriaSeleccionadaId: number | null = null;
  //
  areasCat: Areas[] = [];
  areasSeleccionadasIds: number[] = [];

  vistaActual: 'cards' | 'tabla' = 'cards';

  loading = true;
  loadingDesactivados = true;
  dropdownOpen = false;
  areasDropdownOpen = false;
  modalDesactivados = false;

  // Variables de búsqueda
  entradasTotales: number = 0;
  currentSort = { field: 'id', order: 'desc' };
  currentPage = 0;
  currentSize = 15;
  globalFilter = '';
  private searchSubject = new Subject<string>();

  // Variables de búsqueda de desactivados
  entradasDesactivadasTotales: number = 0;
  currentDeactivatedSort = { field: 'id', order: 'desc' };
  currentDeactivatedPage = 0;
  currentDeactivatedSize = 15;
  ocultosFilter: string = '';
  private searchDeactivatedSubject = new Subject<string>();

  catalogMenuItems: MenuItem[] = [];
  currentFullName: string = '';
  currentUserRole: string = '';
  currentUserInitials: string = '';
  mostrarStats = true;

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.loadUserInfo();
    const state = this.stateService.restoreState<ListadoLibrosState>(
      'libros',
      {
        page: 0,
        size: 15,
        search: '',

        categoriaId: null,
        areaIds: [],

        sortField: 'id',
        sortOrder: 'desc'
      }
    );
    this.currentPage = state.page;
    this.currentSize = state.size;

    this.globalFilter = state.search;

    this.categoriaSeleccionadaId = state.categoriaId;
    this.areasSeleccionadasIds = state.areaIds;

    this.currentSort.field = state.sortField;
    this.currentSort.order = state.sortOrder;
    this.loadInitialData();
    this.loadLibros();
    this.loadLibrosDesactivados();
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(search => {
      this.globalFilter = search;
      this.currentPage = 0;

      this.loadLibros();
    });
    this.searchDeactivatedSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(search => {
      this.loadLibrosDesactivados(0, this.currentDeactivatedSize, this.currentDeactivatedSort.field, this.currentDeactivatedSort.order, search);
    });
    this.setupCatalogMenu();

    this.ejemplaresSubscription = this.sharedDataService.ejemplaresActualizados$.subscribe(
      (actualizado) => {
        if (actualizado) this.recargarLibrosActuales();
      }
    );
  }

  ngOnDestroy(): void {
    if (this.ejemplaresSubscription) this.ejemplaresSubscription.unsubscribe();
  }

  loadUserInfo(): void {
    this.currentFullName = this.authService.getFullName();
    this.currentUserRole = this.authService.getRoleName();
    this.currentUserInitials = this.authService.getUserInitials();
  }

  loadInitialData(): void {
    this.loading = true;

    forkJoin({
      categorias: this.catalogService.getCategorias(),
      areas: this.catalogService.getAreas()
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ categorias, areas }) => {
        this.categorias = categorias;
        this.areasCat = areas;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los datos.'
        });
        console.error(err);
      }
    })
  }

  get categoriasOptions() {
    return [
      { label: 'Todas las categorías', value: null },
      ...this.categorias.map(c => ({
        label: c.nombre,
        value: c.id
      }))
    ];
  }

  get categoriaSeleccionadaNombre(): string {
    if (!this.categoriaSeleccionadaId) {
      return 'Todas las categorías';
    }

    return this.categorias.find(
      c => c.id === this.categoriaSeleccionadaId
    )?.nombre ?? 'Todas las categorías';
  }

  get areasOptions() {
    return this.areasCat.map(a => ({
      label: a.nombre,
      value: a.id
    }));
  }

  loadLibros(): void {
    this.loading = true;

    this.bookService.listarLibros(
      this.currentPage,
      this.currentSize,
      this.currentSort.field,
      this.currentSort.order,
      this.globalFilter,
      this.categoriaSeleccionadaId,
      this.areasSeleccionadasIds)
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: (data) => {
          this.libros = data.content.map(libro => {
            let imagenCorregida = libro.imagen;

            if (libro.imagen && !libro.imagen.startsWith('http')) {
              imagenCorregida = `${this.IMAGES_BASE_URL}${libro.imagen}`;
            }

            return {
              ...libro,
              imagen: imagenCorregida
            };
          });
          this.entradasTotales = data.totalElements;
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los libros.'
          });
          console.error(err);
        }
      })
  }

  loadLibrosDesactivados(page: number = 0, size: number = 15, sortField: string = 'id', sortOrder: string = 'desc', search: string = ''): void {
    this.loadingDesactivados = true;

    this.bookService.listarLibrosDesactivados(page, size, sortField, sortOrder, search)
      .pipe(finalize(() => this.loadingDesactivados = false)).subscribe({
        next: (data) => {
          this.librosDesactivados = data.content.map(libro => {
            let imagenCorregida = libro.imagen;

            if (libro.imagen && !libro.imagen.startsWith('http')) {
              imagenCorregida = `${this.IMAGES_BASE_URL}${libro.imagen}`;
            }

            return {
              ...libro,
              imagen: imagenCorregida
            };
          });
          this.entradasDesactivadasTotales = data.totalElements;
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los libros.'
          });
          console.error(err);
        }
      })
  }

  // Menu desplegable para navegar por el sistema
  setupCatalogMenu(): void {
    const userRole = this.authService.getRoleName();

    const items: MenuItem[] = [
      { label: 'Gestionar Catálogos', styleClass: 'menu-header' },
      { separator: true },
      { label: 'Areas', icon: 'pi pi-th-large', command: () => this.router.navigate(['/admin/areas']) },
      { label: 'Autores', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/admin/autores']) },
      { label: 'Categorías', icon: 'pi pi-tags', command: () => this.router.navigate(['/admin/categorias']) },
      { label: 'Editoriales', icon: 'pi pi-building', command: () => this.router.navigate(['/admin/editoriales']) },
      { label: 'Idiomas', icon: 'pi pi-globe', command: () => this.router.navigate(['/admin/idiomas']) },
      { label: 'Facultades', icon: 'pi pi-book', command: () => this.router.navigate(['/admin/tipos']) },
      { label: 'Procedencias', icon: 'pi pi-flag', command: () => this.router.navigate(['/admin/procedencias']) },
      { separator: true },
      { label: 'Ejemplares', icon: 'pi pi-inbox', command: () => this.router.navigate(['/admin/ejemplares']) },
      { label: 'Estados de Ejemplar', icon: 'pi pi-check-circle', command: () => this.router.navigate(['/admin/estados']) },
      { label: 'Condición Física', icon: 'pi pi-clipboard', command: () => this.router.navigate(['/admin/condiciones']) },
      { separator: true },
      { label: 'Políticas', icon: 'pi pi-chart-bar', visible: userRole === 'Administrador', command: () => this.router.navigate(['/admin/politicas']) },
      { label: 'Préstamos', icon: 'pi pi-book', command: () => this.router.navigate(['/admin/prestamos']) },
      { label: 'Multas', icon: 'pi pi-receipt', command: () => this.router.navigate(['/admin/multas']) },
      { label: 'Pagos', icon: 'pi pi-money-bill', visible: userRole === 'Administrador', command: () => this.router.navigate(['/admin/pagos']) },
      { separator: true, visible: userRole === 'Administrador' },
      { label: 'Personas', icon: 'pi pi-users', visible: userRole === 'Administrador', command: () => this.router.navigate(['/admin/personas']) },
      { label: 'Usuarios', icon: 'pi pi-address-book', visible: userRole === 'Administrador', command: () => this.router.navigate(['/admin/usuarios']) },
      { separator: true }
    ];

    const logoutItem: MenuItem = { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', styleClass: 'logout-menu-item', command: () => this.logout() };
    this.catalogMenuItems = [...items, logoutItem];
  }

  guardarEstadoSesion(): void {
    this.stateService.saveState<ListadoLibrosState>('libros', {

      page: this.currentPage,
      size: this.currentSize,

      search: this.globalFilter,

      categoriaId: this.categoriaSeleccionadaId,

      areaIds: this.areasSeleccionadasIds,

      sortField: this.currentSort.field,

      sortOrder: this.currentSort.order

    });
  }

  // Métodos de filtros y búsqueda
  onPageChange(event: any): void {
    this.currentPage = event.rows > 0 ? Math.floor(event.first / event.rows) : 0;
    this.currentSize = event.rows;
    this.currentSort.field = event.sortField || 'id';
    this.currentSort.order = event.sortOrder === 1 ? 'asc' : 'desc';

    this.guardarEstadoSesion();

    this.loadLibros();
  }

  applyFilterGlobal(): void {
    this.currentPage = 0;

    this.searchSubject.next(this.globalFilter.trim());

    this.guardarEstadoSesion();
  }

  // Métodos de filtros y búsqueda - desactivados
  onDeactivatedPageChange(event: any): void {
    this.currentDeactivatedPage = event.rows > 0 ? Math.floor(event.first / event.rows) : 0;
    this.currentDeactivatedSize = event.rows;
    this.currentDeactivatedSort.field = event.sortField || 'id';
    this.currentDeactivatedSort.order = event.sortOrder === 1 ? 'asc' : 'desc';

    this.loadLibros();
  }

  applyFilterOcultos(): void {
    this.currentDeactivatedPage = 0;

    this.searchDeactivatedSubject.next(this.ocultosFilter.trim());
  }

  getEjemplaresDisponibles(libro: LibroListado): number { return libro.ejemplares?.filter(e => e.estadoEjemplar?.toLowerCase() === 'disponible').length || 0; }
  getEjemplaresPrestados(libro: LibroListado): number { return libro.ejemplares?.filter(e => e.estadoEjemplar?.toLowerCase() === 'prestado').length || 0; }
  getEjemplaresReparacion(libro: LibroListado): number { return libro.ejemplares?.filter(e => e.estadoEjemplar?.toLowerCase() === 'en reparación').length || 0; }

  getEstadoPrincipal(libro: LibroListado): { estado: string; cantidad: number; clase: string; icono: string } {
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

  getTooltipEstados(libro: LibroListado): string {
    const disponibles = this.getEjemplaresDisponibles(libro);
    const prestados = this.getEjemplaresPrestados(libro);
    const reparacion = this.getEjemplaresReparacion(libro);
    const total = libro.ejemplares?.length || 0;
    if (total === 0) return 'Sin ejemplares';

    let html = '<div style="text-align: left; font-size: 13px;">';
    html += '<strong style="display: block; margin-bottom: 8px; color: #D4AF37;">Desglose de ejemplares</strong>';
    if (disponibles > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-check-circle" style="color: #27ae60; font-size: 14px;"></i><span style="flex: 1;">Disponibles:</span><strong>${disponibles}</strong></div>`;
    if (prestados > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-arrow-right-arrow-left" style="color: #3498db; font-size: 14px;"></i><span style="flex: 1;">Prestados:</span><strong>${prestados}</strong></div>`;
    if (reparacion > 0) html += `<div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;"><i class="pi pi-wrench" style="color: #e74c3c; font-size: 14px;"></i><span style="flex: 1;">En reparación:</span><strong>${reparacion}</strong></div>`;
    html += '</div>';
    return html;
  }

  getTotalEjemplaresDisponibles(): number { return this.libros.reduce((total, libro) => total + this.getEjemplaresDisponibles(libro), 0); }
  getTotalEjemplaresPrestados(): number { return this.libros.reduce((total, libro) => total + this.getEjemplaresPrestados(libro), 0); }
  getTotalEjemplaresReparacion(): number { return this.libros.reduce((total, libro) => total + this.getEjemplaresReparacion(libro), 0); }

  agregarLibro(): void {
    this.stateService.saveState<ListadoLibrosState>('libros', {

      page: this.currentPage,
      size: this.currentSize,

      search: this.globalFilter,

      categoriaId: this.categoriaSeleccionadaId,

      areaIds: this.areasSeleccionadasIds,

      sortField: this.currentSort.field,

      sortOrder: this.currentSort.order

    });
    this.router.navigate(['/admin/libros/nuevo']);
  }
  UsuariosList(): void { this.router.navigate(['/admin/usuarios']); }
  PrestamosList(): void { this.router.navigate(['/admin/prestamos']); }
  PersonasList(): void { this.router.navigate(['/admin/personas']); }
  Impresiones(): void { this.router.navigate(['/admin/impresiones']); }
  irAPoliticas(): void { this.router.navigate(['/admin/politicas']); }
  irADescargas(): void { this.router.navigate(['/admin/descargas']); }
  logout(): void {
    this.stateService.clearState('libros');
    this.authService.logout();
  }

  selectCategoria(): void {
    this.currentPage = 0;
    this.recargarLibrosActuales();
    this.guardarEstadoSesion();
  }

  selectAreas(): void {
    this.areasSeleccionadasIds ??= [];
    this.currentPage = 0;
    this.recargarLibrosActuales();
    this.guardarEstadoSesion();
  }

  formatearISBN(isbn: string | undefined): string {
    if (!isbn) return 'Sin ISBN';
    const limpio = isbn.replace(/[^0-9X]/gi, '');
    if (limpio.length === 10) return `${limpio.substring(0, 1)}-${limpio.substring(1, 4)}-${limpio.substring(4, 9)}-${limpio.substring(9, 10)}`;
    if (limpio.length === 13) return `${limpio.substring(0, 3)}-${limpio.substring(3, 4)}-${limpio.substring(4, 8)}-${limpio.substring(8, 12)}-${limpio.substring(12, 13)}`;
    return isbn;
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

  editarLibro(libro: LibroListado): void {
    this.stateService.saveState<ListadoLibrosState>('libros', {

      page: this.currentPage,
      size: this.currentSize,

      search: this.globalFilter,

      categoriaId: this.categoriaSeleccionadaId,

      areaIds: this.areasSeleccionadasIds,

      sortField: this.currentSort.field,

      sortOrder: this.currentSort.order

    });

    this.router.navigate(['/admin/libros/editar', libro.uuid]);
  }

  verLibro(libro: LibroListado): void {
    this.dialogService.open(LibroDetalleComponent, {
      header: 'Detalles de ' + libro.titulo,
      width: '75%',
      contentStyle: { "max-height": "90vh", "overflow": "auto" },
      baseZIndex: 10000,
      data: { uuid: libro.uuid, imagenUrl: libro.imagen, libroListado: libro },
      modal: true,
      closable: true,
    });
  }

  abrirModalAgregarEjemplar(libro: LibroListado): void {
    const ref = this.dialogService.open(EjemplarFormularioComponent, {
      header: `Agregar Ejemplar para: ${libro.titulo}`,
      width: '600px',
      data: { idLibro: libro.id, messageService: this.messageService },
      modal: true,
      closable: true,
      focusOnShow: false,
    });
    ref.onClose.subscribe((ejemplarAgregado) => {
      if (ejemplarAgregado) this.recargarLibrosActuales();
    });
  }

  eliminarLibro(libro: LibroListado): void {
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
            this.recargarLibrosActuales();
            this.recargarLibrosDesactivados();
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo desactivar el libro.';
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
          }
        });
      }
    });
  }

  reactivarLibro(libro: LibroListado): void {
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
            this.recargarLibrosActuales();
            this.recargarLibrosDesactivados();
          },
          error: (err: any) => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo reactivar el libro.' })
        });
      }
    });
  }

  procesarMultiples(activar: boolean): void {
    if (!this.librosSeleccionados || this.librosSeleccionados.length === 0) return;

    const mensaje = activar
      ? `¿Desea reactivar los ${this.librosSeleccionados.length} libros seleccionados?`
      : `¿Desea desactivar los ${this.librosSeleccionados.length} libros seleccionados?`;
    const icon = activar ? 'pi pi-refresh text-green-500' : 'pi pi-exclamation-triangle text-red-500';
    const acceptClass = activar ? 'p-button-success' : 'p-button-danger';

    this.confirmationService.confirm({
      key: 'deleteDialog',
      message: mensaje,
      header: 'Confirmar acción múltiple',
      icon: icon,
      acceptLabel: 'Sí, continuar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: acceptClass,
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        const peticiones = this.librosSeleccionados.map(libro =>
          activar ? this.bookService.reactivarLibro(libro.uuid) : this.bookService.deleteLibro(libro.uuid)
        );

        forkJoin(peticiones).pipe(
          finalize(() => {
            this.loading = false;
            this.librosSeleccionados = [];
          })
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Libros procesados correctamente.' });
            this.recargarLibrosActuales();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar los libros.' })
        });
      }
    });
  }

  toggleStats(): void { this.mostrarStats = !this.mostrarStats; }

  private recargarLibrosActuales(): void {
    this.loadLibros();
  }

  private recargarLibrosDesactivados(): void {
    this.loadLibrosDesactivados(
      this.currentDeactivatedPage,
      this.currentDeactivatedSize,
      this.currentDeactivatedSort.field,
      this.currentDeactivatedSort.order,
      this.ocultosFilter
    );
  }
}