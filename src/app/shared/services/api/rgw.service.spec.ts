import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RgwService } from '~/app/shared/services/api/rgw.service';
import { TestingModule } from '~/app/testing.module';

describe('RgwService', () => {
  let service: RgwService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwService],
      imports: [TestingModule]
    });
    service = TestBed.inject(RgwService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config', () => {
    const req = httpTesting.expectOne('/assets/rgw_service.config.json');
    expect(req.request.method).toBe('GET');
  });

  it('should build valid URL [1]', () => {
    const req = httpTesting.expectOne('/assets/rgw_service.config.json');
    req.flush({ url: 'api/' });
    // @ts-ignore
    expect(service.buildUrl('/foo/bar/')).toBe('api/foo/bar/');
  });

  it('should build valid URL [2]', () => {
    const req = httpTesting.expectOne('/assets/rgw_service.config.json');
    req.flush({ url: 'https://xyz/abc' });
    // @ts-ignore
    expect(service.buildUrl('/foo/bar/')).toBe('https://xyz/abc/foo/bar/');
  });
});
