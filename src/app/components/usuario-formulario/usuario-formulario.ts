// src/app/components/usuario-formulario/usuario-formulario.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

// --- IMPORTS DE PRIMENG ---
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

// --- SERVICES E INTERFACES ---
import { CatalogService } from '../../services/catalog.service';
import { UsuarioService } from '../../services/usuario.service'; // Import the new service
import { TipoPersona } from '../../models/biblioteca'; // Reuse existing model

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
  styleUrls: ['./usuario-formulario.css'] // Link to the CSS file
})
export default class UsuarioFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);
  private usuarioService = inject(UsuarioService); // Inject the new service
  private router = inject(Router);
  private messageService = inject(MessageService);

  usuarioForm!: FormGroup;
  tiposPersona: TipoPersona[] = []; // To store roles/types from backend
  isSubmitting = false;
  // isEditMode = false; // Add logic for editing later if needed
  // private usuarioUuid: string | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogs();
    // Add logic here to load user data if in edit mode
  }

  private initForm(): void {
    this.usuarioForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: ['', Validators.required],
      apMaterno: [''], // Optional
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]], // Example: 10 digit phone
      // --- Authentication Fields ---
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]], // Example minimum length
      // --- Role/Type ---
      idTipoPersona: [null, Validators.required] // Or maybe 'roleId'? Check your backend model
    });
  }

  private loadCatalogs(): void {
    this.catalogService.getTiposPersonas().subscribe(data => {
      this.tiposPersona = data;
      // You might want to filter out 'Miembro' if Admins can only create Staff roles
      // this.tiposPersona = data.filter(tipo => tipo.nombre !== 'Miembro');
    });
  }

  onSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor, rellena todos los campos requeridos.'
      });
      return;
    }

    this.isSubmitting = true;
    const formValues = this.usuarioForm.value;

    // Adapt this payload structure based on what your Spring Boot endpoint expects
    const usuarioPayload = {
      nombre: formValues.nombre,
      apPaterno: formValues.apPaterno,
      apMaterno: formValues.apMaterno,
      telefono: formValues.telefono,
      email: formValues.email,
      password: formValues.password,
      idTipoPersona: formValues.idTipoPersona
      // Add any other required fields your backend expects
    };

    // Assuming createUsuario for now. Add update logic later if needed.
    this.usuarioService.createUsuario(usuarioPayload).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Usuario creado correctamente.'
        });
        // Navigate back to user list or admin dashboard after a delay
        setTimeout(() => this.router.navigate(['/admin']), 1500); // Adjust navigation target
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          // Provide a more specific error message if possible
          detail: err.error?.message || 'No se pudo crear el usuario.'
        });
        console.error(err);
      }
    });
  }

  cancelar(): void {
    // Navigate back to wherever users are managed, or the main admin page
    this.router.navigate(['/admin']); // Adjust if you have a user list page
  }

  // Helper for template validation messages (optional but good practice)
  isFieldInvalid(fieldName: string): boolean {
    const field = this.usuarioForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}