import { ComponentFixture, TestBed } from '@angular/core/testing';

import  PagosIndex  from './pagos-index';

describe('PagosIndex', () => {
  let component: PagosIndex;
  let fixture: ComponentFixture<PagosIndex>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagosIndex]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagosIndex);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
