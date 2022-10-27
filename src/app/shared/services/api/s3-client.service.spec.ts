import { TestBed } from '@angular/core/testing';

import { S3ClientService } from '~/app/shared/services/api/s3-client.service';
import { TestingModule } from '~/app/testing.module';

describe('S3ClientService', () => {
  let service: S3ClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [S3ClientService],
      imports: [TestingModule]
    });
    service = TestBed.inject(S3ClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
