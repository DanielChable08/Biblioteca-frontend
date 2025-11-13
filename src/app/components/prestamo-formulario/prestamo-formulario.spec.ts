import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrestamoFormulario } from './prestamo-formulario';

describe('PrestamoFormulario', () => {
  let component: PrestamoFormulario;
  let fixture: ComponentFixture<PrestamoFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoFormulario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrestamoFormulario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
