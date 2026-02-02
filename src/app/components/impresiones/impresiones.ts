import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';

import { EjemplarService } from '../../services/ejemplar.service';
import { BookService } from '../../services/book.service';
import { CatalogService } from '../../services/catalog.service';
import { Ejemplar } from '../../models/biblioteca';

interface EjemplarExtendido extends Ejemplar {
  libroTitulo?: string;
  libroISBN?: string;
  autoresNombres?: string;
  cutter?: string; // Para la etiqueta de lomo
}

@Component({
  selector: 'app-impresiones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    CheckboxModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    SelectButtonModule
  ],
  templateUrl: './impresiones.html',
  styleUrls: ['./impresiones.css']
})
export default class ImpresionesComponent implements OnInit {
  private ejemplarService = inject(EjemplarService);
  private bookService = inject(BookService);
  private catalogService = inject(CatalogService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ejemplares: EjemplarExtendido[] = [];
  ejemplaresFiltrados: EjemplarExtendido[] = [];
  ejemplaresSeleccionados: EjemplarExtendido[] = [];

  modoImpresion: 'barras' | 'lomo' = 'barras';
  
  opcionesModo = [
    { label: 'Código de Barras', value: 'barras', icon: 'pi pi-barcode' },
    { label: 'Etiqueta de Identificador', value: 'lomo', icon: 'pi pi-bookmark' }
  ];

  tamanosBarras = [
    { label: 'Pequeña (4cm x 2.5cm)', value: 'pequena' },
    { label: 'Estandar (5cm x 3cm)', value: 'mediana' },
    { label: 'Grande (6cm x 4cm)', value: 'grande' }
  ];

  // Tamaños para Lomo
  tamanosLomo = [
    { label: 'Delgado (2cm x 5cm)', value: 'lomo-delgado' },
    { label: 'Estándar (3cm x 5cm)', value: 'lomo-estandar' },
    { label: 'Ancho (4cm x 5cm)', value: 'lomo-ancho' }
  ];

  tamanosDisponibles = this.tamanosBarras;
  tamanoEtiqueta: string = 'mediana';

  mostrarISBN = true;
  mostrarUbicacion = true;
  filtroTexto = '';

  vistaPrevia = false;
  preparandoImpresion = false;
  preparandoPDF = false;
  cargando = false;

  ngOnInit(): void {
    this.cargarEjemplares();
  }

  cambiarModo(evento: any): void {
    if (this.modoImpresion === 'barras') {
      this.tamanosDisponibles = this.tamanosBarras;
      this.tamanoEtiqueta = 'mediana';
    } else {
      this.tamanosDisponibles = this.tamanosLomo;
      this.tamanoEtiqueta = 'lomo-estandar';
    }
    
    if (this.vistaPrevia && this.modoImpresion === 'barras') {
       setTimeout(() => this.generarCodigosBarras('preview'), 100);
    }
  }

  cargarEjemplares(): void {
    this.cargando = true;

    forkJoin({
      ejemplares: this.ejemplarService.getEjemplares(),
      libros: this.bookService.getLibros(),
      estados: this.catalogService.getEstadosEjemplares()
    }).pipe(
      map(({ ejemplares, libros, estados }) => {
        const autoresRequests = libros.map(libro =>
          this.bookService.getAutoresForLibro(libro.uuid)
        );

        return forkJoin(autoresRequests).pipe(
          map(autoresArray => {
            const librosCompletos = libros.map((libro, index) => ({
              ...libro,
              autores: autoresArray[index]
            }));

            const ejemplaresExtendidos: EjemplarExtendido[] = ejemplares.map(ejemplar => {
              const libro = librosCompletos.find(l => l.id === ejemplar.idLibro);
              const estado = estados.find(e => e.id === ejemplar.idEstadoEjemplar);
              const autoresStr = this.formatearAutores(libro?.autores || []);

              let cutter = 'AAA';
              if (autoresStr && autoresStr !== 'Autor no asignado') {
                  cutter = autoresStr.substring(0, 3).toUpperCase();
              } else if (libro?.titulo) {
                  cutter = libro.titulo.substring(0, 3).toUpperCase();
              }

              return {
                ...ejemplar,
                libro: libro,
                estado: estado,
                libroTitulo: libro?.titulo || 'Sin título',
                libroISBN: libro?.isbn || '',
                autoresNombres: autoresStr,
                cutter: cutter
              };
            });

            return ejemplaresExtendidos;
          })
        );
      })
    ).subscribe({
      next: (observable) => {
        observable.subscribe({
          next: (ejemplaresCompletos) => {
            this.ejemplares = ejemplaresCompletos;
            this.ejemplaresFiltrados = ejemplaresCompletos;
            this.cargando = false;
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Datos cargados correctamente' });
          },
          error: (error) => {
            console.error(error);
            this.cargando = false;
          }
        });
      },
      error: (error) => {
        console.error(error);
        this.cargando = false;
      }
    });
  }

  private formatearAutores(autores: any[]): string {
    if (!autores || autores.length === 0) return 'Autor no asignado';
    return autores.map(a => `${a.nombre} ${a.apPaterno || ''}`.trim()).join(', ');
  }

  filtrarEjemplares(): void {
    const filtro = this.filtroTexto.toLowerCase().trim();
    if (!filtro) {
      this.ejemplaresFiltrados = this.ejemplares;
      return;
    }
    this.ejemplaresFiltrados = this.ejemplares.filter(ejemplar => {
      return (ejemplar.codigo?.toLowerCase() || '').includes(filtro) ||
             (ejemplar.libroTitulo?.toLowerCase() || '').includes(filtro) ||
             (ejemplar.autoresNombres?.toLowerCase() || '').includes(filtro) ||
             (ejemplar.libroISBN?.toLowerCase() || '').includes(filtro);
    });
  }

  isEjemplarSeleccionado(ejemplar: EjemplarExtendido): boolean {
    return this.ejemplaresSeleccionados.some(e => e.id === ejemplar.id);
  }

  toggleEjemplar(ejemplar: EjemplarExtendido): void {
    const index = this.ejemplaresSeleccionados.findIndex(e => e.id === ejemplar.id);
    if (index > -1) this.ejemplaresSeleccionados.splice(index, 1);
    else this.ejemplaresSeleccionados.push(ejemplar);
  }

  seleccionarTodos(): void {
    this.ejemplaresSeleccionados = [...this.ejemplaresFiltrados];
  }

  limpiarSeleccion(): void {
    this.ejemplaresSeleccionados = [];
  }

  // --- VISTA PREVIA ---
  verVistaPrevia(): void {
    if (this.ejemplaresSeleccionados.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Selecciona al menos un ejemplar' });
      return;
    }
    this.vistaPrevia = true;
    
    if (this.modoImpresion === 'barras') {
        setTimeout(() => this.generarCodigosBarras('preview'), 100);
    }
  }

  cerrarVistaPrevia(): void {
    this.vistaPrevia = false;
  }

  // IMPRESIÓN DIRECTA 
  imprimirDirecto(): void {
    if (this.ejemplaresSeleccionados.length === 0) return;

    this.preparandoImpresion = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.modoImpresion === 'barras') this.generarCodigosBarras('print');
      
      setTimeout(() => {
        window.print();
        this.preparandoImpresion = false;
      }, 500);
    }, 100);
  }

  imprimir(): void {
    this.vistaPrevia = false;
    this.imprimirDirecto();
  }

  // DESCARGAR PDF
  descargarPDF(): void {
    if (this.ejemplaresSeleccionados.length === 0) return;

    this.preparandoPDF = true;
    this.messageService.add({ severity: 'info', summary: 'Generando PDF', detail: 'Por favor espere...' });
    this.cdr.detectChanges(); 
    setTimeout(() => {
      if (this.modoImpresion === 'barras') {
        this.generarCodigosBarras('pdf');
      }

      setTimeout(() => {
        const element = document.getElementById('pdf-content');
        if (!element) {
          this.preparandoPDF = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se encontró el contenido' });
          return;
        }

        html2canvas(element, { 
          scale: 2,
          useCORS: true, 
          logging: false,
          backgroundColor: '#ffffff' 
        }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          
          const pdf = new jsPDF('p', 'mm', 'letter');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          
          const imgProps = pdf.getImageProperties(imgData);
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
          
          const fecha = new Date().toISOString().slice(0, 10);
          const tipo = this.modoImpresion === 'barras' ? 'CB' : 'Lomo';
          pdf.save(`Etiquetas_${tipo}_${fecha}.pdf`);
          
          this.preparandoPDF = false;
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'PDF descargado' });
        }).catch(err => {
          console.error(err);
          this.preparandoPDF = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falló la generación del PDF' });
        });
      }, 600);
    }, 100);
  }

  private generarCodigosBarras(tipo: 'preview' | 'print' | 'pdf'): void {
    if (this.modoImpresion === 'lomo') return;

    this.ejemplaresSeleccionados.forEach((ejemplar, index) => {
      const svgId = `barcode-${tipo}-${index}`;
      const svgElement = document.getElementById(svgId);
      
      if (svgElement) {
        try {
          const config: any = { 
            format: 'CODE128', 
            displayValue: false, 
            margin: 0,
            textMargin: 0
          };
          
          if (this.tamanoEtiqueta === 'pequena') {
             config.width = 1.5; config.height = 25;
          } else if (this.tamanoEtiqueta === 'mediana') {
             config.width = 1.8; config.height = 35;
          } else {
             config.width = 2; config.height = 40;
          }
          
          JsBarcode(svgElement, ejemplar.codigo, config);
        } catch (error) {
          console.error(`Error generando barcode ${ejemplar.codigo}`, error);
        }
      }
    });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }
}