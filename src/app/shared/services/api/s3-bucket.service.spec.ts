import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { S3BucketService } from '~/app/shared/services/api/s3-bucket.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { TestingModule } from '~/app/testing.module';

describe('S3BucketService', () => {
  let service: S3BucketService;
  let httpTesting: HttpTestingController;
  let authStorageService: AuthStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStorageService],
      imports: [TestingModule]
    });
    service = TestBed.inject(S3BucketService);
    httpTesting = TestBed.inject(HttpTestingController);
    authStorageService = TestBed.inject(AuthStorageService);
    authStorageService.set('bar', 'baz', '456');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
