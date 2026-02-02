import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { finalize, forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

import { UsuarioService } from '../../services/usuario.service';
import { CatalogService } from '../../services/catalog.service';
import { CrearUsuarioRequest, ActualizarUsuarioRequest, Persona, UsuarioCompleto } from '../../models/usuario';
import { TipoPersona } from '../../models/biblioteca';

@Component({
  selector: 'app-usuario-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    PasswordModule,
    DividerModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './usuario-formulario.html',
  styleUrls: ['./usuario-formulario.css']
})
export default class UsuarioFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuarioService = inject(UsuarioService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  usuarioForm!: FormGroup;
  tiposPersona: TipoPersona[] = [];
  personas: Persona[] = [];
  roles: Array<{ id: number; name: string }> = [];
  isSubmitting = false;
  isEditMode = false;
  usuarioUuid: string | null = null;

  modoCrearPersona = false;
  personaSeleccionadaUuid: string | null = null; // <- ahora uuid

  ngOnInit(): void {
    const uuidParam = this.route.snapshot.paramMap.get('uuid');

    if (uuidParam) {
      this.usuarioUuid = uuidParam;
      this.isEditMode = true;
    }

    this.initForm();
    this.loadCatalogs();

    if (this.isEditMode && this.usuarioUuid) {
      this.loadUsuarioData(this.usuarioUuid);
    }
  }

  private initForm(): void {
    this.usuarioForm = this.fb.group({
      personaExistente: [null], // aquí guardarás personaUuid
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      rol: [null, Validators.required],   // aquí guardarás el id numérico del rol

      nombre: [''],
      apPaterno: [''],
      apMaterno: [''],
      telefono: [''],
      idTipoPersona: [null]
    });

    this.setupPersonaValidators();
  }

  private setupPersonaValidators(): void {
    if (this.modoCrearPersona || this.isEditMode) {
      this.usuarioForm.get('nombre')?.setValidators([Validators.required]);
      this.usuarioForm.get('apPaterno')?.setValidators([Validators.required]);
      this.usuarioForm.get('telefono')?.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
      this.usuarioForm.get('idTipoPersona')?.setValidators([Validators.required]);
    } else {
      this.usuarioForm.get('nombre')?.clearValidators();
      this.usuarioForm.get('apPaterno')?.clearValidators();
      this.usuarioForm.get('telefono')?.clearValidators();
      this.usuarioForm.get('idTipoPersona')?.clearValidators();
    }

    this.usuarioForm.get('nombre')?.updateValueAndValidity();
    this.usuarioForm.get('apPaterno')?.updateValueAndValidity();
    this.usuarioForm.get('telefono')?.updateValueAndValidity();
    this.usuarioForm.get('idTipoPersona')?.updateValueAndValidity();
  }

  private loadCatalogs(): void {
    forkJoin({
      tiposPersona: this.catalogService.getTiposPersona(),
      usuarios: this.usuarioService.getUsuarios(),
      personas: this.usuarioService.getPersonas()
    }).subscribe({
      next: (data) => {
        this.tiposPersona = data.tiposPersona;
        this.personas = data.personas;

        const rolesMap = new Map<number, string>();

        // aquí asumo que cada usuario trae roles: number[] + quizá rolNombre
        data.usuarios.forEach((usuario: UsuarioCompleto) => {
          if (usuario.roles && usuario.roles.length > 0 && usuario.rolNombre) {
            // si todos los usuarios tienen sólo 1 rol, puedes mapear por id + rolNombre
            usuario.roles.forEach((rolId) => {
              rolesMap.set(rolId, usuario.rolNombre!);
            });
          }
        });

        this.roles = Array.from(rolesMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.id - b.id);

        if (this.roles.length === 0) {
          this.roles = [
            { id: 1, name: 'ADMINISTRADOR' },
            { id: 2, name: 'BIBLIOTECARIO' },
            { id: 3, name: 'SEMINARISTA' }
          ];
        }
      },
      error: (err) => {
        console.error('Error al cargar catálogos:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los catálogos.'
        });

        this.roles = [
          { id: 1, name: 'ADMINISTRADOR' },
          { id: 2, name: 'BIBLIOTECARIO' },
          { id: 3, name: 'SEMINARISTA' }
        ];
      }
    });
  }

  private loadUsuarioData(uuid: string): void {
    this.usuarioService.getUsuarioByUuid(uuid).subscribe({
      next: (usuario: UsuarioCompleto) => {
        console.log('Usuario cargado para editar:', usuario);

        const rolId = usuario.roles && usuario.roles.length > 0 ? usuario.roles[0] : null;

        this.usuarioForm.patchValue({
          email: usuario.email,
          nombre: usuario.nombre || '',
          apPaterno: usuario.apPaterno || '',
          apMaterno: usuario.apMaterno || '',
          telefono: usuario.telefono || '',
          idTipoPersona: usuario.idTipoPersona || null,
          rol: rolId,
          personaExistente: usuario.personaUuid || null
        });

        // en modo edición editas siempre los datos de la persona
        this.modoCrearPersona = true;
        this.personaSeleccionadaUuid = usuario.personaUuid || null;

        this.usuarioForm.get('password')?.clearValidators();
        this.usuarioForm.get('password')?.updateValueAndValidity();

        this.setupPersonaValidators();
      },
      error: (err) => {
        console.error('Error al cargar usuario:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el usuario.'
        });
        this.router.navigate(['/admin/usuarios']);
      }
    });
  }

  onPersonaSeleccionada(event: any): void {
    const personaUuid = event.value as string | null;

    if (!personaUuid) {
      this.modoCrearPersona = false;
      this.personaSeleccionadaUuid = null;
      this.usuarioForm.patchValue({
        nombre: '',
        apPaterno: '',
        apMaterno: '',
        telefono: '',
        idTipoPersona: null
      });
      this.usuarioForm.get('nombre')?.enable();
      this.usuarioForm.get('apPaterno')?.enable();
      this.usuarioForm.get('apMaterno')?.enable();
      this.usuarioForm.get('telefono')?.enable();
      this.usuarioForm.get('idTipoPersona')?.enable();
      this.setupPersonaValidators();
      return;
    }

    const persona = this.personas.find((p) => p.uuid === personaUuid);
    if (persona) {
      this.modoCrearPersona = false;
      this.personaSeleccionadaUuid = persona.uuid;
      this.usuarioForm.patchValue({
        nombre: persona.nombre,
        apPaterno: persona.apPaterno,
        apMaterno: persona.apMaterno || '',
        telefono: persona.telefono,
        idTipoPersona: persona.idTipoPersona
      });

      this.usuarioForm.get('nombre')?.disable();
      this.usuarioForm.get('apPaterno')?.disable();
      this.usuarioForm.get('apMaterno')?.disable();
      this.usuarioForm.get('telefono')?.disable();
      this.usuarioForm.get('idTipoPersona')?.disable();

      this.setupPersonaValidators();
    }
  }

  activarModoCrearPersona(): void {
    this.modoCrearPersona = true;
    this.personaSeleccionadaUuid = null;

    this.usuarioForm.patchValue({
      personaExistente: null,
      nombre: '',
      apPaterno: '',
      apMaterno: '',
      telefono: '',
      idTipoPersona: null
    });

    this.usuarioForm.get('nombre')?.enable();
    this.usuarioForm.get('apPaterno')?.enable();
    this.usuarioForm.get('apMaterno')?.enable();
    this.usuarioForm.get('telefono')?.enable();
    this.usuarioForm.get('idTipoPersona')?.enable();

    this.setupPersonaValidators();

    this.messageService.add({
      severity: 'info',
      summary: 'Modo Crear Persona',
      detail: 'Completa el formulario para registrar una nueva persona.',
      life: 3000
    });
  }

  getPersonaNombreCompleto(persona: any): string {
    return `${persona.nombre} ${persona.apPaterno || ''} ${persona.apMaterno || ''}`.trim();
  }

  getTipoPersonaNombre(): string {
    const idTipo = this.usuarioForm.get('idTipoPersona')?.value;
    const tipo = this.tiposPersona.find((t) => t.id === idTipo);
    return tipo?.nombre || 'No especificado';
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor, completa todos los campos requeridos.'
      });
      return;
    }

    this.isSubmitting = true;
    const formValues = this.usuarioForm.getRawValue();

    // EDITAR
    if (this.isEditMode && this.usuarioUuid) {
      const request: ActualizarUsuarioRequest = {
        persona: {
          nombre: formValues.nombre,
          apPaterno: formValues.apPaterno,
          apMaterno: formValues.apMaterno || '',
          telefono: formValues.telefono,
          idTipoPersona: formValues.idTipoPersona
        },
        usuario: {
          email: formValues.email,
          // aquí roles es number[] en tu backend, así que mando solo el id
          roles: [formValues.rol]
        }
      };

      if (formValues.password && formValues.password.trim() !== '') {
        request.usuario!.password = formValues.password;
      }

      this.usuarioService
        .updateUsuario(this.usuarioUuid, request)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Usuario actualizado correctamente.'
            });
            setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
          },
          error: (err) => {
            console.error('Error al actualizar:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.error?.message || 'No se pudo actualizar el usuario.'
            });
          }
        });

      return;
    }

    // CREAR
    if (this.modoCrearPersona) {
      const request: CrearUsuarioRequest = {
        persona: {
          nombre: formValues.nombre,
          apPaterno: formValues.apPaterno,
          apMaterno: formValues.apMaterno || '',
          telefono: formValues.telefono,
          idTipoPersona: formValues.idTipoPersona
        },
        usuario: {
          email: formValues.email,
          password: formValues.password,
          roles: [formValues.rol]
        }
      };

      this.usuarioService
        .createUsuario(request)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Usuario y persona creados correctamente.'
            });
            setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
          },
          error: (err) => {
            console.error('Error al crear:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.error?.message || 'No se pudo crear el usuario.'
            });
          }
        });
    } else {
      // usar persona existente por uuid
      const request: any = {
        email: formValues.email,
        password: formValues.password,
        personaUuid: this.personaSeleccionadaUuid,
        roles: [formValues.rol]
      };

      this.usuarioService
        .createUsuario(request)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Usuario creado con persona existente.'
            });
            setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
          },
          error: (err) => {
            console.error('Error al crear usuario:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.error?.message || 'No se pudo crear el usuario.'
            });
          }
        });
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/usuarios']);
  }

  soloNumeros(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
