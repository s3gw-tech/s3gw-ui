import { TestBed } from '@angular/core/testing';

import { ModalDialogService } from '~/app/shared/services/modal-dialog.service';

describe('ModalDialogService', () => {
  let service: ModalDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ModalDialogService]
    });
    service = TestBed.inject(ModalDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
