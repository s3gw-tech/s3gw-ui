import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { BucketFormPageComponent } from '~/app/pages/bucket/bucket-form-page/bucket-form-page.component';
import { PagesModule } from '~/app/pages/pages.module';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { TestingModule } from '~/app/testing.module';

describe('BucketFormPageComponent', () => {
  let component: BucketFormPageComponent;
  let fixture: ComponentFixture<BucketFormPageComponent>;
  let authStorageService: AuthStorageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BucketFormPageComponent],
      imports: [PagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    authStorageService = TestBed.inject(AuthStorageService);
    authStorageService.set('foo', 'bar', 'baz');
    fixture = TestBed.createComponent(BucketFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
