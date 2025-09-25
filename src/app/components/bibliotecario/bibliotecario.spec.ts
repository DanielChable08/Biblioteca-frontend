import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BibliotecarioComponent } from './bibliotecario';

describe('Bibliotecario', () => {
  let component: BibliotecarioComponent;
  let fixture: ComponentFixture<BibliotecarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibliotecarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BibliotecarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
