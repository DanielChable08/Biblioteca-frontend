import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { PrestamoService } from '../../services/prestamo.service';
import { UsuarioService } from '../../services/usuario.service';
import { CatalogService } from '../../services/catalog.service'; 
import { Usuario } from '../../models/usuario';
import { Prestamo } from '../../models/prestamo';
import { Catalogo } from '../../models/biblioteca';

@Component({
  selector: 'app-prestamo-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    DatePipe
  ],
  templateUrl: './prestamo-lista.html',
  styleUrls: ['./prestamo-lista.css']
})
export default class PrestamoListaComponent implements OnInit {
  
  private usuarioService = inject(UsuarioService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  
  prestamos: Prestamo[] = [];
  personasMap = new Map<number, string>();
  estadosMap = new Map<number, string>();
  loading = false;
  globalFilter: string = '';


  mockPersonas: Usuario[] = [
    { id: 101, nombre: 'Juan', apPaterno: 'Pérez', telefono: '999111', email: 'j@p.com', uuid: 'uuid-juan', idTipoPersona: 1 },
    { id: 102, nombre: 'Ana', apPaterno: 'López', telefono: '999222', email: 'a@l.com', uuid: 'uuid-ana', idTipoPersona: 2 },
    { id: 201, nombre: 'Carlos', apPaterno: 'Sánchez', telefono: '999333', email: 'c@s.com', uuid: 'uuid-carlos', idTipoPersona: 3 },
  ];
  
  mockEstados: Catalogo[] = [
    { id: 1, nombre: 'Activo', uuid: 'uuid-activo' },
    { id: 2, nombre: 'Devuelto', uuid: 'uuid-devuelto' },
    { id: 3, nombre: 'Atrasado', uuid: 'uuid-atrasado' },
  ];

  mockPrestamos: Prestamo[] = [
    { id: 1, uuid: 'uuid-p1', fechaPrestamo: '2025-10-20T10:00:00Z', fechaDevolucion: '2025-10-27T10:00:00Z', idBibliotecario: 102, idLector: 201, idEstadoPrestamo: 1 },
    { id: 2, uuid: 'uuid-p2', fechaPrestamo: '2025-10-15T14:30:00Z', fechaDevolucion: '2025-10-22T14:30:00Z', idBibliotecario: 102, idLector: 101, idEstadoPrestamo: 2 },
    { id: 3, uuid: 'uuid-p3', fechaPrestamo: '2025-09-01T11:00:00Z', fechaDevolucion: '2025-09-08T11:00:00Z', idBibliotecario: 102, idLector: 201, idEstadoPrestamo: 3 },
  ];


  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    this.loading = true;
    
    this.mockPersonas.forEach(p => this.personasMap.set(p.id, `${p.nombre} ${p.apPaterno}`));
    this.mockEstados.forEach(e => this.estadosMap.set(e.id, e.nombre));

    this.prestamos = this.mockPrestamos.map(p => ({
      ...p,
      lector: this.mockPersonas.find(lector => lector.id === p.idLector),
      bibliotecario: this.mockPersonas.find(bib => bib.id === p.idBibliotecario),
      estadoPrestamo: this.mockEstados.find(e => e.id === p.idEstadoPrestamo)
    }));
    
    setTimeout(() => { this.loading = false; }, 200);
  }

  /*
  // --- CÓDIGO REAL COMENTADO ---
  loadData(): void {
    this.loading = true;
    forkJoin({
      prestamos: this.prestamoService.getPrestamos(),
      personas: this.usuarioService.getUsuarios(), // Asume que esto trae todas las personas
      estados: this.catalogService.getEstadosPrestamos() // Asume que existe este método
    }).pipe(
      map(({ prestamos, personas, estados }) => {
        // Crear mapas para búsqueda rápida
        personas.forEach(p => this.personasMap.set(p.id, `${p.nombre} ${p.apPaterno}`));
        estados.forEach(e => this.estadosMap.set(e.id, e.nombre));

        // Mapear los datos reales
        return prestamos.map(p => ({
          ...p,
          lector: personas.find(lector => lector.id === p.idLector),
          bibliotecario: personas.find(bib => bib.id === p.idBibliotecario),
          estadoPrestamo: estados.find(e => e.id === p.idEstadoPrestamo)
        }));
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (prestamosMapeados) => {
        this.prestamos = prestamosMapeados;
      },
      error: (err: any) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los préstamos.' });
        console.error(err);
      }
    });
  }
  */

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  agregarPrestamo(): void {
    this.router.navigate(['admin/prestamos/nuevo']);
  }

  editarPrestamo(prestamo: Prestamo): void {
    this.router.navigate(['/admin/prestamos/editar', prestamo.uuid]);
  }

  verDetalles(prestamo: Prestamo): void {
    console.log("Ver detalles de préstamo:", prestamo.uuid);
    // this.dialogService.open(PrestamoDetalleComponent, { data: { uuid: prestamo.uuid } });
  }

  eliminarPrestamo(prestamo: Prestamo): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de anular el préstamo #${prestamo.id}? Esta acción no se puede deshacer.`,
      header: 'Confirmar anulación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, anular',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger custom-accept-button',
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Préstamo anulado (simulado).' });
        this.prestamos = this.prestamos.filter(p => p.id !== prestamo.id);

        /*
        // --- CÓDIGO REAL COMENTADO ---
        this.loading = true;
        this.prestamoService.deletePrestamo(prestamo.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Préstamo anulado.' });
            this.prestamos = this.prestamos.filter(p => p.id !== prestamo.id);
          },
          error: (err: any) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo anular el préstamo.' });
            console.error(err);
          }
        });
        */
      }
    });
  }

  applyFilterGlobal(table: any, event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any) {
    this.globalFilter = '';
    table.clear();
  }

  getEstadoClass(estadoNombre: string = ''): string {
    switch (estadoNombre.toLowerCase()) {
      case 'activo': return 'status-activo';
      case 'devuelto': return 'status-devuelto';
      case 'atrasado': return 'status-atrasado';
      default: return 'status-desconocido';
    }
  }
}