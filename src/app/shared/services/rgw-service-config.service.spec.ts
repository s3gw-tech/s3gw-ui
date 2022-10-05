import { TestBed } from '@angular/core/testing';

import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';
import { TestingModule } from '~/app/testing.module';

describe('RgwServiceConfigService', () => {
  let service: RgwServiceConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwServiceConfigService],
      imports: [TestingModule]
    });
    service = TestBed.inject(RgwServiceConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
