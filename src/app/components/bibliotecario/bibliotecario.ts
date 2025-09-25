import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';

type CategoriaKey = 'Todas' | 'Sagradas Escrituras' | 'Teología' | 'Devocionales' | 'Historia' | 'Himnarios' | 'Oración' | 'Biografías';

@Component({
  selector: 'app-librarian-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, InputTextModule, TooltipModule, FormsModule],
  templateUrl: './bibliotecario.html',
  styleUrls: ['./bibliotecario.css']
})
export class BibliotecarioComponent {
  categoriaSeleccionada: CategoriaKey = 'Todas';
  terminoBusqueda = '';
  dropdownOpen = false;

  opcionesFiltro = [
    { label: 'Todas las categorías', value: 'Todas', icon: 'pi pi-book' },
    { label: 'Sagradas Escrituras', value: 'Sagradas Escrituras', icon: 'pi pi-plus' },
    { label: 'Teología', value: 'Teología', icon: 'pi pi-graduation-cap' },
    { label: 'Devocionales', value: 'Devocionales', icon: 'pi pi-heart' },
    { label: 'Historia', value: 'Historia', icon: 'pi pi-clock' },
    { label: 'Himnarios', value: 'Himnarios', icon: 'pi pi-music' },
    { label: 'Oración', value: 'Oración', icon: 'pi pi-star' },
    { label: 'Biografías', value: 'Biografías', icon: 'pi pi-user' }
  ];

  categoriasLista = [
    { label: 'Todas', value: 'Todas' as CategoriaKey, icon: 'pi pi-book' },
    { label: 'Sagradas Escrituras', value: 'Sagradas Escrituras' as CategoriaKey, icon: 'pi pi-plus' },
    { label: 'Teología', value: 'Teología' as CategoriaKey, icon: 'pi pi-graduation-cap' },
    { label: 'Devocionales', value: 'Devocionales' as CategoriaKey, icon: 'pi pi-heart' },
    { label: 'Historia', value: 'Historia' as CategoriaKey, icon: 'pi pi-clock' },
    { label: 'Himnarios', value: 'Himnarios' as CategoriaKey, icon: 'pi pi-music' },
    { label: 'Oración', value: 'Oración' as CategoriaKey, icon: 'pi pi-star' },
    { label: 'Biografías', value: 'Biografías' as CategoriaKey, icon: 'pi pi-user' }
  ];

