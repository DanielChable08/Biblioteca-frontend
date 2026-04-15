import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { finalize, forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';

import { PersonaService } from '../../services/persona.service';
import { CatalogService } from '../../services/catalog.service';
import { Persona, TipoPersona } from '../../models/biblioteca';

@Component({
  selector: 'app-personas-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    FormsModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    CardModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './personas-lista.html',
  styleUrls: ['./personas-lista.css']
})
export default class PersonasListComponent implements OnInit {
  private personaService = inject(PersonaService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  personas: Persona[] = [];
  tiposPersona: TipoPersona[] = [];
  loading = true;
  searchValue = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    forkJoin({
      personas: this.personaService.getPersonas(),
      tiposPersona: this.catalogService.getTiposPersonas()
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ personas, tiposPersona }) => {
        this.personas = personas;
        this.tiposPersona = tiposPersona;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las personas.'
        });
        console.error(err);
      }
    });
  }

  getTipoPersonaNombre(idTipoPersona: number): string {
    const tipo = this.tiposPersona.find(t => t.id === idTipoPersona);
    return tipo?.nombre || 'Sin tipo';
  }

  getNombreCompleto(persona: Persona): string {
    return `${persona.nombre} ${persona.apPaterno} ${persona.apMaterno || ''}`.trim();
  }

  verHistorialPagos(id: number) {
    this.router.navigate(['/admin/personas', id, 'historial-pagos']);
  }

  abrirPerfil(persona: Persona): void {
    this.router.navigate(['/admin/personas/detalle', persona.uuid]);
  }


  agregarPersona(): void {
    this.router.navigate(['admin/personas/nuevo']);
  }

  editarPersona(uuid: string): void {
    this.router.navigate(['/admin/personas/editar', uuid]);
  }

  eliminarPersona(persona: Persona, event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `¿Estás seguro de eliminar a ${this.getNombreCompleto(persona)}?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.personaService.deletePersona(persona.uuid).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Persona eliminada correctamente.'
            });
            this.loadData();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la persona.'
            });
            console.error(err);
          }
        });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/admin']);
  }

  clear(table: any) {
    table.clear();
    this.searchValue = '';
  }
}
