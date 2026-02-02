import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonasFormulario } from './personas-formulario';

describe('PersonasFormulario', () => {
  let component: PersonasFormulario;
  let fixture: ComponentFixture<PersonasFormulario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonasFormulario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonasFormulario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
