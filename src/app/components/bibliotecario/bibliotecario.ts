import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Libro, Categoria, Ejemplar, EstadoEjemplar, Autor } from '../../models';
import { BookDetailsModalComponent } from '../book-details-modal/book-details-modal';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, InputTextModule, TooltipModule, FormsModule, BookDetailsModalComponent, ConfirmDialogModule],
  templateUrl: './bibliotecario.html',
  styleUrls: ['./bibliotecario.css'],
  providers: [ConfirmationService]
})
export class BibliotecarioComponent implements OnInit {
  categoriaSeleccionada: Categoria | 'Todas' = 'Todas';
  terminoBusqueda = '';
  dropdownOpen = false;
  displayModal = false;
  selectedLibro: Libro | null = null;

  categorias: Categoria[] = [];
  libros: Libro[] = [];
  ejemplares: Ejemplar[] = [];
  estadosEjemplares: EstadoEjemplar[] = [];
  autores: Autor[] = [];

  constructor(private apiService: ApiService, private confirmationService: ConfirmationService) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    forkJoin({
      libros: this.apiService.getLibros(),
      categorias: this.apiService.getCategorias(),
      ejemplares: this.apiService.getEjemplares(),
      estadosEjemplares: this.apiService.getEstadosEjemplares(),
      autores: this.apiService.getAutores()
    }).subscribe(data => {
      this.libros = data.libros.map((libro: Libro) => {
        const ejemplar = data.ejemplares.find((e: Ejemplar) => e.idLibro === libro.id);
        const estado = ejemplar ? data.estadosEjemplares.find((ee: EstadoEjemplar) => ee.id === ejemplar.idEstadoEjemplar) : undefined;
        const autor = data.autores.find((a: Autor) => a.id === libro.idAutor);
        const categoria = data.categorias.find((c: Categoria) => c.id === libro.idCategoria);

        return {
          ...libro,
          ubicacion: ejemplar ? ejemplar.ubicacion : 'N/A',
          estado: estado ? estado.nombre : 'N/A',
          autores: autor ? [autor] : [],
          categoria: categoria
        };
      });
      this.categorias = [{ id: 0, nombre: 'Todas', uuid: '' }, ...data.categorias];
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-filter-dropdown-container')) {
      this.dropdownOpen = false;
    }
  }

  get librosFiltrados() {
    let resultado = this.libros;

    if (this.categoriaSeleccionada !== 'Todas') {
      resultado = resultado.filter(libro => libro.idCategoria === this.categoriaSeleccionada.id);
    }

    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(libro =>
        libro.titulo.toLowerCase().includes(termino) ||
        (libro.autores && libro.autores.some(autor => (autor.nombre + ' ' + autor.apPaterno).toLowerCase().includes(termino))) ||
        (libro.categoria && libro.categoria.nombre.toLowerCase().includes(termino)) ||
        libro.isbn.toLowerCase().includes(termino)
      );
    }

    return resultado;
  }

  get contadorCategorias(): Record<string, number> {
    const contador: Record<string, number> = { 'Todas': this.libros.length };
    this.categorias.forEach(categoria => {
      if (categoria.nombre !== 'Todas') {
        contador[categoria.nombre] = this.libros.filter(libro => libro.idCategoria === categoria.id).length;
      }
    });
    return contador;
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectCategoria(categoria: Categoria | 'Todas'): void {
    this.categoriaSeleccionada = categoria;
    this.dropdownOpen = false;
  }

  getDropdownText(): string {
    if (this.categoriaSeleccionada === 'Todas') {
      return 'Todas las categorías';
    }
    return this.categoriaSeleccionada.nombre;
  }

  filtrarCategoria(categoria: Categoria | 'Todas') {
    this.categoriaSeleccionada = categoria;
  }

  esCategoriaActiva(categoria: Categoria | 'Todas'): boolean {
    if (this.categoriaSeleccionada === 'Todas' && (typeof categoria === 'string' && categoria === 'Todas')) {
      return true;
    }
    if (typeof this.categoriaSeleccionada !== 'string' && typeof categoria !== 'string') {
      return this.categoriaSeleccionada.id === categoria.id;
    }
    return false;
  }

  agregarLibro() {
    console.log('Agregar nuevo libro');
  }

  importarCatalogo() {
    console.log('Importar catálogo');
  }

  exportarDatos() {
    console.log('Exportar datos');
  }

  generarReportes() {
    console.log('Generar reportes');
  }

  verLibro(uuid: string) {
    this.apiService.getLibroByUuid(uuid).subscribe(libro => {
      this.selectedLibro = libro;
      this.displayModal = true;
    });
  }

  editarLibro(uuid: string) {
    console.log('Editar libro:', uuid);
  }

  eliminarLibro(uuid: string) {
    this.confirmationService.confirm({
      message: '¿Estás seguro de que quieres eliminar este libro?',
      header: 'Confirmación de eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log('Libro eliminado:', uuid);
        // Aquí iría la llamada a la API para eliminar el libro
      }
    });
  }
}
