import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Running } from './running';

describe('Running', () => {
  let component: Running;
  let fixture: ComponentFixture<Running>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Running]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Running);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
