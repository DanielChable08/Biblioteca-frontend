import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast'; 

import { PersonaService } from '../../services/persona.service';
import { PagoService } from '../../services/pago.service';
import { CatalogService } from '../../services/catalog.service';
import { Persona, TipoPersona } from '../../models/biblioteca';

@Component({
  selector: 'app-persona-detalle',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, TooltipModule, ToastModule],
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
  private messageService = inject(MessageService);

  personaUuid: string | null = null;
  persona: Persona | null = null;
  tiposPersona: TipoPersona[] = [];
  loading = true;
  loadingPagos = false;

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
        this.cargarDatosAdicionales(persona.id);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el perfil.' });
        this.router.navigate(['/admin/personas']);
      }
    });
  }

  cargarDatosAdicionales(idPersona: number): void {
    this.prestamos = [];
    this.multas = [];

    this.loadingPagos = true;
    this.pagoService.getPagos().subscribe({
      next: (todosLosPagos: any[]) => {
        this.pagos = todosLosPagos
          .filter(p => p.lectorPago === idPersona)
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

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX');
  }

  formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  }

  getEstadoSeverity(anulado: boolean): 'success' | 'danger' | 'info' | 'warning' | 'secondary' | 'contrast' | undefined {
    return anulado ? 'danger' : 'success';
  }

  getEstadoTexto(anulado: boolean): string {
    return anulado ? 'ANULADO' : 'PAGADO';
  }

  volver(): void {
    this.router.navigate(['/admin/personas']);
  }
}