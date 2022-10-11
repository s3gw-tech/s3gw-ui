import { TestBed } from '@angular/core/testing';

import { RgwService } from '~/app/shared/services/api/rgw.service';
import { TestingModule } from '~/app/testing.module';

describe('RgwService', () => {
  let service: RgwService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwService],
      imports: [TestingModule]
    });
    service = TestBed.inject(RgwService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should build valid URL [1]', () => {
    service.url = 'api/';
    // @ts-ignore
    expect(service.buildUrl('/foo/bar/')).toBe('api/foo/bar/');
  });

  it('should build valid URL [2]', () => {
    service.url = 'https://xyz/abc';
    // @ts-ignore
    expect(service.buildUrl('/foo/bar/')).toBe('https://xyz/abc/foo/bar/');
  });
});
