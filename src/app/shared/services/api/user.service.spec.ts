import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UserService } from '~/app/shared/services/api/user.service';
import { TestingModule } from '~/app/testing.module';

describe('UserService', () => {
  let service: UserService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestingModule]
    });
    service = TestBed.inject(UserService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call list', () => {
    service.list().subscribe();
    const req = httpTesting.expectOne('admin/user?list');
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
        suspended: true
      })
      .subscribe();
    const req = httpTesting.expectOne('api/user/create');
    expect(req.request.method).toBe('POST');
  });

  it('should call delete', () => {
    service.delete('foo').subscribe();
    const req = httpTesting.expectOne('api/user/foo');
    expect(req.request.method).toBe('DELETE');
  });

  it('should call update', () => {
    service.update({ user_id: 'baz', display_name: 'baz bar' }).subscribe();
    const req = httpTesting.expectOne('api/user/baz');
    expect(req.request.method).toBe('PATCH');
  });

  it('should call get', () => {
    service.get('foo').subscribe();
    const req = httpTesting.expectOne('api/user/foo');
    expect(req.request.method).toBe('GET');
  });

  it('should call exists', () => {
    service.exists('foo').subscribe();
    const req = httpTesting.expectOne('api/user/foo');
    expect(req.request.method).toBe('GET');
  });
});
