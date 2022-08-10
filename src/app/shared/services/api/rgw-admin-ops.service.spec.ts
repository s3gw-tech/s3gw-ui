import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RgwAdminOpsService } from '~/app/shared/services/api/rgw-admin-ops.service';
import { TestingModule } from '~/app/testing.module';

describe('RgwAdminOpsService', () => {
  let service: RgwAdminOpsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwAdminOpsService],
      imports: [TestingModule]
    });
    service = TestBed.inject(RgwAdminOpsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config', () => {
    const req = httpTesting.expectOne('/assets/rgw_admin_ops.config.json');
    expect(req.request.method).toBe('GET');
  });

  it('should build valid URL', () => {
    const req = httpTesting.expectOne('/assets/rgw_admin_ops.config.json');
    req.flush({ url: 'api/' });
    // @ts-ignore
    expect(service.buildUrl('/foo/bar/')).toBe('api/foo/bar/');
  });
});
