import { ComponentFixture, TestBed } from '@angular/core/testing';

import  Estados  from './estados';

describe('Estados', () => {
  let component: Estados;
  let fixture: ComponentFixture<Estados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Estados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Estados);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
