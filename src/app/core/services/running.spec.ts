import { TestBed } from '@angular/core/testing';

import { Running } from './running';

describe('Running', () => {
  let service: Running;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Running);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
