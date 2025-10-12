import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { finalize, map, switchMap } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TreeSelectModule } from 'primeng/treeselect';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';


import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { Autor, Catalogo, Libro } from '../../models/biblioteca';
import { Select } from "primeng/select";

@Component({
  selector: 'app-libro-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule,
    TextareaModule, TreeSelectModule, MultiSelectModule, InputNumberModule,
    ToastModule,
    Select
],
  templateUrl: './libro-formulario.html',
  styleUrls: ['./libro-formulario.css']
})
export default class LibroFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);
  private bookService = inject(BookService);
  private ejemplarService = inject(EjemplarService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  libroForm!: FormGroup;
  autores: Autor[] = [];
  categorias: Catalogo[] = [];
  editoriales: Catalogo[] = [];
  idiomas: Catalogo[] = [];
  tiposLibro: Catalogo[] = [];
  condiciones: Catalogo[] = [];
  estados: Catalogo[] = [];
  
  isSubmitting = false;

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogs();
  }

  private initForm(): void {
    this.libroForm = this.fb.group({
      // Datos del Libro
      titulo: ['', Validators.required],
      idAutores: [null, Validators.required],
      resumen: ['', Validators.required],
      isbn: ['', [Validators.required, Validators.maxLength(13)]],
      anho: [new Date().getFullYear(), [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      paginas: [null, [Validators.required, Validators.min(1)]],
      edicion: [''],
      idCategoria: [null, Validators.required],
      idEditorial: [null, Validators.required],
      idIdioma: [null, Validators.required],
      idTipoLibro: [null, Validators.required],
      imagen: [''],
      pasta: ['']
    });
  }

  private loadCatalogs(): void {
    this.catalogService.getAutores().subscribe(data => this.autores = data);
    this.catalogService.getCategorias().subscribe(data => this.categorias = data);
    this.catalogService.getEditoriales().subscribe(data => this.editoriales = data);
    this.catalogService.getIdiomas().subscribe(data => this.idiomas = data);
    this.catalogService.getTiposLibros().subscribe(data => this.tiposLibro = data);
  }
  
  onSubmit(): void {
    if (this.libroForm.invalid) {
      this.libroForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Formulario Incompleto', detail: 'Por favor, rellena todos los campos requeridos.' });
      return;
    }

    this.isSubmitting = true;
    const formValues = this.libroForm.value;

    const libroPayload = {
      titulo: formValues.titulo,
      isbn: formValues.isbn,
      anho: formValues.anho.toString(),
      resumen: formValues.resumen,
      edicion: formValues.edicion,
      pasta: formValues.pasta,
      imagen: formValues.imagen,
      paginas: formValues.paginas,
      idTipoLibro: formValues.idTipoLibro,
      idCategoria: formValues.idCategoria,
      idEditorial: formValues.idEditorial,
      idIdioma: formValues.idIdioma,
    };

    this.bookService.createLibro(libroPayload).pipe(
      switchMap((libroCreado: Libro) => {
        const autoresPayload = formValues.idAutores.map((id: number) => ({ idAutor: id }));
        return this.bookService.addAutoresToLibro(libroCreado.uuid, autoresPayload).pipe(map(() => libroCreado));
      }),
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Libro, autores y ejemplar creados correctamente.' });
        setTimeout(() => this.router.navigate(['/admin']), 1500);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el libro.' });
        console.error(err);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/admin']);
  }
}