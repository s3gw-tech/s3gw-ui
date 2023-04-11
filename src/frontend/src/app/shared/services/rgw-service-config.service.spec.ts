import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';
import { TestingModule } from '~/app/testing.module';

describe('RgwServiceConfigService', () => {
  let service: RgwServiceConfigService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwServiceConfigService],
      imports: [TestingModule]
    });
    service = TestBed.inject(RgwServiceConfigService);
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
