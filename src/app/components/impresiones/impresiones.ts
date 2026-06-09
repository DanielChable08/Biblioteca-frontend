import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { EjemplarService } from '../../services/ejemplar.service';
import { environment } from '../../../environments/environment';
import { EjemplarImpresion } from '../../models/biblioteca';
import { TruncatePipe } from '../../pipes/truncate.pipe';

import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
    SelectButtonModule,
    TruncatePipe
  ],
  templateUrl: './impresiones.html',
  styleUrls: ['./impresiones.css']
})
export default class ImpresionesComponent implements OnInit {
  private ejemplarService = inject(EjemplarService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  libraryName = environment.libraryName;
  ejemplares: EjemplarImpresion[] = [];
  ejemplaresFiltrados: EjemplarImpresion[] = [];
  ejemplaresSeleccionados: EjemplarImpresion[] = [];

  modoImpresion: 'barras' | 'lomo' | 'horizontal' = 'barras';

  opcionesModo = [
    { label: 'Código de Barras', value: 'barras', icon: 'pi pi-barcode' },
    { label: 'Identificador Vertical', value: 'lomo', icon: 'pi pi-bookmark' },
    { label: 'Identificador Horiz.', value: 'horizontal', icon: 'pi pi-arrows-v' }
  ];

  opcionesEstilo = [
    { label: 'Compacta', value: 'compacta', icon: 'pi pi-barcode' },
    { label: 'Moderna', value: 'moderna', icon: 'pi pi-bookmark' },
  ];

  tamanosBarras = [
    { label: 'Pequeña (4cm x 2.5cm)', value: 'pequena' },
    { label: 'Estandar (5cm x 3cm)', value: 'mediana' },
    { label: 'Grande (6cm x 4cm)', value: 'grande' }
  ];

  tamanosLomo = [
    { label: 'Chico (1.5cm x 5cm)', value: 'lomo-delgado' },
    { label: 'Mediano (2.0cm x 5cm)', value: 'lomo-estandar' },
    { label: 'Grande (2.5cm x 5cm)', value: 'lomo-ancho' }
  ];

  tamanosDisponibles = this.tamanosBarras;
  tamanoEtiqueta: string = 'mediana';
  estiloSeleccionado: string = 'compacta';

  mostrarISBN = true;
  mostrarUbicacion = true;
  filtroTexto = '';

  vistaPrevia = false;
  preparandoImpresion = false;
  preparandoPDF = false;
  progresoPDF: string = '';
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

    this.ejemplarService.listarEjemplaresImpresion()
      .pipe(
        map(ejemplares =>
          ejemplares.map(ejemplar => ({
            ...ejemplar,
            isbn: this.formatearISBN(ejemplar.isbn),
            ubicacion: ejemplar.ubicacion ?? '-',
            codigoDewey: ejemplar.codigoDewey ?? '-',
            codigoCutter: ejemplar.codigoCutter ?? '-',
            cutter: this.formatearAutores(ejemplar.autores).substring(0, 3).toUpperCase()
          }))
        )
      )
      .subscribe({
        next: (ejemplaresCompletos) => {
          this.ejemplares = ejemplaresCompletos;
          this.ejemplaresFiltrados = ejemplaresCompletos;
          this.cargando = false;
        },
        error: (error) => {
          console.error(error);
          this.cargando = false;
        }
      });
  }

  formatearAutores(autores: string[]): string {
    return autores.join(', ');
  }

  filtrarEjemplares(): void {
    const filtro = this.filtroTexto.toLowerCase().trim();
    if (!filtro) {
      this.ejemplaresFiltrados = this.ejemplares;
      return;
    }
    this.ejemplaresFiltrados = this.ejemplares.filter(ejemplar => {
      return (ejemplar.codigo?.toLowerCase() || '').includes(filtro) ||
        (ejemplar.titulo?.toLowerCase() || '').includes(filtro) ||
        ejemplar.autores.join(' ').toLowerCase().includes(filtro)
    });
  }

  isEjemplarSeleccionado(ejemplar: EjemplarImpresion): boolean {
    return this.ejemplaresSeleccionados.some(e => e.id === ejemplar.id);
  }

