import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { S3UserService } from '~/app/shared/services/api/s3-user.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { TestingModule } from '~/app/testing.module';

describe('S3UserService', () => {
  let service: S3UserService;
  let httpTesting: HttpTestingController;
  let authStorageService: AuthStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStorageService],
      imports: [TestingModule]
    });
    service = TestBed.inject(S3UserService);
    httpTesting = TestBed.inject(HttpTestingController);
    authStorageService = TestBed.inject(AuthStorageService);
    authStorageService.set('bar', 'baz', '456');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call stats', () => {
    service.stats().subscribe();
    const req = httpTesting.expectOne('/?usage=');
    expect(req.request.method).toBe('GET');
  });
});
