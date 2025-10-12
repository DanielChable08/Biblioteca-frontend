import { ComponentFixture, TestBed } from '@angular/core/testing';

import  LibroFormulario  from './libro-formulario';

describe('LibroFormulario', () => {
  let component: LibroFormulario;
  let fixture: ComponentFixture<LibroFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibroFormulario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LibroFormulario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
