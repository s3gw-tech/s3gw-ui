import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Bucket, BucketService } from '~/app/shared/services/api/bucket.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { TestingModule } from '~/app/testing.module';

describe('BucketService', () => {
  let service: BucketService;
  let httpTesting: HttpTestingController;
  let authStorageService: AuthStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStorageService],
      imports: [TestingModule]
    });
    service = TestBed.inject(BucketService);
    httpTesting = TestBed.inject(HttpTestingController);
    authStorageService = TestBed.inject(AuthStorageService);
    authStorageService.set('bar', 'baz', '456');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call list [1]', () => {
    service.list().subscribe();
    const req = httpTesting.expectOne('/admin/bucket?stats=false');
    expect(req.request.method).toBe('GET');
  });

  it('should call list [2]', () => {
    service.list(true).subscribe();
    const req = httpTesting.expectOne('/admin/bucket?stats=true');
    expect(req.request.method).toBe('GET');
  });

  it('should call list [3]', () => {
    service.list(false, 'hugo').subscribe();
    const req = httpTesting.expectOne('/admin/bucket?stats=false&uid=hugo');
    expect(req.request.method).toBe('GET');
  });

  it('should call exists (1)', (done) => {
    jest.spyOn(service, 'get').mockReturnValue(throwError(() => new Error()));
    service.exists('foo').subscribe((exists: boolean) => {
      expect(exists).toBe(false);
      done();
    });
  });

  it('should call exists (2)', (done) => {
    jest.spyOn(service, 'get').mockReturnValue(of({ id: '1234', bucket: 'test' } as Bucket));
    service.exists('foo').subscribe((exists: boolean) => {
      expect(exists).toBe(true);
      done();
    });
  });
});
