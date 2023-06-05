import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AppConfigService } from '~/app/shared/services/app-config.service';
import { TestingModule } from '~/app/testing.module';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppConfigService],
      imports: [TestingModule]
    });
    service = TestBed.inject(AppConfigService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config', () => {
    service.load().subscribe();
    const req = httpTesting.expectOne('assets/app.config.json');
    expect(req.request.method).toBe('GET');
  });
});
