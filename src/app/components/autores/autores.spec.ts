import { ComponentFixture, TestBed } from '@angular/core/testing';

import  Autores  from './autores';

describe('Autores', () => {
  let component: Autores;
  let fixture: ComponentFixture<Autores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Autores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Autores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
