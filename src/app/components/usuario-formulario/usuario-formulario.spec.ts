import { ComponentFixture, TestBed } from '@angular/core/testing';

import UsuarioFormulario  from './usuario-formulario';

describe('UsuarioFormulario', () => {
  let component: UsuarioFormulario;
  let fixture: ComponentFixture<UsuarioFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioFormulario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsuarioFormulario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
