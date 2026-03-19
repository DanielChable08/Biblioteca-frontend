import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { MultaService } from '../../services/multa.service';
import { PrestamoService } from '../../services/prestamo.service';
import { AuthService } from '../../services/auth.service';
import { Multa } from '../../models/biblioteca';

@Component({
  selector: 'app-multa-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    DialogModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    DatePipe
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './multa-lista.html',
  styleUrls: ['./multa-lista.css']
})
export class MultaListaComponent implements OnInit {
  private multaService = inject(MultaService);
  private prestamoService = inject(PrestamoService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  get isAdmin(): boolean {
      return this.authService.isAdmin();
  }

  multas: any[] = [];
  loading = false;
  globalFilter: string = '';
  private origenNavegacion: 'admin' | 'prestamos' = 'admin';

  ngOnInit(): void {
    const origen = sessionStorage.getItem('multasOrigen');
    if (origen === 'prestamos') {
      this.origenNavegacion = 'prestamos';
    }
    console.log(' Multas - Origen:', this.origenNavegacion);
    
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      multas: this.multaService.getMultas(),
      estados: this.multaService.getEstadosMultas(),
      motivos: this.multaService.getMotivosMultas(),
      personas: this.prestamoService.getPersonas()
    }).pipe(
      map(({ multas, estados, motivos, personas }) => {
        const personasMap = new Map();
        personas.forEach(p => {
          personasMap.set(p.id, `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`.trim());
        });

        return multas.map(m => {
          const lectorNombre = personasMap.get(m.idPersona) || 'N/A';

          return {
            ...m,
            estadoMulta: estados.find(e => e.id === m.idEstadoMulta),
            motivoMulta: motivos.find(mo => mo.id === m.idMotivoMulta),
            lectorNombre: lectorNombre,
            diasRetraso: m.diasRetraso || 0
          };
        });
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (multasMapeadas) => {
        this.multas = multasMapeadas;
      },
      error: (err: any) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar las multas.' 
        });
        console.error(' Error al cargar multas:', err);
      }
    });
  }

  condonarMulta(multa: any): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de condonar esta multa de $${multa.monto}?`,
      header: 'Confirmar Condonación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, condonar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success custom-accept-button',
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.loading = true;
        this.multaService.condonarMulta(multa.id).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Multa condonada correctamente.' 
            });
            this.loadData();
          },
          error: (err: any) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo condonar la multa.' 
            });
            console.error('Error al condonar multa:', err);
          }
        });
      }
    });
  }

  registrarPago(multa: any): void {
    sessionStorage.setItem('multaIdSeleccionada', multa.id.toString());
    this.router.navigate(['admin/multas/pagar']);
  }

  regresar(): void {
    console.log('🔙 Regresando a:', this.origenNavegacion);
    
    sessionStorage.removeItem('multasOrigen');
    
    if (this.origenNavegacion === 'prestamos') {
      this.router.navigate(['/admin/prestamos']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  applyFilterGlobal(table: any, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    table.clear();
  }

  getEstadoClass(estadoNombre: string = ''): string {
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
}
