import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { ModalComponent } from '~/app/shared/components/modal/modal.component';
import { S3GW_MODAL_DATA } from '~/app/shared/services/dialog.service';
import { TestingModule } from '~/app/testing.module';

describe('DialogComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, TestingModule],
      providers: [
        { provide: S3GW_MODAL_DATA, useValue: {} },
        {
          provide: NgbActiveModal,
          useValue: {}
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
