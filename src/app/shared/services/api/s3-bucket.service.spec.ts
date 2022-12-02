import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

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
      imports: [TestingModule]
    });
    service = TestBed.inject(S3BucketService);
    httpTesting = TestBed.inject(HttpTestingController);
    authSessionService = TestBed.inject(AuthSessionService);
    authSessionService.set('bar', 'baz', '456');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
