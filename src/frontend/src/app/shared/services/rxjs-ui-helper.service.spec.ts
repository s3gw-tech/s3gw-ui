import { TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { RxjsUiHelperService } from '~/app/shared/services/rxjs-ui-helper.service';
import { TestingModule } from '~/app/testing.module';

describe('RxjsUiHelperService', () => {
  let service: RxjsUiHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RxjsUiHelperService],
      imports: [TestingModule, ToastrModule.forRoot()]
    });
    service = TestBed.inject(RxjsUiHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
