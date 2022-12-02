import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthSessionService]
    });
    service = TestBed.inject(AuthSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});