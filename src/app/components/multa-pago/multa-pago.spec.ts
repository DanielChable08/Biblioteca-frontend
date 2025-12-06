import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultaPagoComponent } from './multa-pago';

describe('MultaPago', () => {
  let component: MultaPagoComponent;
  let fixture: ComponentFixture<MultaPagoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultaPagoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultaPagoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
