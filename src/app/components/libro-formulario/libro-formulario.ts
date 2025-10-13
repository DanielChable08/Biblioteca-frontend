import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { finalize, map, switchMap } from 'rxjs';

// --- IMPORTS DE PRIMENG CORREGIDOS ---
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

// Services and Models
import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { Autor, Catalogo, Libro } from '../../models/biblioteca';

type TipoCatalogo = 'autor' | 'categoria' | 'editorial' | 'idioma' | 'tipoLibro';

@Component({
  selector: 'app-libro-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule,
    TextareaModule, SelectModule, MultiSelectModule, InputNumberModule,
    ToastModule, DialogModule, TooltipModule
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
  catalogoForm!: FormGroup;

  autores: Autor[] = [];
  categorias: Catalogo[] = [];
  editoriales: Catalogo[] = [];
  idiomas: Catalogo[] = [];
  tiposLibro: Catalogo[] = [];
  condiciones: Catalogo[] = [];
  estados: Catalogo[] = [];
  
  isSubmitting = false;
  displayCatalogoDialog = false;
  catalogoSiendoAgregado: TipoCatalogo | null = null;

  ngOnInit(): void {
    this.initForms();
    this.loadCatalogs();
  }

  private initForms(): void {
    this.libroForm = this.fb.group({
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
      pasta: [''],
      ubicacionEjemplar: [''],
      idCondicionFisicaEjemplar: [null, Validators.required],
      idEstadoEjemplar: [null, Validators.required]
    });

    this.catalogoForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: [''],
      apMaterno: ['']
    });
  }

  private loadCatalogs(): void {
    this.catalogService.getAutores().subscribe(data => this.autores = data);
    this.catalogService.getCategorias().subscribe(data => this.categorias = data);
    this.catalogService.getEditoriales().subscribe(data => this.editoriales = data);
    this.catalogService.getIdiomas().subscribe(data => this.idiomas = data);
    this.catalogService.getTiposLibros().subscribe(data => this.tiposLibro = data);
    this.catalogService.getCondicionesFisicas().subscribe(data => this.condiciones = data);
    this.catalogService.getEstadosEjemplares().subscribe(data => this.estados = data);
  }
  
  abrirModalAgregar(tipo: TipoCatalogo): void {
    this.catalogoSiendoAgregado = tipo;
    this.catalogoForm.reset();
    
    if (tipo === 'autor') {
      this.catalogoForm.get('apPaterno')?.setValidators(Validators.required);
    } else {
      this.catalogoForm.get('apPaterno')?.clearValidators();
    }
    this.catalogoForm.get('apPaterno')?.updateValueAndValidity();

    this.displayCatalogoDialog = true;
  }

  guardarNuevoCatalogo(): void {
    if (this.catalogoForm.invalid || !this.catalogoSiendoAgregado) return;

    let request$;
    const payload = this.catalogoForm.value;
    const tipo = this.catalogoSiendoAgregado;

    switch(tipo) {
      case 'autor': request$ = this.catalogService.createAutor(payload); break;
      case 'categoria': request$ = this.catalogService.createCategoria({ nombre: payload.nombre }); break;
      case 'editorial': request$ = this.catalogService.createEditorial({ nombre: payload.nombre }); break;
      case 'idioma': request$ = this.catalogService.createIdioma({ nombre: payload.nombre }); break;
      case 'tipoLibro': request$ = this.catalogService.createTipoLibro({ nombre: payload.nombre }); break;
      default:
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Tipo de catálogo no soportado.' });
        return;
    }

    request$.subscribe(nuevoItem => {
      this.messageService.add({ severity: 'success', summary: 'Éxito', detail: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} agregado.`});
      this.displayCatalogoDialog = false;

      switch(tipo) {
        case 'autor':
          this.autores = [...this.autores, nuevoItem as Autor];
          const currentAutores = this.libroForm.get('idAutores')?.value || [];
          this.libroForm.get('idAutores')?.setValue([...currentAutores, nuevoItem.id]);
          break;
        case 'categoria':
          this.categorias = [...this.categorias, nuevoItem];
          this.libroForm.get('idCategoria')?.setValue(nuevoItem.id);
          break;
        case 'editorial':
          this.editoriales = [...this.editoriales, nuevoItem];
          this.libroForm.get('idEditorial')?.setValue(nuevoItem.id);
          break;
        case 'idioma':
          this.idiomas = [...this.idiomas, nuevoItem];
          this.libroForm.get('idIdioma')?.setValue(nuevoItem.id);
          break;
        case 'tipoLibro':
          this.tiposLibro = [...this.tiposLibro, nuevoItem];
          this.libroForm.get('idTipoLibro')?.setValue(nuevoItem.id);
          break;
      }
    });
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