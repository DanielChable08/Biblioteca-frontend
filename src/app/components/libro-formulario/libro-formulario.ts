import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { finalize, switchMap, forkJoin } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

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
import { environment } from '../../../environments/enviroment';

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
  styleUrls: ['./libro-formulario.css'],
  animations: [
    trigger('dropIn', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('250ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateY(-10px)', opacity: 0 })),
      ]),
    ]),
  ],
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
  tituloDialog: string | null = null;

  isEditMode = false;
  private libroUuid: string | null = null;

  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

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
      resumen: [''],
      isbn: ['', [Validators.pattern(/^\d{10}$|^\d{13}$/)]],
      isbnDisplay: [''],
      anho: [new Date().getFullYear(), [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      paginas: [null, [Validators.required, Validators.min(1)]],
      edicion: [''],
      pasta: [''],
      idCategoria: [null, Validators.required],
      idEditorial: [null, Validators.required],
      idIdioma: [null, Validators.required],
      idTipoLibro: [null, Validators.required],
    });

    this.catalogoForm = this.fb.group({
      nombre: ['', Validators.required],
      apPaterno: ['', Validators.minLength(2)],
      apMaterno: ['', Validators.minLength(2)]
    });

    this.libroForm.get('isbnDisplay')!.valueChanges.subscribe((val: string) => {
      const raw = (val || '').replace(/\D/g, '');
      let formatted = '';
      if (raw.length <= 10) {
        if (raw.length > 0) formatted += raw.substring(0, 1);
        if (raw.length > 1) formatted += '-' + raw.substring(1, 4);
        if (raw.length > 4) formatted += '-' + raw.substring(4, 9);
        if (raw.length > 9) formatted += '-' + raw.substring(9, 10);
      } else {
        if (raw.length > 0) formatted += raw.substring(0, 3);
        if (raw.length > 3) formatted += '-' + raw.substring(3, 4);
        if (raw.length > 4) formatted += '-' + raw.substring(4, 7);
        if (raw.length > 7) formatted += '-' + raw.substring(7, 12);
        if (raw.length > 12) formatted += '-' + raw.substring(12, 13);
      }
      if (val !== formatted) {
        this.libroForm.get('isbnDisplay')!.setValue(formatted, { emitEvent: false });
      }
      const isbnCtrl = this.libroForm.get('isbn')!;
      isbnCtrl.setValue(raw, { emitEvent: true });
    });
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Solo se permiten imágenes.' });
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  private loadCatalogsAndData(): void {
    forkJoin({
      autores: this.catalogService.getAutores(),
      categorias: this.catalogService.getCategorias(),
      editoriales: this.catalogService.getEditoriales(),
      idiomas: this.catalogService.getIdiomas(),
      tiposLibro: this.catalogService.getTiposLibros()
    }).subscribe(catalogs => {
      this.autores = catalogs.autores.map(a => ({
        ...a,
        displayName: `${a.nombre} ${a.apPaterno || ''} ${a.apMaterno || ''}`.trim()
      }));
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
      if (libro.imagen) {
        this.imagePreview = libro.imagen.startsWith('http')
          ? libro.imagen
          : `${environment.plainURL}/${libro.imagen}`;
      }
      this.fillForm(libro, autores);
    });
  }

  private fillForm(libro: any, autores: any[]): void {
    const autoresIds = autores.map(a => a.id);
    this.libroForm.patchValue({
      titulo: libro.titulo,
      resumen: libro.resumen || '',
      isbn: libro.isbn || '',
      isbnDisplay: libro.isbn || '',
      anho: parseInt(libro.anho, 10),
      paginas: libro.paginas || null,
      edicion: libro.edicion || '',
      pasta: libro.pasta || '',
      idCategoria: libro.categoria?.id || null,
      idEditorial: libro.editorial?.id || null,
      idIdioma: libro.idioma?.id || null,
      idTipoLibro: libro.tipoLibro?.id || null,
      idAutores: autoresIds
    });
    this.cdr.detectChanges();
  }

  soloNumeros(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
  }

  abrirModalAgregar(tipo: TipoCatalogo): void {
    switch (tipo) {
      case 'autor': this.tituloDialog = 'Nuevo Autor'; break;
      case 'categoria': this.tituloDialog = 'Nueva Categoría'; break;
      case 'editorial': this.tituloDialog = 'Nueva Editorial'; break;
      case 'idioma': this.tituloDialog = 'Nuevo Idioma'; break;
      case 'tipoLibro': this.tituloDialog = 'Nueva Facultad'; break;
      default: this.tituloDialog = 'Nuevo Dato';
    }
    this.catalogoSiendoAgregado = tipo;
    this.catalogoForm.reset();
    this.displayCatalogoDialog = true;
  }

  guardarNuevoCatalogo(): void {
    if (this.catalogoForm.invalid || !this.catalogoSiendoAgregado) {
      this.catalogoForm.markAllAsTouched();
      return;
    }
    const payload = this.catalogoForm.value;
    const tipo = this.catalogoSiendoAgregado;
    let request$;

    if (tipo === 'autor') {
      request$ = this.catalogService.createAutor({
        nombre: payload.nombre,
        apPaterno: payload.apPaterno?.trim() || null,
        apMaterno: payload.apMaterno?.trim() || null
      });
    } else {
      const serviceMap: any = {
        'categoria': this.catalogService.createCategoria.bind(this.catalogService),
        'editorial': this.catalogService.createEditorial.bind(this.catalogService),
        'idioma': this.catalogService.createIdioma.bind(this.catalogService),
        'tipoLibro': this.catalogService.createTipoLibro.bind(this.catalogService)
      };
      request$ = serviceMap[tipo]({ nombre: payload.nombre });
    }

    request$.subscribe({
      next: (nuevoItem: any) => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Agregado correctamente.' });
        this.displayCatalogoDialog = false;

        if (tipo === 'autor') {
          const nuevoAutor: Autor = { ...nuevoItem, displayName: `${nuevoItem.nombre} ${nuevoItem.apPaterno || ''} ${nuevoItem.apMaterno || ''}`.trim() };
          this.autores = [...this.autores, nuevoAutor];
          const current = this.libroForm.get('idAutores')?.value || [];
          this.libroForm.get('idAutores')?.setValue([...current, nuevoAutor.id]);
        } else if (tipo === 'categoria') {
          this.categorias = [...this.categorias, nuevoItem];
          this.libroForm.get('idCategoria')?.setValue(nuevoItem.id);
        } else if (tipo === 'editorial') {
          this.editoriales = [...this.editoriales, nuevoItem];
          this.libroForm.get('idEditorial')?.setValue(nuevoItem.id);
        } else if (tipo === 'idioma') {
          this.idiomas = [...this.idiomas, nuevoItem];
          this.libroForm.get('idIdioma')?.setValue(nuevoItem.id);
        } else if (tipo === 'tipoLibro') {
          this.tiposLibro = [...this.tiposLibro, nuevoItem];
          this.libroForm.get('idTipoLibro')?.setValue(nuevoItem.id);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        let tipoString;
        switch (tipo) {
          case 'autor': tipoString = 'el autor'; break;
          case 'categoria': tipoString = 'la categoría'; break;
          case 'editorial': tipoString = 'la editorial'; break;
          case 'idioma': tipoString = 'el idioma'; break;
          case 'tipoLibro': tipoString = 'la facultad'; break;
          default: tipoString = 'el dato';
        }
        let errorDetail = 'No se pudo guardar ' + tipoString + '. Verifica los datos.';
        let errorSummary = 'Error';

        if (err.status === 400) {
          if (err.error && typeof err.error === 'object') {
            const errores = Object.values(err.error).join(' ');
            errorDetail = errores;
          }
          errorSummary = 'Conflicto';
        } else if (err.status === 409) {
          errorSummary = 'Conflicto';
          errorDetail = err.error.error;
        }

        this.messageService?.add({
          severity: 'error',
          summary: errorSummary,
          detail: errorDetail
        });
      }
    });
  }

  onSubmit(): void {
    if (this.libroForm.invalid) {
      this.libroForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Rellena los campos obligatorios.' });
      return;
    }

    this.isSubmitting = true;
    const fv = this.libroForm.value;

    const edicionSegura = (fv.edicion && fv.edicion.trim() !== '') ? fv.edicion : 'Sin edición';
    const pastaSegura = fv.pasta || '';

    const libroPayload = {
      titulo: fv.titulo,
      isbn: fv.isbn || null,
      anho: fv.anho.toString(),
      resumen: fv.resumen || '',
      edicion: edicionSegura,
      pasta: pastaSegura,
      paginas: fv.paginas || 0,
      idTipoLibro: fv.idTipoLibro,
      idCategoria: fv.idCategoria,
      idEditorial: fv.idEditorial,
      idIdioma: fv.idIdioma,
    };

    const archivoParaEnviar = this.selectedFile ? this.selectedFile : null;

    let operacionLibro$;
    if (this.isEditMode && this.libroUuid) {
      operacionLibro$ = this.bookService.updateLibroConImagen(
        this.libroUuid,
        libroPayload,
        archivoParaEnviar
      );
    }
    else {
      operacionLibro$ = this.bookService.createLibroConImagen(
        libroPayload,
        archivoParaEnviar
      );
    }

    operacionLibro$.pipe(
      switchMap((libro: Libro) => {
        const autoresPayload = fv.idAutores.map((id: number) => ({ idAutor: id }));
        return this.bookService.addAutoresToLibro(libro.uuid, autoresPayload);
      }),
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Operación completada.' });
        setTimeout(() => this.router.navigate(['/admin']), 1500);
      },
      error: (err) => {
        let errorDetail = 'No se pudo guardar el ejemplar. Verifica los datos.';
        let errorSummary = 'Error';

        if (err.status === 400) {
          if (err.error && typeof err.error === 'object') {
            const errores = Object.values(err.error).join(' ');
            errorDetail = errores;
          }
          errorSummary = 'Conflicto';
        } else if (err.status === 409) {
          errorSummary = 'Conflicto';
          errorDetail = err.error.error;
        }

        this.messageService?.add({
          severity: 'error',
          summary: errorSummary,
          detail: errorDetail
        });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/admin']);
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }
}