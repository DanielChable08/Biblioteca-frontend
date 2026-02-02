import { ComponentFixture, TestBed } from '@angular/core/testing';

import  HistorialPagos  from './historial-pagos';

describe('HistorialPagos', () => {
  let component: HistorialPagos;
  let fixture: ComponentFixture<HistorialPagos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialPagos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialPagos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
