import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { MultaService } from '../../services/multa.service';
import { PoliticaMulta } from '../../models/biblioteca';

@Component({
  selector: 'app-politicas-multas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, 
    InputTextModule, TooltipModule, ToastModule, CurrencyPipe,
    CheckboxModule, DialogModule, ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './politicas-multas.html',
  styleUrls: ['./politicas-multas.css']
})
export class PoliticasMultasComponent implements OnInit {
  private multaService = inject(MultaService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  politicas: PoliticaMulta[] = [];
  loading: boolean = false;
  mostrarDialogo: boolean = false;
  esEdicion: boolean = false;
  guardando: boolean = false;

  // CORRECCIÓN AQUÍ: Usamos 'as PoliticaMulta' para que no marque error
  // aunque falte id y uuid en este momento inicial.
  politicaForm: PoliticaMulta = {
    diasGracia: 0,
    multaDiaria: 0,
    multaMaxima: null,
    vigente: false
  } as PoliticaMulta;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.multaService.getPoliticasConfig().pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (data) => this.politicas = data,
        error: () => this.msg('error', 'Error', 'No se cargaron las políticas')
      });
  }

  abrirModalCrear(): void {
    this.esEdicion = false;
    // CORRECCIÓN AQUÍ TAMBIÉN: Reiniciamos forzando el tipo
    this.politicaForm = { 
      diasGracia: 0, 
      multaDiaria: 0, 
      multaMaxima: null, 
      vigente: false 
    } as PoliticaMulta;
    this.mostrarDialogo = true;
  }

  abrirModalEditar(politica: PoliticaMulta): void {
    this.esEdicion = true;
    // Aquí sí copiamos todo (incluyendo id y uuid que ya vienen del backend)
    this.politicaForm = { ...politica }; 
    this.mostrarDialogo = true;
  }

  guardar(): void {
    if (this.politicaForm.multaDiaria < 0) return;
    this.guardando = true;

    if (this.esEdicion && this.politicaForm.uuid) {
      this.multaService.updatePolitica(this.politicaForm.uuid, this.politicaForm)
        .pipe(finalize(() => this.guardando = false))
        .subscribe({
          next: () => { this.mostrarDialogo = false; this.loadData(); this.msg('success', 'Éxito', 'Actualizado'); },
          error: () => this.msg('error', 'Error', 'Fallo al actualizar')
        });
    } else {
      this.multaService.createPolitica(this.politicaForm)
        .pipe(finalize(() => this.guardando = false))
        .subscribe({
          next: () => { this.mostrarDialogo = false; this.loadData(); this.msg('success', 'Éxito', 'Creado'); },
          error: () => this.msg('error', 'Error', 'Fallo al crear')
        });
    }
  }

  eliminar(politica: PoliticaMulta): void {
    this.confirmationService.confirm({
      message: '¿Eliminar esta política?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (politica.uuid) {
          this.multaService.deletePolitica(politica.uuid).subscribe({
            next: () => { this.loadData(); this.msg('success', 'Éxito', 'Eliminado'); },
            error: () => this.msg('error', 'Error', 'No se pudo eliminar')
          });
        }
      }
    });
  }

  applyFilterGlobal(table: any, event: Event) { (event.target as HTMLInputElement).value && table.filterGlobal((event.target as HTMLInputElement).value, 'contains'); }
  clearFilter(table: any) { table.clear(); }
  msg(severity: string, summary: string, detail: string) { this.messageService.add({ severity, summary, detail }); }
  regresar() { this.router.navigate(['/admin']); }
}