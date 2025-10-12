import { ComponentFixture, TestBed } from '@angular/core/testing';

import EjemplarFormulario  from './ejemplar-formulario';

describe('EjemplarFormulario', () => {
  let component: EjemplarFormulario;
  let fixture: ComponentFixture<EjemplarFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EjemplarFormulario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EjemplarFormulario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
