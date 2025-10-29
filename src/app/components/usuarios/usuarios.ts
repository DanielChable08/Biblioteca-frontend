import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, forkJoin, map, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';


import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';


import { UsuarioService } from '../../services/usuario.service';
import { CatalogService } from '../../services/catalog.service';
import { Usuario } from '../../models/usuario';
import { TipoPersona } from '../../models/biblioteca';

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
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export default class UsuarioListaComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  usuarios: Usuario[] = [];
  tiposPersonaMap = new Map<number, string>();
  loading = false; 
  globalFilter: string = '';

  
  mockTiposPersona: TipoPersona[] = [
      { id: 1, nombre: 'Administrador', uuid: 'uuid-admin'},
      { id: 2, nombre: 'Bibliotecario', uuid: 'uuid-biblio'},
      { id: 3, nombre: 'Miembro', uuid: 'uuid-miembro'}
  ];
  mockUsuarios: Usuario[] = [
    { id: 101, nombre: 'Juan', apPaterno: 'Pérez', apMaterno: 'García', telefono: '9991112233', email: 'juan.perez@mail.com', uuid: 'uuid-juan', idTipoPersona: 1 },
    { id: 102, nombre: 'Ana', apPaterno: 'López', apMaterno: 'Martínez', telefono: '9994445566', email: 'ana.lopez@mail.com', uuid: 'uuid-ana', idTipoPersona: 2 },
    { id: 103, nombre: 'Carlos', apPaterno: 'Sánchez', telefono: '9997778899', email: 'carlos.sanchez@mail.com', uuid: 'uuid-carlos', idTipoPersona: 2 },
    { id: 104, nombre: 'Maria', apPaterno: 'Ramirez', apMaterno: 'Cruz', telefono: '9991231234', email: 'maria.ramirez@mail.com', uuid: 'uuid-maria', idTipoPersona: 3 },
  ];
  

  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    this.loading = true;
    this.mockTiposPersona.forEach(tipo => this.tiposPersonaMap.set(tipo.id, tipo.nombre));
    this.usuarios = this.mockUsuarios.map(usr => ({
      ...usr,
      tipoPersona: {
        id: usr.idTipoPersona,
        nombre: this.getNombreTipoPersona(usr.idTipoPersona),
        uuid: this.mockTiposPersona.find(tp => tp.id === usr.idTipoPersona)?.uuid || ''
      }
    }));
    setTimeout(() => { this.loading = false; }, 200); 
  }

  /*
  loadData(): void {
    this.loading = true;
    forkJoin({
      usuarios: this.usuarioService.getUsuarios(),
      tiposPersona: this.catalogService.getTiposPersonas()
    }).pipe(
      map(({ usuarios, tiposPersona }) => {
        tiposPersona.forEach(tipo => this.tiposPersonaMap.set(tipo.id, tipo.nombre));
        return usuarios.map(usr => ({
          ...usr,
          tipoPersona: { id: usr.idTipoPersona, nombre: this.getNombreTipoPersona(usr.idTipoPersona), uuid: '' }
        }));
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (usuariosConTipo) => {
        this.usuarios = usuariosConTipo;
      },
      error: (err: any) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios.' });
        console.error(err);
      }
    });
  }
  */

  getNombreTipoPersona(id: number): string {
    return this.tiposPersonaMap.get(id) || 'Desconocido';
  }

  regresar(): void {
    this.router.navigate(['/admin']); 
  }

  agregarUsuario(): void {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }

  editarUsuario(usuario: Usuario): void {
    this.router.navigate(['/admin/usuarios/editar', usuario.uuid]);
  }

  eliminarUsuario(usuario: Usuario): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar al usuario "${usuario.nombre} ${usuario.apPaterno}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger custom-accept-button', 
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        console.log('Usuario a eliminar (simulado):', usuario.uuid);
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado (simulado).' });
        this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);

        /*
        this.loading = true;
        this.usuarioService.deleteUsuario(usuario.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario eliminado.' });
            this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
          },
          error: (err: any) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el usuario.' });
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
}