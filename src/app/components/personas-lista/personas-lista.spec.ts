import { ComponentFixture, TestBed } from '@angular/core/testing';

import  PersonasLista  from './personas-lista';

describe('PersonasLista', () => {
  let component: PersonasLista;
  let fixture: ComponentFixture<PersonasLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonasLista]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonasLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
