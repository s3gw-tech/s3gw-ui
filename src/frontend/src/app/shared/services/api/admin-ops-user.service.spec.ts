import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Credentials } from '~/app/shared/models/credentials.type';
import { AdminOpsUserService } from '~/app/shared/services/api/admin-ops-user.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { TestingModule } from '~/app/testing.module';

describe('AdminOpsUserService', () => {
  let service: AdminOpsUserService;
  let httpTesting: HttpTestingController;
  let authSessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService, AdminOpsUserService],
      imports: [TestingModule]
    });
    service = TestBed.inject(AdminOpsUserService);
    httpTesting = TestBed.inject(HttpTestingController);
    authSessionService = TestBed.inject(AuthSessionService);
    authSessionService.set('foo', 'xyz', '123');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call listIds', () => {
    service.listIds().subscribe();
    const req = httpTesting.expectOne('api/admin/users/');
    expect(req.request.method).toBe('GET');
  });

  it('should call list (1)', () => {
    service.list().subscribe();
    const req = httpTesting.expectOne('api/admin/users/?details=true&stats=false');
    expect(req.request.method).toBe('GET');
  });

  it('should call list (2)', () => {
    service.list(true).subscribe();
    const req = httpTesting.expectOne('api/admin/users/?details=true&stats=true');
    expect(req.request.method).toBe('GET');
  });

  it('should call create', () => {
    /* eslint-disable @typescript-eslint/naming-convention */
    service
      .create({
        user_id: 'foo',
        display_name: 'foo bar',
        email: 'foobar@gmail.com',
        max_buckets: 1000,
        object_usage: 1000,
        size_usage: 1000,
        suspended: true,
        admin: false,
        keys: []
      })
      .subscribe();
    const req = httpTesting.expectOne(
      'api/admin/users/?uid=foo&display_name=foo%20bar&email=foobar@gmail.com&max_buckets=1000&suspended=true&admin=false'
    );
    expect(req.request.method).toBe('PUT');
  });

  it('should call delete', () => {
    service.delete('foo').subscribe();
    const req = httpTesting.expectOne('api/admin/users/foo');
    expect(req.request.method).toBe('DELETE');
  });

  it('should call update', () => {
    service.update({ user_id: 'baz', display_name: 'baz bar' }).subscribe();
    const req = httpTesting.expectOne('api/admin/users/baz?display_name=baz%20bar');
    expect(req.request.method).toBe('PUT');
  });

  it('should call get (1)', () => {
    service.get('foo').subscribe();
    const req = httpTesting.expectOne('api/admin/users/foo?stats=false');
    expect(req.request.method).toBe('GET');
  });

  it('should call get (2)', () => {
    service.get('foo', true).subscribe();
    const req = httpTesting.expectOne('api/admin/users/foo?stats=true');
    expect(req.request.method).toBe('GET');
  });

  it('should call exists (1)', (done) => {
    service.exists('user01').subscribe((exists: boolean) => {
      expect(exists).toBe(true);
      done();
    });
    const req = httpTesting.expectOne('api/admin/users/user01');
    req.flush('', { status: 200, statusText: '' });
    expect(req.request.method).toBe('HEAD');
  });

  it('should call exists (2)', (done) => {
    service.exists('user02').subscribe((exists: boolean) => {
      expect(exists).toBe(false);
      done();
    });
    const req = httpTesting.expectOne('api/admin/users/user02');
    req.flush('', { status: 404, statusText: 'Bucket not found' });
    expect(req.request.method).toBe('HEAD');
  });

  it('should call updateQuota (1)', () => {
    service
      .updateQuota('foo', { type: 'user', enabled: true, max_size: -1, max_objects: 400 })
      .subscribe();
    const req = httpTesting.expectOne(
      'api/admin/users/foo/quota?quota_type=user&enabled=true&max_size=-1&max_objects=400'
    );
    expect(req.request.method).toBe('PUT');
  });

  it('should call updateQuota (2)', () => {
    service.updateQuota('bar', { type: 'bucket', enabled: false }).subscribe();
    const req = httpTesting.expectOne('api/admin/users/bar/quota?quota_type=bucket&enabled=false');
    expect(req.request.method).toBe('PUT');
  });

  it('should call getCredentials', (done) => {
    service.getCredentials('foo').subscribe((credentials: Credentials) => {
      expect(credentials).toStrictEqual({ accessKey: 'a1', secretKey: 's1' });
      done();
    });
    const req = httpTesting.expectOne('api/admin/users/foo?stats=false');
    req.flush({
      used_id: 'foo',
      keys: [
        { access_key: 'a1', secret_key: 's1', user: 'foo' },
        { access_key: 'a2', secret_key: 's2', user: 'foo' }
      ]
    });
    expect(req.request.method).toBe('GET');
  });
});
