import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { BibliotecarioComponent } from './bibliotecario';

describe('BibliotecarioComponent', () => {
  let component: BibliotecarioComponent;
  let fixture: ComponentFixture<BibliotecarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BibliotecarioComponent,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [ConfirmationService]
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
