import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Procedencias } from './procedencias';

describe('Procedencias', () => {
  let component: Procedencias;
  let fixture: ComponentFixture<Procedencias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Procedencias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Procedencias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
