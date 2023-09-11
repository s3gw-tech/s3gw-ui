import { TestBed } from '@angular/core/testing';

import { BasenamePipe } from '~/app/shared/pipes/basename.pipe';
import { S3gwConfigService } from '~/app/shared/services/s3gw-config.service';
import { TestingModule } from '~/app/testing.module';

describe('BasenamePipe', () => {
  let pipe: BasenamePipe;
  let s3gwConfigService: S3gwConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [S3gwConfigService],
      imports: [TestingModule]
    });
    s3gwConfigService = TestBed.inject(S3gwConfigService);
    pipe = new BasenamePipe(s3gwConfigService);
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
