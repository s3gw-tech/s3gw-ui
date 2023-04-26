import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { S3gwApiService } from '~/app/shared/services/api/s3gw-api.service';
import { TestingModule } from '~/app/testing.module';

describe('S3gwApiService', () => {
  let service: S3gwApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [S3gwApiService],
      imports: [TestingModule]
    });
    service = TestBed.inject(S3gwApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should build valid URL [1]', () => {
    service.config.apiUrl = 'http://localhost:8080/api';
    // @ts-ignore
    expect(service.buildUrl('/foo/bar/')).toBe('http://localhost:8080/api/foo/bar/');
  });

  it('should call bucket list', () => {
    service.config.apiUrl = 'https://localhost:8080/api';
    service.get('buckets/', { credentials: { accessKey: 'foo', secretKey: 'bar' } }).subscribe();
    const req = httpTesting.expectOne(`https://localhost:8080/api/buckets/`);
    expect(req.request.method).toBe('GET');
  });
});
