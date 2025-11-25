import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, forkJoin, map } from 'rxjs';
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
  providers: [ConfirmationService, MessageService],
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

  // DATOS MOCK (Temporal hasta que el backend esté listo)
  mockTiposPersona: TipoPersona[] = [
    { id: 1, nombre: 'Lector', uuid: 'uuid-lector' },
    { id: 2, nombre: 'Bibliotecario', uuid: 'uuid-biblio' },
    { id: 3, nombre: 'Administrador', uuid: 'uuid-admin' }
  ];

  mockUsuarios: Usuario[] = [
    { 
      id: 1, 
      nombre: 'Juan', 
      apPaterno: 'Pérez', 
      apMaterno: 'García', 
      telefono: '9991112233', 
      email: 'juan.perez@mail.com', 
      uuid: 'uuid-juan', 
      idTipoPersona: 2 
    },
    { 
      id: 2, 
      nombre: 'Ana', 
      apPaterno: 'López', 
      apMaterno: 'Martínez', 
      telefono: '9994445566', 
      email: 'ana.lopez@mail.com', 
      uuid: 'uuid-ana', 
      idTipoPersona: 2 
    },
    { 
      id: 3, 
      nombre: 'Carlos', 
      apPaterno: 'Sánchez', 
      apMaterno: 'Torres',
      telefono: '9997778899', 
      email: 'carlos.sanchez@mail.com', 
      uuid: 'uuid-carlos', 
      idTipoPersona: 3 
    },
    { 
      id: 4, 
      nombre: 'María', 
      apPaterno: 'Ramírez', 
      apMaterno: 'Cruz', 
      telefono: '9991231234', 
      email: 'maria.ramirez@mail.com', 
      uuid: 'uuid-maria', 
      idTipoPersona: 1 
    },
    { 
      id: 5, 
      nombre: 'José Eduardo', 
      apPaterno: 'Hernández', 
      apMaterno: 'Sánchez', 
      telefono: '9995556666', 
      email: 'josshdezsan@gmail.com', 
      uuid: 'uuid-jose', 
      idTipoPersona: 3 
    }
  ];

  ngOnInit(): void {
    this.loadMockData(); // Temporal
    // this.loadData(); // Descomentar cuando el backend esté listo
  }

  // DATOS MOCK (Temporal)
  loadMockData(): void {
    this.loading = true;
    this.mockTiposPersona.forEach(tipo => 
      this.tiposPersonaMap.set(tipo.id, tipo.nombre)
    );
    
    this.usuarios = this.mockUsuarios.map(usr => ({
      ...usr,
      tipoPersona: this.mockTiposPersona.find(tp => tp.id === usr.idTipoPersona) || {
        id: usr.idTipoPersona,
        nombre: 'Desconocido',
        uuid: ''
      }
    }));
    
    setTimeout(() => { 
      this.loading = false; 
    }, 300);
  }

  /* 
  ==========================================
  LÓGICA REAL - Descomentar cuando el backend tenga el endpoint GET /users
  ==========================================
  
  loadData(): void {
    this.loading = true;
    
    forkJoin({
      usuarios: this.usuarioService.getUsuarios(),
      tiposPersona: this.catalogService.getTiposPersona()
    }).pipe(
      map(({ usuarios, tiposPersona }) => {
        // Crear el mapa de tipos de persona
        tiposPersona.forEach(tipo => this.tiposPersonaMap.set(tipo.id, tipo.nombre));
        
        // Mapear usuarios con su tipo de persona
        return usuarios.map(usr => ({
          ...usr,
          tipoPersona: tiposPersona.find(tp => tp.id === usr.idTipoPersona) || {
            id: usr.idTipoPersona,
            nombre: 'Desconocido',
            uuid: ''
          }
        }));
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (usuariosConTipo) => {
        this.usuarios = usuariosConTipo;
        console.log('✅ Usuarios cargados:', this.usuarios);
      },
      error: (err: any) => {
        console.error('❌ Error al cargar usuarios:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los usuarios.' 
        });
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
        // SIMULADO - Eliminar del array mock
        this.usuarios = this.usuarios.filter(u => u.uuid !== usuario.uuid);
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Éxito', 
          detail: 'Usuario eliminado (simulado).' 
        });

        /* 
        LÓGICA REAL - Descomentar cuando el backend esté listo
        
        this.loading = true;
        this.usuarioService.deleteUsuario(usuario.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Usuario eliminado correctamente.' 
            });
            this.usuarios = this.usuarios.filter(u => u.uuid !== usuario.uuid);
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

  getRolClass(rolNombre: string = ''): string {
    switch (rolNombre.toLowerCase()) {
      case 'administrador': return 'rol-admin';
      case 'bibliotecario': return 'rol-biblio';
      case 'lector': return 'rol-lector';
      default: return 'rol-default';
    }
  }
}