  libros = [
    {
      id: '1',
      img: 'https://images.unsplash.com/photo-1638276630550-36cccfdff836?auto=format&fit=crop&w=400&q=80',
      titulo: 'Biblia Reina Valera 1960',
      autor: 'Sociedades Bíblicas Unidas',
      categoria: 'Sagradas Escrituras' as CategoriaKey,
      catalogCode: 'BIB001RVR',
      location: 'Estantería Principal',
      shelf: 'A-1',
      publishYear: 1960,
      pages: 1200,
      format: 'Tapa Dura',
      estado: 'Disponible'
    },
    {
      id: '2',
      img: 'https://images.unsplash.com/photo-1654193404293-886297721ca7?auto=format&fit=crop&w=400&q=80',
      titulo: 'Teología Sistemática',
      autor: 'Wayne Grudem',
      categoria: 'Teología' as CategoriaKey,
      catalogCode: 'TEO001WGR',
      location: 'Sección Teología',
      shelf: 'B-3',
      publishYear: 1994,
      pages: 1290,
      format: 'Tapa Blanda',
      estado: 'Prestado'
    },
    {
      id: '3',
      img: 'https://images.unsplash.com/photo-1659570456681-c2745e7003aa?auto=format&fit=crop&w=400&q=80',
      titulo: 'En Pos de lo Supremo',
      autor: 'Oswald Chambers',
      categoria: 'Devocionales' as CategoriaKey,
      catalogCode: 'DEV001OCH',
      location: 'Sección Devocionales',
      shelf: 'C-2',
      publishYear: 1935,
      pages: 384,
      format: 'Tapa Blanda',
      estado: 'Disponible'
    },
    {
      id: '4',
      img: 'https://images.unsplash.com/photo-1595733533725-1a6bce052b84?auto=format&fit=crop&w=400&q=80',
      titulo: 'Historia de la Iglesia Cristiana',
      autor: 'Justo L. González',
      categoria: 'Historia' as CategoriaKey,
      catalogCode: 'HIS001JGZ',
      location: 'Sección Historia',
      shelf: 'D-1',
      publishYear: 1994,
      pages: 658,
      format: 'Tapa Dura',
      estado: 'Disponible'
    },
    {
      id: '5',
      img: 'https://images.unsplash.com/photo-1622724316148-1e179e5589f2?auto=format&fit=crop&w=400&q=80',
      titulo: 'Himnario Bautista',
      autor: 'Convención Bautista',
      categoria: 'Himnarios' as CategoriaKey,
      catalogCode: 'HIM001CBT',
      location: 'Sección Música',
      shelf: 'E-1',
      publishYear: 2010,
      pages: 560,
      format: 'Espiral',
      estado: 'Disponible'
    },
    {
      id: '6',
      img: 'https://images.unsplash.com/photo-1624935048859-9b3c9cc5ddf8?auto=format&fit=crop&w=400&q=80',
      titulo: 'El Libro de Oración Común',
      autor: 'Iglesia Episcopal',
      categoria: 'Oración' as CategoriaKey,
      catalogCode: 'ORA001IEP',
      location: 'Sección Liturgia',
      shelf: 'F-2',
      publishYear: 1979,
      pages: 1001,
      format: 'Tapa Dura',
      estado: 'En Reparación'
    },
    {
      id: '7',
      img: 'https://images.unsplash.com/photo-1638276630550-36cccfdff836?auto=format&fit=crop&w=400&q=80',
      titulo: 'Nuevo Testamento Interlineal',
      autor: 'Francisco Lacueva',
      categoria: 'Sagradas Escrituras' as CategoriaKey,
      catalogCode: 'BIB002FLC',
      location: 'Estantería Principal',
      shelf: 'A-2',
      publishYear: 1984,
      pages: 896,
      format: 'Tapa Blanda',
      estado: 'Disponible'
    },
    {
      id: '8',
      img: 'https://images.unsplash.com/photo-1654193404293-886297721ca7?auto=format&fit=crop&w=400&q=80',
      titulo: 'Teología del Pacto',
      autor: 'Michael Horton',
      categoria: 'Teología' as CategoriaKey,
      catalogCode: 'TEO002MHR',
      location: 'Sección Teología',
      shelf: 'B-4',
      publishYear: 2006,
      pages: 432,
      format: 'Tapa Blanda',
      estado: 'Disponible'
    }
  ];

 
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
      resultado = resultado.filter(libro => libro.categoria === this.categoriaSeleccionada);
    }
    
    if (this.terminoBusqueda) {
      const termino = this.terminoBusqueda.toLowerCase();
      resultado = resultado.filter(libro => 
        libro.titulo.toLowerCase().includes(termino) ||
        libro.autor.toLowerCase().includes(termino) ||
        libro.categoria.toLowerCase().includes(termino) ||
        libro.catalogCode.toLowerCase().includes(termino)
      );
    }
    
    return resultado;
  }

  get contadorCategorias(): Record<CategoriaKey, number> {
    const contador: Partial<Record<CategoriaKey, number>> = {};
    
    this.libros.forEach(libro => {
      contador[libro.categoria] = (contador[libro.categoria] || 0) + 1;
    });
    
    return {
      'Todas': this.libros.length,
      'Sagradas Escrituras': contador['Sagradas Escrituras'] || 0,
      'Teología': contador['Teología'] || 0,
      'Devocionales': contador['Devocionales'] || 0,
      'Historia': contador['Historia'] || 0,
      'Himnarios': contador['Himnarios'] || 0,
      'Oración': contador['Oración'] || 0,
      'Biografías': contador['Biografías'] || 0
    };
  }


  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectCategoria(categoria: CategoriaKey): void {
    this.categoriaSeleccionada = categoria;
    this.dropdownOpen = false;
  }

  getDropdownText(): string {
    if (this.categoriaSeleccionada === 'Todas') {
      return 'Todas las categorías';
    }
    return this.categoriaSeleccionada;
  }

  filtrarCategoria(categoria: CategoriaKey) {
    this.categoriaSeleccionada = categoria;
    console.log('Filtrado por:', categoria);
    console.log('Libros encontrados:', this.librosFiltrados.length);
  }


  esCategoriaActiva(categoria: CategoriaKey): boolean {
    return this.categoriaSeleccionada === categoria;
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

  verLibro(id: string) {
    console.log('Ver libro:', id);
  }

  editarLibro(id: string) {
    console.log('Editar libro:', id);
  }

  eliminarLibro(id: string) {
    console.log('Eliminar libro:', id);
  }
}
