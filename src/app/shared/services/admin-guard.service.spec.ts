import { TestBed } from '@angular/core/testing';

import { AdminGuardService } from '~/app/shared/services/admin-guard.service';
import { TestingModule } from '~/app/testing.module';

describe('AdminGuardService', () => {
  let service: AdminGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminGuardService],
      imports: [TestingModule]
    });
    service = TestBed.inject(AdminGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
