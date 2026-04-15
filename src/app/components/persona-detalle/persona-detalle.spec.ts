import { ComponentFixture, TestBed } from '@angular/core/testing';

import PersonaDetalle  from './persona-detalle';

describe('PersonaDetalle', () => {
  let component: PersonaDetalle;
  let fixture: ComponentFixture<PersonaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonaDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonaDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
