import { ComponentFixture, TestBed } from '@angular/core/testing';

import  MultaLista  from './multa-lista';

describe('MultaLista', () => {
  let component: MultaLista;
  let fixture: ComponentFixture<MultaLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultaLista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultaLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
