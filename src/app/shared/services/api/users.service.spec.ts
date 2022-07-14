import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UsersService } from '~/app/shared/services/api/users.service';
import { TestingModule } from '~/app/testing.module';

describe('UsersService', () => {
  let service: UsersService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestingModule]
    });
    service = TestBed.inject(UsersService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call list', () => {
    service.list().subscribe();
    const req = httpTesting.expectOne('api/users/');
    expect(req.request.method).toBe('GET');
  });

  it('should call create', () => {
    /* eslint-disable @typescript-eslint/naming-convention */
    service
      .create({
        uid: 'foo',
        display_name: 'foo bar',
        email: 'foobar@gmail.com',
        max_buckets: 1000,
        object_usage: 1000,
        size_usage: 1000,
        suspended: true
      })
      .subscribe();
    const req = httpTesting.expectOne('api/users/create');
    expect(req.request.method).toBe('POST');
  });

  it('should call delete', () => {
    service.delete('foo').subscribe();
    const req = httpTesting.expectOne('api/users/foo');
    expect(req.request.method).toBe('DELETE');
  });

  it('should call update', () => {
    service.update({ uid: 'baz', display_name: 'baz bar' }).subscribe();
    const req = httpTesting.expectOne('api/users/baz');
    expect(req.request.method).toBe('PATCH');
  });

  it('should call get', () => {
    service.get('foo').subscribe();
    const req = httpTesting.expectOne('api/users/foo');
    expect(req.request.method).toBe('GET');
  });

  it('should call exists', () => {
    service.exists('foo').subscribe();
    const req = httpTesting.expectOne('api/users/foo');
    expect(req.request.method).toBe('GET');
  });
});
