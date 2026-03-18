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
import { DialogModule } from 'primeng/dialog';
import { InputMaskModule } from 'primeng/inputmask';

import { UsuarioService } from '../../services/usuario.service';
import { CatalogService } from '../../services/catalog.service';
import { ActualizarUsuarioRequest, Persona, UsuarioCompleto, CrearUsuarioRequest } from '../../models/usuario';
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
    TooltipModule,
    DialogModule,
    InputMaskModule
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
  nuevaPersonaForm!: FormGroup;

  tiposPersona: TipoPersona[] = [];
  personas: Persona[] = [];
  roles: Array<{ id: number; name: string }> = [];
  
  isSubmitting = false;
  isEditMode = false;
  usuarioUuid: string | null = null;
  displayPersonaDialog = false;

  personaOriginalData: any = {};
  datosNuevaPersona: any = null; 

  ngOnInit(): void {
    this.usuarioUuid = this.route.snapshot.paramMap.get('uuid');
    this.isEditMode = !!this.usuarioUuid;

    this.initForms();
    this.loadCatalogs();

    if (this.isEditMode && this.usuarioUuid) {
      this.loadUsuarioData(this.usuarioUuid);
    }
  }

  private initForms(): void {
    this.usuarioForm = this.fb.group({
      personaExistente: [null, Validators.required], 
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      rol: [null, Validators.required]
    });

    this.nuevaPersonaForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: ['', Validators.required],
      apMaterno: [''],
      telefono: ['', Validators.required], 
      idTipoPersona: [null, Validators.required]
    });
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
        data.usuarios.forEach((usuario: UsuarioCompleto) => {
          if (usuario.roles && usuario.roles.length > 0 && usuario.rolNombre) {
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
      }
    });
  }

  private loadUsuarioData(uuid: string): void {
    this.usuarioService.getUsuarioByUuid(uuid).subscribe({
      next: (usuario: UsuarioCompleto) => {
        const rolId = usuario.roles && usuario.roles.length > 0 ? usuario.roles[0] : null;
        
        this.personaOriginalData = {
          nombre: usuario.nombre || '',
          apPaterno: usuario.apPaterno || '',
          apMaterno: usuario.apMaterno || '',
          telefono: usuario.telefono || '',
          idTipoPersona: usuario.idTipoPersona || null
        };

        this.usuarioForm.patchValue({
          email: usuario.email,
          rol: rolId,
          personaExistente: usuario.idPersona 
        });
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el usuario.' });
        this.router.navigate(['/admin/usuarios']);
      }
    });
  }

  getPersonaNombreCompleto(persona: any): string {
    if (!persona) return '';
    return `${persona.nombre} ${persona.apPaterno || ''} ${persona.apMaterno || ''}`.trim();
  }

  abrirModalPersona(): void {
    this.nuevaPersonaForm.reset();
    this.displayPersonaDialog = true;
  }

  guardarNuevaPersona(): void {
    if (this.nuevaPersonaForm.invalid) {
      this.nuevaPersonaForm.markAllAsTouched();
      return;
    }

    const raw = this.nuevaPersonaForm.getRawValue();
    const telefonoLimpio = (raw.telefono || '').replace(/\D/g, '');

    if (telefonoLimpio.length !== 10) {
      this.messageService.add({ severity: 'error', summary: 'Teléfono inválido', detail: 'Debe tener 10 dígitos.' });
      return;
    }

    this.datosNuevaPersona = { ...raw, telefono: telefonoLimpio };

    const personaFalsa: any = {
      id: -1, 
      nombre: `(NUEVA) ${this.datosNuevaPersona.nombre}`,
      apPaterno: this.datosNuevaPersona.apPaterno,
      apMaterno: this.datosNuevaPersona.apMaterno || ''
    };

    this.personas = this.personas.filter(p => p.id !== -1); 
    this.personas = [personaFalsa, ...this.personas];
    
    this.usuarioForm.patchValue({ personaExistente: -1 });
    this.displayPersonaDialog = false;
    
    this.messageService.add({ severity: 'info', summary: 'Listo', detail: 'Persona guardada temporalmente. Crea la cuenta para finalizar.' });
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Completa todos los campos del usuario.' });
      return;
    }

    this.isSubmitting = true;
    const formValues = this.usuarioForm.getRawValue();

    if (this.isEditMode && this.usuarioUuid) {
      const request: ActualizarUsuarioRequest = {
        persona: {
          nombre: this.personaOriginalData.nombre,
          apPaterno: this.personaOriginalData.apPaterno,
          apMaterno: this.personaOriginalData.apMaterno,
          telefono: this.personaOriginalData.telefono,
          idTipoPersona: this.personaOriginalData.idTipoPersona
        },
        usuario: {
          email: formValues.email,
          roles: [formValues.rol]
        }
      };

      if (formValues.password && formValues.password.trim() !== '') {
        request.usuario!.password = formValues.password;
      }

      this.usuarioService.updateUsuario(this.usuarioUuid, request).pipe(finalize(() => this.isSubmitting = false)).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Cuenta actualizada correctamente.' });
          setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al actualizar.' });
        }
      });
      return;
    }

    if (formValues.personaExistente === -1) {
      const request: CrearUsuarioRequest = {
        persona: {
          nombre: this.datosNuevaPersona.nombre,
          apPaterno: this.datosNuevaPersona.apPaterno,
          apMaterno: this.datosNuevaPersona.apMaterno,
          telefono: this.datosNuevaPersona.telefono,
          idTipoPersona: this.datosNuevaPersona.idTipoPersona
        },
        usuario: {
          email: formValues.email,
          password: formValues.password,
          roles: [formValues.rol]
        }
      };

      this.usuarioService.createUsuario(request).pipe(finalize(() => this.isSubmitting = false)).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario y persona creados correctamente.' });
          setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear.' });
        }
      });
    } else {

      const request: any = {
        email: formValues.email,
        password: formValues.password,
        idPersona: formValues.personaExistente, 
        roles: [formValues.rol]
      };

      this.usuarioService.createUsuario(request).pipe(finalize(() => this.isSubmitting = false)).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario creado exitosamente.' });
          setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al crear usuario.' });
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

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}