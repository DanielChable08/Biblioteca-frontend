import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EjemplarLista } from './ejemplar-lista';

describe('EjemplarLista', () => {
  let component: EjemplarLista;
  let fixture: ComponentFixture<EjemplarLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EjemplarLista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EjemplarLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
