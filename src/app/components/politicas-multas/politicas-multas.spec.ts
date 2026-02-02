import { ComponentFixture, TestBed } from '@angular/core/testing';

import {PoliticasMultas}  from './politicas-multas';

describe('PoliticasMultas', () => {
  let component: PoliticasMultas;
  let fixture: ComponentFixture<PoliticasMultas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoliticasMultas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoliticasMultas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
