import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, 
    TableModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export default class UsuarioListaComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  usuarios: any[] = [];
  loading = false; 
  globalFilter: string = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    this.usuarioService.getUsuarios().pipe(
      catchError(err => {
        console.error('❌ Error al cargar usuarios:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los usuarios.' 
        });
        return of([]);
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        console.log('✅ Usuarios cargados:', this.usuarios);
      },
      error: (err: any) => {
        console.error('❌ Error general:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Error al cargar los datos.' 
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

  editarUsuario(usuario: any): void {
    // ✅ Usa ID en lugar de UUID (ya que uuid viene null)
    this.router.navigate(['/admin/usuarios/editar', usuario.id]);
  }

  eliminarUsuario(usuario: any): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar al usuario "${usuario.nombre} ${usuario.apPaterno}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger custom-accept-button', 
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.loading = true;
        
        // ✅ Usa ID en lugar de UUID
        this.usuarioService.deleteUsuario(usuario.id).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Usuario eliminado correctamente.' 
            });
            this.loadData();
          },
          error: (err: any) => {
            console.error('❌ Error al eliminar usuario:', err);
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo eliminar el usuario.' 
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

  getRolClass(rolNombre?: string): string {
    if (!rolNombre) {
      return 'rol-default';
    }
    
    const rol = rolNombre.toLowerCase();
    
    switch (rol) {
      case 'administrador': return 'rol-admin';
      case 'bibliotecario': return 'rol-biblio';
      case 'lector':
      case 'miembro de la congregación': return 'rol-lector';
      default: return 'rol-default';
    }
  }
}
