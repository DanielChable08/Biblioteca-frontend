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

import { UsuarioService } from '../../services/usuario.service';
import { CatalogService } from '../../services/catalog.service';
import { UsuarioPayload, UsuarioUpdatePayload } from '../../models/usuario';
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
    PasswordModule
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
  isSubmitting = false;
  isEditMode = false;
  usuarioId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam) {
      this.usuarioId = parseInt(idParam, 10);
      this.isEditMode = true;
    }

    this.initForm();
    this.loadTiposPersona();

    if (this.isEditMode && this.usuarioId) {
      this.loadUsuarioData(this.usuarioId);
    }
  }

  private initForm(): void {
    this.usuarioForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      nombre: ['', Validators.required],
      apPaterno: ['', Validators.required],
      apMaterno: [''],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      idTipoPersona: [null, Validators.required]
    });
  }

  private loadTiposPersona(): void {
    this.catalogService.getTiposPersona().subscribe({
      next: (tipos) => {
        this.tiposPersona = tipos;
        console.log('✅ Tipos de persona cargados:', this.tiposPersona);
      },
      error: (err) => {
        console.error('❌ Error al cargar tipos de persona:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los tipos de persona.'
        });
      }
    });
  }

  private loadUsuarioData(id: number): void {
    // ✅ Cargar usuario y personas simultáneamente
    forkJoin({
      usuario: this.usuarioService.getUsuarioById(id),
      personas: this.usuarioService.getPersonas()
    }).subscribe({
      next: ({ usuario, personas }) => {
        console.log('✅ Usuario cargado para editar:', usuario);
        console.log('✅ Personas disponibles:', personas);
        
        // Buscar persona asociada al usuario por email o idPersona
        const persona = personas.find((p: any) => 
          p.email?.toLowerCase() === usuario.email?.toLowerCase() || 
          p.id === usuario.idPersona
        );

        if (persona) {
          this.usuarioForm.patchValue({
            email: usuario.email,
            nombre: persona.nombre,
            apPaterno: persona.apPaterno,
            apMaterno: persona.apMaterno || '',
            telefono: persona.telefono,
            idTipoPersona: persona.idTipoPersona
          });
          console.log('✅ Datos de persona cargados:', persona);
        } else {
          // Si no encuentra persona, cargar solo datos del usuario
          this.usuarioForm.patchValue({
            email: usuario.email,
            nombre: usuario.nombre || '',
            apPaterno: usuario.apPaterno || '',
            apMaterno: usuario.apMaterno || '',
            telefono: usuario.telefono || '',
            idTipoPersona: usuario.idTipoPersona || null
          });
          console.warn('⚠️ No se encontró persona asociada al usuario');
        }

        // En modo edición, la contraseña es opcional
        this.usuarioForm.get('password')?.clearValidators();
        this.usuarioForm.get('password')?.updateValueAndValidity();
      },
      error: (err) => {
        console.error('❌ Error al cargar usuario:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el usuario.'
        });
        this.router.navigate(['/admin/usuarios']);
      }
    });
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
    const formValues = this.usuarioForm.value;

    if (this.isEditMode && this.usuarioId) {
      // ✅ ACTUALIZAR USUARIO
      const payload: UsuarioUpdatePayload = {
        email: formValues.email,
        nombre: formValues.nombre,
        apPaterno: formValues.apPaterno,
        apMaterno: formValues.apMaterno || '',
        telefono: formValues.telefono,
        idTipoPersona: formValues.idTipoPersona
      };

      // Solo incluir password si se ingresó uno nuevo
      if (formValues.password && formValues.password.trim() !== '') {
        payload.password = formValues.password;
      }

      this.usuarioService.updateUsuario(this.usuarioId, payload).pipe(
        finalize(() => this.isSubmitting = false)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario actualizado correctamente.'
          });
          setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
        },
        error: (err) => {
          console.error('❌ Error al actualizar usuario:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err.error?.message || 'No se pudo actualizar el usuario.'
          });
        }
      });
    } else {
      // ✅ CREAR USUARIO
      const payload: UsuarioPayload = {
        email: formValues.email,
        password: formValues.password,
        nombre: formValues.nombre,
        apPaterno: formValues.apPaterno,
        apMaterno: formValues.apMaterno || '',
        telefono: formValues.telefono,
        idTipoPersona: formValues.idTipoPersona
      };

      this.usuarioService.createUsuario(payload).pipe(
        finalize(() => this.isSubmitting = false)
      ).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Usuario creado correctamente.'
          });
          setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
        },
        error: (err) => {
          console.error('❌ Error al crear usuario:', err);
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
