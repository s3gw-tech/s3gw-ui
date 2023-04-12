import { TestBed } from '@angular/core/testing';

import { NavigationConfigService } from '~/app/shared/services/navigation-config.service';
import { TestingModule } from '~/app/testing.module';

describe('NavigationConfigService', () => {
  let service: NavigationConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NavigationConfigService],
      imports: [TestingModule]
    });
    service = TestBed.inject(NavigationConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
