import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';


type CategoriaKey = 'Todas' | 'Sagradas Escrituras' | 'Teología' | 'Devocionales' | 'Historia' | 'Himnarios' | 'Oración' | 'Biografías';

interface Libro {
  id: string;
  img: string;
  titulo: string;
  autor: string;
  categoria: CategoriaKey;
  catalogCode: string;
  location: string;
  shelf: string;
  publishYear: number;
  pages: number;
  format: string;
  language: string;
  estado: string;
}

@Component({
  selector: 'app-user-catalog',
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, FormsModule,SelectModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  categoriaSeleccionada: CategoriaKey = 'Todas';
  terminoBusqueda = '';
  dropdownOpen = false;

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

  libros: Libro[] = [
    {
      id: '1',
      img: 'https://images.unsplash.com/photo-1638276630550-36cccfdff836?auto=format&fit=crop&w=400&q=80',
      titulo: 'Biblia Reina Valera 1960',
      autor: 'Sociedades Bíblicas Unidas',
      categoria: 'Sagradas Escrituras',
      catalogCode: 'BIB001RVR',
      location: 'Estantería Principal',
      shelf: 'A-1',
      publishYear: 1960,
      pages: 1200,
      format: 'Tapa Dura',
      language: 'Español',
      estado: 'Disponible'
    },
    {
      id: '2',
      img: 'https://images.unsplash.com/photo-1654193404293-886297721ca7?auto=format&fit=crop&w=400&q=80',
      titulo: 'Teología Sistemática',
      autor: 'Wayne Grudem',
      categoria: 'Teología',
      catalogCode: 'TEO001WGR',
      location: 'Sección Teología',
      shelf: 'B-3',
      publishYear: 1994,
      pages: 1290,
      format: 'Tapa Blanda',
      language: 'Español',
      estado: 'Disponible'
    },
    {
      id: '3',
      img: 'https://images.unsplash.com/photo-1659570456681-c2745e7003aa?auto=format&fit=crop&w=400&q=80',
      titulo: 'En Pos de lo Supremo',
      autor: 'Oswald Chambers',
      categoria: 'Devocionales',
      catalogCode: 'DEV001OCH',
      location: 'Sección Devocionales',
      shelf: 'C-2',
      publishYear: 1935,
      pages: 384,
      format: 'Tapa Blanda',
      language: 'Español',
      estado: 'Disponible'
    },
    {
      id: '4',
      img: 'https://images.unsplash.com/photo-1595733533725-1a6bce052b84?auto=format&fit=crop&w=400&q=80',
      titulo: 'Historia de la Iglesia Cristiana',
      autor: 'Justo L. González',
      categoria: 'Historia',
      catalogCode: 'HIS001JGZ',
      location: 'Sección Historia',
      shelf: 'D-1',
      publishYear: 1994,
      pages: 658,
      format: 'Tapa Dura',
      language: 'Español',
      estado: 'Disponible'
    },
    {
      id: '5',
      img: 'https://images.unsplash.com/photo-1622724316148-1e179e5589f2?auto=format&fit=crop&w=400&q=80',
      titulo: 'Himnario Bautista',
      autor: 'Convención Bautista',
      categoria: 'Himnarios',
      catalogCode: 'HIM001CBT',
      location: 'Sección Música',
      shelf: 'E-1',
      publishYear: 2010,
      pages: 560,
      format: 'Espiral',
      language: 'Español',
      estado: 'Disponible'
    },
    {
      id: '6',
      img: 'https://images.unsplash.com/photo-1624935048859-9b3c9cc5ddf8?auto=format&fit=crop&w=400&q=80',
      titulo: 'El Libro de Oración Común',
      autor: 'Iglesia Episcopal',
      categoria: 'Oración',
      catalogCode: 'ORA001IEP',
      location: 'Sección Liturgia',
      shelf: 'F-2',
      publishYear: 1979,
      pages: 1001,
      format: 'Tapa Dura',
      language: 'Español',
      estado: 'En Reparación'
    },
    {
      id: '7',
      img: 'https://images.unsplash.com/photo-1638276630550-36cccfdff836?auto=format&fit=crop&w=400&q=80',
      titulo: 'Nuevo Testamento Interlineal',
      autor: 'Francisco Lacueva',
      categoria: 'Sagradas Escrituras',
      catalogCode: 'BIB002FLC',
      location: 'Estantería Principal',
      shelf: 'A-2',
      publishYear: 1984,
      pages: 896,
      format: 'Tapa Blanda',
      language: 'Español',
      estado: 'Disponible'
    },
    {
      id: '8',
      img: 'https://images.unsplash.com/photo-1654193404293-886297721ca7?auto=format&fit=crop&w=400&q=80',
      titulo: 'Teología del Pacto',
      autor: 'Michael Horton',
      categoria: 'Teología',
      catalogCode: 'TEO002MHR',
      location: 'Sección Teología',
      shelf: 'B-4',
      publishYear: 2006,
      pages: 432,
      format: 'Tapa Blanda',
      language: 'Español',
      estado: 'Prestado'
    }
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown-container')) {
      this.dropdownOpen = false;
    }
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

  
  get librosFiltrados(): Libro[] {
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


  get librosRecientes(): Libro[] {
    return this.libros.slice(-4);
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


  filtrarCategoria(categoria: CategoriaKey): void {
    this.categoriaSeleccionada = categoria;
  }


  esCategoriaActiva(categoria: CategoriaKey): boolean {
    return this.categoriaSeleccionada === categoria;
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'disponible';
      case 'Prestado': return 'prestado';
      case 'En Reparación': return 'reparacion';
      default: return 'disponible';
    }
  }

  
  verTodos(): void {
    console.log('Ver todos los libros');
  }
}
