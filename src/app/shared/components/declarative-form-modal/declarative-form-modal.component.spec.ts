import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { DeclarativeFormModalComponent } from '~/app/shared/components/declarative-form-modal/declarative-form-modal.component';
import { S3GW_MODAL_DATA } from '~/app/shared/services/dialog.service';
import { TestingModule } from '~/app/testing.module';

describe('DeclarativeFormModalComponent', () => {
  let component: DeclarativeFormModalComponent;
  let fixture: ComponentFixture<DeclarativeFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, ToastrModule.forRoot(), TestingModule],
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
    fixture = TestBed.createComponent(DeclarativeFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
