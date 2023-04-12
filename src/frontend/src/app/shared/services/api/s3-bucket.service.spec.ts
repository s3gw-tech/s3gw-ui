import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { S3BucketService } from '~/app/shared/services/api/s3-bucket.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { TestingModule } from '~/app/testing.module';

describe('S3BucketService', () => {
  let service: S3BucketService;
  let httpTesting: HttpTestingController;
  let authSessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService],
      imports: [TestingModule, ToastrModule.forRoot()]
    });
    service = TestBed.inject(S3BucketService);
    httpTesting = TestBed.inject(HttpTestingController);
    authSessionService = TestBed.inject(AuthSessionService);
    authSessionService.set('bar', 'baz', '456');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should split key [1]', () => {
    expect(service.splitKey('/foo/bar/')).toStrictEqual(['foo', 'bar']);
  });

  it('should split key [2]', () => {
    expect(service.splitKey('///baz///xyz///')).toStrictEqual(['baz', 'xyz']);
  });

  it('should build key [1]', () => {
    expect(service.buildKey('foo', ['bar', 'baz'])).toBe('bar/baz/foo');
  });

  it('should build key [2]', () => {
    expect(service.buildKey('foo//xyz//', ['bar', 'baz'])).toBe('bar/baz/foo/xyz');
  });

  it('should build key [3]', () => {
    expect(service.buildKey('foo/xyz', '/bar/baz')).toBe('bar/baz/foo/xyz');
  });

  it('should build key [4]', () => {
    expect(service.buildKey('//foo//xyz/', '//bar//baz//')).toBe('bar/baz/foo/xyz');
  });

  it('should build prefix [1]', () => {
    expect(service.buildPrefix(['foo', 'bar', 'baz'])).toBe('foo/bar/baz');
  });

  it('should build prefix [2]', () => {
    expect(service.buildPrefix(['foo', 'bar'], true)).toBe('foo/bar/');
  });

  it('should build prefix [3]', () => {
    expect(service.buildPrefix([])).toBe('');
  });

  it('should build prefix [4]', () => {
    expect(service.buildPrefix([], true)).toBe('');
  });
});
