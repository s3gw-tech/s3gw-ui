import { TestBed } from '@angular/core/testing';

import { IsDirtyGuardService } from '~/app/shared/services/is-dirty-guard.service';

describe('IsDirtyGuardService', () => {
  let service: IsDirtyGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IsDirtyGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