  toggleEjemplar(ejemplar: EjemplarImpresion): void {
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


  descargarPDF(): void {
    if (this.ejemplaresSeleccionados.length === 0) return;

    this.preparandoPDF = true;
    this.messageService.add({ severity: 'info', summary: 'Generando PDF', detail: 'Procesando archivo HD, por favor espere...' });

    this.cdr.detectChanges();

    setTimeout(async () => {
      try {
        this.preparandoImpresion = true;
        this.cdr.detectChanges();

        if (this.modoImpresion === 'barras') {
          this.generarCodigosBarras('print');
        }

        await new Promise(r => setTimeout(r, 150));

        const printContainer = document.querySelector('.print-page');
        if (!printContainer) throw new Error('No se encontró el contenedor');

        const etiquetasNodes = Array.from(printContainer.querySelectorAll('.etiqueta-print, .etiqueta-lomo-print'));

        let itemsPerPage = 32;
        if (this.modoImpresion === 'barras') {
          if (this.tamanoEtiqueta === 'pequena') itemsPerPage = 40;
          else if (this.tamanoEtiqueta === 'mediana') itemsPerPage = 32;
          else if (this.tamanoEtiqueta === 'grande') itemsPerPage = 18;
        } else {
          if (this.tamanoEtiqueta === 'lomo-delgado') itemsPerPage = 55;
          else if (this.tamanoEtiqueta === 'lomo-estandar') itemsPerPage = 40;
          else if (this.tamanoEtiqueta === 'lomo-ancho') itemsPerPage = 35;
        }

        const pdf = new jsPDF('p', 'mm', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();


        const offScreenContainer = document.createElement('div');
        offScreenContainer.style.position = 'fixed';
        offScreenContainer.style.top = '-9999px';
        offScreenContainer.style.left = '-9999px';
        offScreenContainer.style.width = '215.9mm';
        offScreenContainer.style.background = 'white';
        offScreenContainer.style.zIndex = '-1';
        document.body.appendChild(offScreenContainer);

        const gridClass = this.modoImpresion === 'barras' ? 'etiquetas-grid-print' : 'etiquetas-lomo-grid-print';

        for (let i = 0; i < etiquetasNodes.length; i += itemsPerPage) {
          if (i > 0) pdf.addPage();

          offScreenContainer.innerHTML = '';

          const pageDiv = document.createElement('div');
          pageDiv.style.width = '215.9mm';
          pageDiv.style.height = '279.4mm';
          pageDiv.style.padding = '10mm';
          pageDiv.style.boxSizing = 'border-box';
          pageDiv.style.background = 'white';

          const grid = document.createElement('div');
          grid.className = gridClass;
          grid.style.display = 'grid';
          grid.style.justifyContent = 'center';
          grid.style.alignItems = 'flex-start';

          if (this.modoImpresion === 'barras') {
            grid.style.gap = '0.25cm';
            if (this.tamanoEtiqueta === 'pequena') grid.style.gridTemplateColumns = 'repeat(4, 4cm)';
            else if (this.tamanoEtiqueta === 'mediana') grid.style.gridTemplateColumns = 'repeat(4, 4.8cm)';
            else if (this.tamanoEtiqueta === 'grande') grid.style.gridTemplateColumns = 'repeat(3, 6cm)';
          } else {
            grid.style.rowGap = '0.5cm';
            grid.style.columnGap = '0.2cm';
            if (this.tamanoEtiqueta === 'lomo-delgado') grid.style.gridTemplateColumns = 'repeat(11, 1.5cm)';
            else if (this.tamanoEtiqueta === 'lomo-estandar') grid.style.gridTemplateColumns = 'repeat(8, 2.0cm)';
            else if (this.tamanoEtiqueta === 'lomo-ancho') grid.style.gridTemplateColumns = 'repeat(7, 2.5cm)';
          }

          const chunk = etiquetasNodes.slice(i, i + itemsPerPage);
          chunk.forEach(nodo => {
            grid.appendChild(nodo.cloneNode(true));
          });
          pageDiv.appendChild(grid);
          offScreenContainer.appendChild(pageDiv);

          const canvas = await html2canvas(pageDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: -window.scrollY
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgProps = pdf.getImageProperties(imgData);
          const imgH = (imgProps.height * pdfWidth) / imgProps.width;

          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgH);
        }

        document.body.removeChild(offScreenContainer);
        this.preparandoImpresion = false;

        const fecha = new Date().toISOString().slice(0, 10);
        pdf.save(`Etiquetas_${this.modoImpresion}_${fecha}.pdf`);

        this.preparandoPDF = false;
        this.cdr.detectChanges();
        this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'PDF generado correctamente.' });

      } catch (error) {
        console.error('Error generando PDF:', error);
        this.preparandoImpresion = false;
        this.preparandoPDF = false;
        this.cdr.detectChanges();
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Falló la generación del PDF' });
      }
    }, 50);
  }

  private generarCodigosBarras(tipo: 'preview' | 'print' | 'pdf'): void {
    if (this.modoImpresion === 'lomo' || this.modoImpresion === 'horizontal') return;

    this.ejemplaresSeleccionados.forEach((ejemplar, index) => {
      const svgId = `barcode-${tipo}-${index}`;
      const svgElement = document.getElementById(svgId);

      if (svgElement) {
        try {
          const config: any = {
            format: 'CODE128',
            displayValue: false,
            margin: 0,
            textMargin: 0,
            fontSize: 14,
            background: '#ffffff'
          };

          if (this.tamanoEtiqueta === 'pequena') {
            config.width = 1.7;
            config.height = 25;
          } else if (this.tamanoEtiqueta === 'mediana') {
            config.width = 2.0;
            config.height = 35;
          } else {
            config.width = 2.2;
            config.height = 40;
          }

          JsBarcode(svgElement, ejemplar.codigo, config);
        } catch (error) {
          console.error(`Error generando barcode ${ejemplar.codigo}`, error);
        }
      }
    });
  }

  private formatearISBN(isbn: string | undefined): string | undefined {
    const tieneX = isbn?.toUpperCase().endsWith('X');

    const numeros = isbn?.replace(/[^0-9]/g, '');

    if (numeros?.length === 13) {
      return numeros.replace(
        /(\d{3})(\d{1})(\d{3})(\d{5})(\d{1})/,
        '$1-$2-$3-$4-$5'
      );
    }

    if (numeros?.length === 10) {
      return numeros.replace(
        /(\d{1})(\d{3})(\d{5})(\d{1})/,
        '$1-$2-$3-$4'
      );
    }

    if (numeros?.length === 9 && tieneX) {
      return numeros.replace(
        /(\d{1})(\d{3})(\d{5})/,
        '$1-$2-$3-X'
      );
    }

    return isbn;
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }
}