import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { AdminOpsBucketService } from '~/app/shared/services/api/admin-ops-bucket.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { TestingModule } from '~/app/testing.module';

describe('AdminOpsBucketService', () => {
  let service: AdminOpsBucketService;
  let httpTesting: HttpTestingController;
  let authSessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService],
      imports: [TestingModule, ToastrModule.forRoot()]
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
    const req = httpTesting.expectOne('/admin/buckets/');
    expect(req.request.method).toBe('GET');
  });

  it('should call list [2]', () => {
    service.list().subscribe();
    const req = httpTesting.expectOne('/admin/buckets/');
    expect(req.request.method).toBe('GET');
  });

  it('should call list [3]', () => {
    service.list('hugo').subscribe();
    const req = httpTesting.expectOne('/admin/buckets/?uid=hugo');
    expect(req.request.method).toBe('GET');
  });

  it('should call exists [1]', (done) => {
    service.exists('test01').subscribe((exists: boolean) => {
      expect(exists).toBe(true);
      done();
    });
    const req = httpTesting.expectOne('/admin/buckets/test01');
    req.flush('', { status: 200, statusText: '' });
    expect(req.request.method).toBe('HEAD');
  });

  it('should call exists [2]', (done) => {
    service.exists('test02').subscribe((exists: boolean) => {
      expect(exists).toBe(false);
      done();
    });
    const req = httpTesting.expectOne('/admin/buckets/test02');
    req.flush('', { status: 404, statusText: 'Bucket not found' });
    expect(req.request.method).toBe('HEAD');
  });

  it('should call delete [1]', () => {
    service.delete('bar').subscribe();
    const req = httpTesting.expectOne('/admin/buckets/bar?purge_objects=true');
    expect(req.request.method).toBe('DELETE');
  });

  it('should call delete [2]', () => {
    service.delete('bar', false).subscribe();
    const req = httpTesting.expectOne('/admin/buckets/bar?purge_objects=false');
    expect(req.request.method).toBe('DELETE');
  });
});
