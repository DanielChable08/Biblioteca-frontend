import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { finalize, forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { InputMaskModule } from 'primeng/inputmask';

import { PersonaService } from '../../services/persona.service';
import { CatalogService } from '../../services/catalog.service';
import { Persona, TipoPersona } from '../../models/biblioteca';

@Component({
  selector: 'app-persona-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    InputMaskModule
  ],
  providers: [MessageService],
  templateUrl: './personas-formulario.html',
  styleUrls: ['./personas-formulario.css']
})
export default class PersonaFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private personaService = inject(PersonaService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  
  private dialogRef = inject(DynamicDialogRef, { optional: true });
  private config = inject(DynamicDialogConfig, { optional: true });

  personaForm!: FormGroup;
  tiposPersona: TipoPersona[] = [];

  isSubmitting = false;
  isEditMode = false;
  isModal = false;
  private personaUuid: string | null = null;

  ngOnInit(): void {
    this.isModal = !!this.dialogRef;

    this.initForm();

    if (this.isModal) {
      this.personaUuid = this.config?.data?.uuid || null;
    } else {
      this.personaUuid = this.route.snapshot.paramMap.get('uuid');
    }

    this.isEditMode = !!this.personaUuid;

    this.loadData();
  }

  private initForm(): void {
    this.personaForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: ['', Validators.required],
      apMaterno: [''],
      telefono: ['', Validators.required], 
      idTipoPersona: [null, Validators.required]
    });
  }

  private loadData(): void {
    if (this.isEditMode && this.personaUuid) {
      forkJoin({
        persona: this.personaService.getPersonaByUuid(this.personaUuid),
        tiposPersona: this.catalogService.getTiposPersonas()
      }).subscribe({
        next: ({ persona, tiposPersona }) => {
          this.tiposPersona = tiposPersona;
          this.fillForm(persona);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la persona.'
          });
          if (this.isModal) {
            this.dialogRef?.close(false);
          } else {
            this.router.navigate(['/admin/personas']);
          }
        }
      });
    } else {
      this.catalogService.getTiposPersonas().subscribe({
        next: (tiposPersona) => {
          this.tiposPersona = tiposPersona;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los tipos de persona.'
          });
        }
      });
    }
  }

  private fillForm(persona: Persona): void {
    this.personaForm.patchValue({
      nombre: persona.nombre,
      apPaterno: persona.apPaterno,
      apMaterno: persona.apMaterno || '',
      telefono: persona.telefono,
      idTipoPersona: persona.idTipoPersona
    });
  }

  onSubmit(): void {
    if (this.personaForm.invalid) {
      this.personaForm.markAllAsTouched();
      this.isSubmitting = true;
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor, completa todos los campos obligatorios.'
      });
      return;
    }

    const telefonoRaw = this.personaForm.get('telefono')?.value.replace(/\D/g, '');

    if (telefonoRaw.length !== 10) {
      this.messageService.add({
        severity: 'error',
        summary: 'Teléfono inválido',
        detail: 'El teléfono debe tener exactamente 10 dígitos.'
      });
      this.isSubmitting = false;
      return;
    }

    this.isSubmitting = true;

    const personaData = {
      ...this.personaForm.value,
      telefono: telefonoRaw 
    };

    const request$ = this.isEditMode && this.personaUuid
      ? this.personaService.updatePersona(this.personaUuid, personaData)
      : this.personaService.createPersona(personaData);

    request$.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (nuevaPersona) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Persona ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`
        });
        
        if (this.isModal) {
          setTimeout(() => this.dialogRef?.close(nuevaPersona || true), 1000);
        } else {
          setTimeout(() => this.router.navigate(['/admin/personas']), 1500);
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} la persona.`
        });
      }
    });
  }

  cancelar(): void {
    if (this.isModal) {
      this.dialogRef?.close(false);
    } else {
      this.router.navigate(['/admin/personas']);
    }
  }
}