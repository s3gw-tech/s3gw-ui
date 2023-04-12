import { TestBed } from '@angular/core/testing';

import { AuthGuardService } from '~/app/shared/services/auth-guard.service';
import { TestingModule } from '~/app/testing.module';

describe('AuthGuardService', () => {
  let service: AuthGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthGuardService],
      imports: [TestingModule]
    });
    service = TestBed.inject(AuthGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
