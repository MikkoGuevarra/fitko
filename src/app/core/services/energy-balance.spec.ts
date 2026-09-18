import { TestBed } from '@angular/core/testing';

import { EnergyBalance } from './energy-balance';

describe('EnergyBalance', () => {
  let service: EnergyBalance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnergyBalance);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
