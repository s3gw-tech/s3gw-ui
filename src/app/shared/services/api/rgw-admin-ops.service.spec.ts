import { TestBed } from '@angular/core/testing';

import { RgwAdminOpsService } from '~/app/shared/services/api/rgw-admin-ops.service';
import { TestingModule } from '~/app/testing.module';

describe('RgwAdminOpsService', () => {
  let service: RgwAdminOpsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwAdminOpsService],
      imports: [TestingModule]
    });
    service = TestBed.inject(RgwAdminOpsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
