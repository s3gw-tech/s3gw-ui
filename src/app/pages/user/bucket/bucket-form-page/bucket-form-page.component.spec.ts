import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { BucketFormPageComponent } from '~/app/pages/admin/bucket/bucket-form-page/bucket-form-page.component';
import { UserPagesModule } from '~/app/pages/user/user-pages.module';
import { TestingModule } from '~/app/testing.module';

import { AuthSessionService } from '../../../../shared/services/auth-session.service';

describe('BucketFormPageComponent', () => {
  let component: BucketFormPageComponent;
  let fixture: ComponentFixture<BucketFormPageComponent>;
  let authSessionService: AuthSessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BucketFormPageComponent],
      imports: [TestingModule, ToastrModule.forRoot(), UserPagesModule]
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
