import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { AdminPagesModule } from '~/app/pages/admin/admin-pages.module';
import { BucketFormPageComponent } from '~/app/pages/admin/bucket/bucket-form-page/bucket-form-page.component';
import { AuthSessionService } from '~/app/shared/services/auth-session.service';
import { TestingModule } from '~/app/testing.module';

describe('BucketFormPageComponent', () => {
  let component: BucketFormPageComponent;
  let fixture: ComponentFixture<BucketFormPageComponent>;
  let authSessionService: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BucketFormPageComponent],
      imports: [AdminPagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    authSessionService = TestBed.inject(AuthSessionService);
    authSessionService.set('foo', 'bar', 'baz');
    fixture = TestBed.createComponent(BucketFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
