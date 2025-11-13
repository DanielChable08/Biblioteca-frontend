import { ComponentFixture, TestBed } from '@angular/core/testing';

import PrestamoLista  from './prestamo-lista';

describe('PrestamoLista', () => {
  let component: PrestamoLista;
  let fixture: ComponentFixture<PrestamoLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoLista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrestamoLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
