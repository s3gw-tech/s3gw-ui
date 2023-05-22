import { TestBed } from '@angular/core/testing';

import { BasenamePipe } from '~/app/shared/pipes/basename.pipe';
import { RgwServiceConfigService } from '~/app/shared/services/rgw-service-config.service';
import { TestingModule } from '~/app/testing.module';

describe('BasenamePipe', () => {
  let pipe: BasenamePipe;
  let rgwServiceConfigService: RgwServiceConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RgwServiceConfigService],
      imports: [TestingModule]
    });
    rgwServiceConfigService = TestBed.inject(RgwServiceConfigService);
    pipe = new BasenamePipe(rgwServiceConfigService);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should get basename [1]', () => {
    expect(pipe.transform('foo.txt')).toBe('foo.txt');
  });

  it('should get basename [2]', () => {
    expect(pipe.transform('x/y/foo.txt')).toBe('foo.txt');
  });

  it('should get basename [3]', () => {
    expect(pipe.transform('/a/foo.txt')).toBe('foo.txt');
  });

  it('should get basename [4]', () => {
    expect(pipe.transform('/a/foo.txt/')).toBe('');
  });
});
