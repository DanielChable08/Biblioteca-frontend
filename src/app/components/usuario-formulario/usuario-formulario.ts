import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { CatalogService } from '../../services/catalog.service';
import { UsuarioService } from '../../services/usuario.service';
import { TipoPersona } from '../../models/biblioteca';
import { Usuario, UsuarioPayload } from '../../models/usuario';

@Component({
  selector: 'app-usuario-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ToastModule,
    TooltipModule
  ],
  templateUrl: './usuario-formulario.html',
  styleUrls: ['./usuario-formulario.css']
})
export default class UsuarioFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  usuarioForm!: FormGroup;
  tiposPersona: TipoPersona[] = [];
  isSubmitting = false;
  isEditMode = false; 
  private usuarioUuid: string | null = null;

  ngOnInit(): void {
    this.initForm();
    this.usuarioUuid = this.route.snapshot.paramMap.get('uuid');
    this.isEditMode = !!this.usuarioUuid;
    this.loadCatalogs();

    if (this.isEditMode && this.usuarioUuid) {
      this.loadUsuarioData(this.usuarioUuid);
    } else {
      this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.usuarioForm.get('password')?.updateValueAndValidity();
    }
  }

  private initForm(): void {
    this.usuarioForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: ['', Validators.required],
      apMaterno: [''],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      idTipoPersona: [null, Validators.required]
    });
  }

  private loadCatalogs(): void {
    this.catalogService.getTiposPersonas().subscribe(data => {
      this.tiposPersona = data;
    });
  }

  private loadUsuarioData(uuid: string): void {
    this.usuarioService.getUsuarioByUuid(uuid).subscribe({
      next: (usuario) => {
        this.usuarioForm.patchValue({
          nombre: usuario.nombre,
          apPaterno: usuario.apPaterno,
          apMaterno: usuario.apMaterno || '',
          telefono: usuario.telefono,
          email: usuario.email,
          idTipoPersona: usuario.idTipoPersona

        });
        this.usuarioForm.get('password')?.clearValidators();
        this.usuarioForm.get('password')?.addValidators([Validators.minLength(6)]);
        this.usuarioForm.get('password')?.updateValueAndValidity();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la información del usuario.' });
        console.error(err);
        this.router.navigate(['/admin/usuarios']);
      }
    });
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Por favor, rellena todos los campos requeridos.' });
      return;
    }

    this.isSubmitting = true;
    const formValues = this.usuarioForm.value;

    const usuarioPayload: Partial<UsuarioPayload> = {
      nombre: formValues.nombre,
      apPaterno: formValues.apPaterno,
      apMaterno: formValues.apMaterno,
      telefono: formValues.telefono,
      email: formValues.email,
      idTipoPersona: formValues.idTipoPersona
    };


    if (formValues.password) {
      usuarioPayload.password = formValues.password;
    }

    let request$: Observable<Usuario>;

    if (this.isEditMode && this.usuarioUuid) {
      request$ = this.usuarioService.updateUsuario(this.usuarioUuid, usuarioPayload);
    } else {
      if (!usuarioPayload.password && !this.isEditMode) {
         this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'La contraseña es requerida para crear un usuario.' });
         this.isSubmitting = false;
         return;
      }
      request$ = this.usuarioService.createUsuario(usuarioPayload as UsuarioPayload);
    }

    request$.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Usuario ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`
        });
        setTimeout(() => this.router.navigate(['/admin/usuarios']), 1500);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el usuario.`
        });
        console.error(err);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/admin/usuarios']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}