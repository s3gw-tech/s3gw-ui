import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { S3UserService } from '~/app/shared/services/api/s3-user.service';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { TestingModule } from '~/app/testing.module';

describe('S3UserService', () => {
  let service: S3UserService;
  let httpTesting: HttpTestingController;
  let authSessionService: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService],
      imports: [TestingModule]
    });
    service = TestBed.inject(S3UserService);
    httpTesting = TestBed.inject(HttpTestingController);
    authSessionService = TestBed.inject(AuthSessionService);
    authSessionService.set('bar', 'baz', '456');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call stats', () => {
    service.stats().subscribe();
    const req = httpTesting.expectOne('api/admin/users/bar/usage-stats');
    expect(req.request.method).toBe('GET');
  });
});
