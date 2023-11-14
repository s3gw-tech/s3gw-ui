import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AppMainConfigService } from '~/app/shared/services/app-main-config.service';
import { TestingModule } from '~/app/testing.module';

describe('AppMainConfigService', () => {
  let service: AppMainConfigService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppMainConfigService],
      imports: [TestingModule]
    });
    service = TestBed.inject(AppMainConfigService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config', () => {
    service.load().subscribe();
    const req = httpTesting.expectOne('assets/app-main.config.json');
    expect(req.request.method).toBe('GET');
  });
});
