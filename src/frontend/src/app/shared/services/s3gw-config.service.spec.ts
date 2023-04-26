import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { S3gwConfigService } from '~/app/shared/services/s3gw-config.service';
import { TestingModule } from '~/app/testing.module';

describe('S3gwConfigService', () => {
  let service: S3gwConfigService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [S3gwConfigService],
      imports: [TestingModule]
    });
    service = TestBed.inject(S3gwConfigService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config', () => {
    service.load().subscribe();
    const req = httpTesting.expectOne('assets/rgw_service.config.json');
    expect(req.request.method).toBe('GET');
  });
});
