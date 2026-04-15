import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http'; 

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast'; 

import { PersonaService } from '../../services/persona.service';
import { PagoService } from '../../services/pago.service';
import { CatalogService } from '../../services/catalog.service';
import { PrestamoService } from '../../services/prestamo.service';
import { MultaService } from '../../services/multa.service';
import { Persona, TipoPersona } from '../../models/biblioteca';

@Component({
  selector: 'app-persona-detalle',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, TooltipModule, ToastModule, RouterModule],
  providers: [MessageService],
  templateUrl: './persona-detalle.html',
  styleUrls: ['./persona-detalle.css']
})
export default class PersonaDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private personaService = inject(PersonaService);
  private pagoService = inject(PagoService);
  private catalogService = inject(CatalogService);
  private prestamoService = inject(PrestamoService);
  private multaService = inject(MultaService);
  private messageService = inject(MessageService);

  personaUuid: string | null = null;
  persona: Persona | null = null;
  tiposPersona: TipoPersona[] = [];
  loading = true;
  loadingPagos = false;
  loadingPrestamosYMultas = false;

  activeTab: 'prestamos' | 'multas' | 'pagos' = 'prestamos';

  prestamos: any[] = [];
  multas: any[] = [];
  pagos: any[] = [];

  ngOnInit(): void {
    this.personaUuid = this.route.snapshot.paramMap.get('uuid');
    if (this.personaUuid) {
      this.loadPersonaDetalle(this.personaUuid);
    }
  }

  loadPersonaDetalle(uuid: string): void {
    this.loading = true;
    
    forkJoin({
      persona: this.personaService.getPersonaByUuid(uuid),
      tipos: this.catalogService.getTiposPersonas().pipe(catchError(() => of([]))) 
    }).subscribe({
      next: ({ persona, tipos }) => {
        this.persona = persona;
        this.tiposPersona = tipos;
        
        this.cargarPagos(persona.id);
        this.cargarHistoriales(persona.id); 
        
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el perfil.' });
        this.router.navigate(['/admin/personas']);
      }
    });
  }

  cargarHistoriales(idPersona: number): void {
    this.loadingPrestamosYMultas = true;
    
    forkJoin({
      prestamos: this.prestamoService.getPrestamos().pipe(catchError(() => of([]))),
      multas: this.multaService.getMultas().pipe(catchError(() => of([]))),
      personas: this.prestamoService.getPersonas().pipe(catchError(() => of([]))),
      estadosPrestamo: this.catalogService.getEstadosPrestamos().pipe(catchError(() => of([]))),
      estadosMulta: this.multaService.getEstadosMultas().pipe(catchError(() => of([]))),
      motivosMulta: this.multaService.getMotivosMultas().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        
        const misPrestamos = res.prestamos.filter((p: any) => p.idLector === idPersona);
        this.prestamos = misPrestamos.map((p: any) => ({
          ...p,
          bibliotecario: res.personas.find(bib => bib.id === p.idBibliotecario) || p.bibliotecario,
          estadoPrestamo: res.estadosPrestamo.find(e => e.id === p.idEstadoPrestamo) || p.estadoPrestamo
        })).sort((a, b) => new Date(b.fechaPrestamo).getTime() - new Date(a.fechaPrestamo).getTime());

        // 2. FILTRAMOS Y MAPEAMOS MULTAS
        const misMultas = res.multas.filter((m: any) => m.idPersona === idPersona);
        this.multas = misMultas.map((m: any) => ({
          ...m,
          estadoMulta: res.estadosMulta.find(e => e.id === m.idEstadoMulta) || m.estadoMulta,
          motivoMulta: res.motivosMulta.find(mo => mo.id === m.idMotivoMulta) || m.motivoMulta,
          diasRetraso: m.diasRetraso || 0
        })).sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());

        this.loadingPrestamosYMultas = false;
      },
      error: () => { this.loadingPrestamosYMultas = false; }
    });
  }

  cargarPagos(idPersona: number): void {
    this.pagos = [];
    this.loadingPagos = true;
    
    this.pagoService.getPagos().subscribe({
      next: (todosLosPagos: any[]) => {
        this.pagos = todosLosPagos
          .filter(p => p.lectorPago === idPersona || p.lectorPago?.id === idPersona)
          .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
        
        this.loadingPagos = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pagos.' });
        this.loadingPagos = false;
      }
    });
  }

  getNombreCompleto(): string {
    if (!this.persona) return '';
    return `${this.persona.nombre} ${this.persona.apPaterno} ${this.persona.apMaterno || ''}`.trim();
  }

  getTipoPersonaNombre(idTipoPersona: number): string {
    const tipo = this.tiposPersona.find(t => t.id === idTipoPersona);
    return tipo?.nombre || 'Sin tipo';
  }

  getIniciales(): string {
    if (!this.persona) return '';
    return (this.persona.nombre.charAt(0) + (this.persona.apPaterno?.charAt(0) || '')).toUpperCase();
  }

  getEstadoPrestamoClass(estadoNombre: string = ''): string {
    const estado = estadoNombre.toLowerCase();
    switch (estado) {
      case 'activo': return 'status-activo';
      case 'devuelto': 
      case 'devuelto a tiempo': 
      case 'completado a tiempo': return 'status-devuelto';
      case 'atrasado':
      case 'devuelto tarde': 
      case 'completado con retardo': return 'status-atrasado';
      case 'parcialmente devuelto': return 'status-parcial';
      default: return 'status-desconocido';
    }
  }

  getEstadoMultaClass(estadoNombre: string = ''): string {
    switch (estadoNombre.toLowerCase()) {
      case 'emitida': return 'status-emitida';
      case 'pendiente': return 'status-pendiente';
      case 'pagada': return 'status-pagada';
      case 'condonada': return 'status-condonada';
      default: return 'status-desconocido';
    }
  }

  getDiasRetrasoClass(dias: number): string {
    if (dias === 0) return 'dias-normal';
    if (dias <= 5) return 'dias-advertencia';
    if (dias <= 15) return 'dias-critico';
    return 'dias-grave';
  }

  getEstadoSeverity(anulado: boolean): 'success' | 'danger' {
    return anulado ? 'danger' : 'success';
  }

  getEstadoTexto(anulado: boolean): string {
    return anulado ? 'ANULADO' : 'PAGADO';
  }

  volver(): void {
    this.router.navigate(['/admin/personas']);
  }
}