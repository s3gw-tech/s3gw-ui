import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AdminOpsBucketService, Bucket } from '~/app/shared/services/api/admin-ops-bucket.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { TestingModule } from '~/app/testing.module';

describe('AdminOpsBucketService', () => {
  let service: AdminOpsBucketService;
  let httpTesting: HttpTestingController;
  let authSessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService],
      imports: [TestingModule]
    });
    service = TestBed.inject(AdminOpsBucketService);
    httpTesting = TestBed.inject(HttpTestingController);
    authSessionService = TestBed.inject(AuthSessionService);
    authSessionService.set('bar', 'baz', '456');
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

  it('should call exists [1]', (done) => {
    jest.spyOn(service, 'get').mockReturnValue(throwError(() => new Error()));
    service.exists('foo').subscribe((exists: boolean) => {
      expect(exists).toBe(false);
      done();
    });
  });

  it('should call exists [2]', (done) => {
    jest.spyOn(service, 'get').mockReturnValue(of({ id: '1234', bucket: 'test' } as Bucket));
    service.exists('foo').subscribe((exists: boolean) => {
      expect(exists).toBe(true);
      done();
    });
  });

  it('should call delete [1]', () => {
    service.delete('bar').subscribe();
    const req = httpTesting.expectOne('/admin/bucket?bucket=bar&purge-objects=true');
    expect(req.request.method).toBe('DELETE');
  });

  it('should call delete [2]', () => {
    service.delete('bar', false).subscribe();
    const req = httpTesting.expectOne('/admin/bucket?bucket=bar&purge-objects=false');
    expect(req.request.method).toBe('DELETE');
  });
});
