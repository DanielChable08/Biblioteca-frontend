import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { finalize, map, switchMap, forkJoin } from 'rxjs';


import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';


import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { Autor, Catalogo, Libro } from '../../models/biblioteca';

type TipoCatalogo = 'autor' | 'categoria' | 'editorial' | 'idioma' | 'tipoLibro';

@Component({
  selector: 'app-libro-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule,
    TextareaModule, SelectModule, MultiSelectModule, InputNumberModule,
    ToastModule, DialogModule, TooltipModule, TitleCasePipe
  ],
  templateUrl: './libro-formulario.html',
  styleUrls: ['./libro-formulario.css']
})
export default class LibroFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);
  private bookService = inject(BookService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  libroForm!: FormGroup;
  catalogoForm!: FormGroup;

  autores: Autor[] = [];
  categorias: Catalogo[] = [];
  editoriales: Catalogo[] = [];
  idiomas: Catalogo[] = [];
  tiposLibro: Catalogo[] = [];
  
  isSubmitting = false;
  displayCatalogoDialog = false;
  catalogoSiendoAgregado: TipoCatalogo | null = null;
  
  isEditMode = false;
  private libroUuid: string | null = null;

  ngOnInit(): void {
    this.initForms();
    this.libroUuid = this.route.snapshot.paramMap.get('uuid');
    this.isEditMode = !!this.libroUuid;
    
    this.loadCatalogsAndData();
  }

  private initForms(): void {
    this.libroForm = this.fb.group({
      titulo: ['', Validators.required],
      idAutores: [[], Validators.required],
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

    this.catalogoForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: [''],
      apMaterno: ['']
    });
  }

  private loadCatalogsAndData(): void {

    forkJoin({
      autores: this.catalogService.getAutores(),
      categorias: this.catalogService.getCategorias(),
      editoriales: this.catalogService.getEditoriales(),
      idiomas: this.catalogService.getIdiomas(),
      tiposLibro: this.catalogService.getTiposLibros()
    }).subscribe(catalogs => {
      this.autores = catalogs.autores;
      this.categorias = catalogs.categorias;
      this.editoriales = catalogs.editoriales;
      this.idiomas = catalogs.idiomas;
      this.tiposLibro = catalogs.tiposLibro;


      if (this.isEditMode && this.libroUuid) {
        this.loadBookData(this.libroUuid);
      }
    });
  }
  
  private loadBookData(uuid: string): void {
    forkJoin({
      libro: this.bookService.getLibroByUuid(uuid),
      autores: this.bookService.getAutoresForLibro(uuid)
    }).subscribe(({ libro, autores }) => {
      
      console.log('Libro recibido:', libro);
      console.log('¿Tiene imagen?', libro.imagen);
      

      if (!libro.imagen || libro.imagen === '') {
        console.log(' Imagen no encontrada, buscando en lista completa...');
        
        this.bookService.getLibros().subscribe(libros => {
          const libroConImagen = libros.find(l => l.uuid === uuid);
          
          if (libroConImagen?.imagen) {
            console.log(' Imagen encontrada en lista:', libroConImagen.imagen);
            libro.imagen = libroConImagen.imagen;
          } else {
            console.log(' Imagen no encontrada en lista tampoco');
          }
          
          this.fillForm(libro, autores);
        });
      } else {

        console.log(' Imagen encontrada directamente:', libro.imagen);
        this.fillForm(libro, autores);
      }
    });
  }


  private fillForm(libro: any, autores: any[]): void {
    const autoresIds = autores.map(a => a.id);
    
  
    const idCategoria = libro.categoria?.id || null;
    const idEditorial = libro.editorial?.id || null;
    const idIdioma = libro.idioma?.id || null;
    const idTipoLibro = libro.tipoLibro?.id || null;
    const imagenUrl = libro.imagen || '';
    
    console.log('Valores a asignar al formulario:', {
      idCategoria,
      idEditorial,
      idIdioma,
      idTipoLibro,
      autoresIds,
      imagenUrl
    });
    

    this.libroForm.patchValue({
      titulo: libro.titulo,
      resumen: libro.resumen,
      isbn: libro.isbn,
      anho: parseInt(libro.anho, 10),
      paginas: libro.paginas,
      edicion: libro.edicion || '',
      pasta: libro.pasta || '',
      imagen: imagenUrl,
      idCategoria: idCategoria,
      idEditorial: idEditorial,
      idIdioma: idIdioma,
      idTipoLibro: idTipoLibro,
      idAutores: autoresIds
    });
    
    console.log(' Formulario completado. Valor de imagen:', this.libroForm.get('imagen')?.value);
    
    this.cdr.detectChanges();
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
      case 'autor': 
        request$ = this.catalogService.createAutor(payload); 
        break;
      case 'categoria': 
        request$ = this.catalogService.createCategoria({ nombre: payload.nombre }); 
        break;
      case 'editorial': 
        request$ = this.catalogService.createEditorial({ nombre: payload.nombre }); 
        break;
      case 'idioma': 
        request$ = this.catalogService.createIdioma({ nombre: payload.nombre }); 
        break;
      case 'tipoLibro': 
        request$ = this.catalogService.createTipoLibro({ nombre: payload.nombre }); 
        break;
      default:
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Tipo de catálogo no soportado.' 
        });
        return;
    }

    request$.subscribe(nuevoItem => {
      this.messageService.add({ 
        severity: 'success', 
        summary: 'Éxito', 
        detail: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} agregado.`
      });
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
      
      this.cdr.detectChanges();
    });
  }

  onSubmit(): void {
    if (this.libroForm.invalid) {
      this.libroForm.markAllAsTouched();
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Formulario Incompleto', 
        detail: 'Por favor, rellena todos los campos requeridos.' 
      });
      return;
    }

    this.isSubmitting = true;
    const formValues = this.libroForm.value;

    const libroPayload = {
      titulo: formValues.titulo,
      isbn: formValues.isbn,
      anho: formValues.anho.toString(),
      resumen: formValues.resumen,
      edicion: formValues.edicion || '',
      pasta: formValues.pasta || '',
      imagen: formValues.imagen || '',
      paginas: formValues.paginas,
      idTipoLibro: formValues.idTipoLibro,
      idCategoria: formValues.idCategoria,
      idEditorial: formValues.idEditorial,
      idIdioma: formValues.idIdioma,
    };

    if (this.isEditMode && this.libroUuid) {
      this.bookService.updateLibro(this.libroUuid, libroPayload).pipe(
        switchMap((libroActualizado: Libro) => {
          const autoresPayload = formValues.idAutores.map((id: number) => ({ idAutor: id }));
          return this.bookService.addAutoresToLibro(libroActualizado.uuid, autoresPayload);
        }),
        finalize(() => this.isSubmitting = false)
      ).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Éxito', 
            detail: 'Libro actualizado correctamente.' 
          });
          setTimeout(() => this.router.navigate(['/admin']), 1500);
        },
        error: (err) => {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudo actualizar el libro.' 
          });
          console.error(err);
        }
      });
    } else {
      this.bookService.createLibro(libroPayload).pipe(
        switchMap((libroCreado: Libro) => {
          const autoresPayload = formValues.idAutores.map((id: number) => ({ idAutor: id }));
          return this.bookService.addAutoresToLibro(libroCreado.uuid, autoresPayload).pipe(
            map(() => libroCreado)
          );
        }),
        finalize(() => this.isSubmitting = false)
      ).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Éxito', 
            detail: 'Libro creado correctamente.' 
          });
          setTimeout(() => this.router.navigate(['/admin']), 1500);
        },
        error: (err) => {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudo crear el libro.' 
          });
          console.error(err);
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin']);
  }
}
