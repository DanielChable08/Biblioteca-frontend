import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';

import { UsuarioService } from '../../services/usuario.service';
import { UsuarioCompleto } from '../../models/usuario';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    ChipModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export default class UsuariosListComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  usuarios: UsuarioCompleto[] = [];
  loading = false;
  globalFilter = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.usuarioService
      .getUsuarios()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data) => {
          this.usuarios = data;
          console.log('Usuarios cargados:', this.usuarios);
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los usuarios.'
          });
        }
      });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  agregarUsuario(): void {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }

  editarUsuario(usuario: UsuarioCompleto): void {
    if (!usuario.uuid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Sin identificador',
        detail: 'No se encontró el identificador del usuario.'
      });
      return;
    }
    this.router.navigate(['/admin/usuarios/editar', usuario.uuid]);
  }

  toggleUsuarioStatus(usuario: UsuarioCompleto): void {
    const nombreDisplay =
      usuario.nombre && usuario.nombre !== 'Sin asignar'
        ? `${usuario.nombre} ${usuario.apPaterno}`
        : usuario.email;

    const newStatus = !usuario.active;
    const action = newStatus ? 'activar' : 'desactivar';
    const actionPast = newStatus ? 'activado' : 'desactivado';

    this.confirmationService.confirm({
      message: `¿Estás seguro de ${action} al usuario <strong>${nombreDisplay}</strong>?`,
      header: `Confirmar ${action.charAt(0).toUpperCase() + action.slice(1)}ación`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Sí, ${action}`,
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: newStatus ? 'p-button-success' : 'p-button-warning',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.loading = true;
        this.usuarioService
          .toggleUsuarioStatus(usuario.uuid, newStatus)
          .pipe(finalize(() => (this.loading = false)))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: `Usuario ${actionPast.charAt(0).toUpperCase() + actionPast.slice(1)}`,
                detail: `El usuario ${nombreDisplay} fue ${actionPast} correctamente.`
              });
              usuario.active = newStatus;
            },
            error: (err) => {
              console.error(`Error al ${action}:`, err);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: err.error?.message || `No se pudo ${action} el usuario.`
              });
            }
          });
      }
    });
  }

  eliminarUsuario(usuario: UsuarioCompleto): void {
    const nombreDisplay =
      usuario.nombre && usuario.nombre !== 'Sin asignar'
        ? `${usuario.nombre} ${usuario.apPaterno}`
        : usuario.email;

    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar permanentemente al usuario <strong>${nombreDisplay}</strong>?<br><br>Esta acción NO se puede deshacer.`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.loading = true;
        this.usuarioService
          .deleteUsuario(usuario.uuid)
          .pipe(finalize(() => (this.loading = false)))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Usuario Eliminado',
                detail: `El usuario ${nombreDisplay} fue eliminado correctamente.`
              });
              this.usuarios = this.usuarios.filter((u) => u.uuid !== usuario.uuid);
            },
            error: (err) => {
              console.error('Error al eliminar:', err);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: err.error?.message || 'No se pudo eliminar el usuario.'
              });
            }
          });
      }
    });
  }

  applyFilterGlobal(table: any, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    table.clear();
  }

  getSeverity(active: boolean): string {
    return active ? 'success' : 'danger';
  }

  getStatusText(active: boolean): string {
    return active ? 'Activo' : 'Inactivo';
  }

  getNombreCompleto(usuario: UsuarioCompleto): string {
    if (!usuario.nombre || usuario.nombre === 'Sin asignar') {
      return 'Sin persona asignada';
    }
    return `${usuario.nombre} ${usuario.apPaterno} ${usuario.apMaterno || ''}`.trim();
  }

  getRolSeverity(rolNombre: string): string {
    if (!rolNombre) return 'secondary';
    switch (rolNombre.toLowerCase()) {
      case 'administrador':
        return 'danger';
      case 'bibliotecario':
        return 'info';
      case 'lector':
        return 'success';
      default:
        return 'secondary';
    }
  }

  getRolIcon(rolNombre: string): string {
    if (!rolNombre) return 'pi-users';
    switch (rolNombre.toLowerCase()) {
      case 'administrador':
        return 'pi-shield';
      case 'bibliotecario':
        return 'pi-book';
      case 'lector':
        return 'pi-user';
      default:
        return 'pi-users';
    }
  }
}
