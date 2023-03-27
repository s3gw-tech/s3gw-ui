import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { PagesModule } from '~/app/pages/pages.module';
import { BucketLifecycleDatatablePageComponent } from '~/app/pages/shared/bucket/bucket-lifecycle-datatable-page/bucket-lifecycle-datatable-page.component';
import { TestingModule } from '~/app/testing.module';

describe('BucketLifecycleDatatablePageComponent', () => {
  let component: BucketLifecycleDatatablePageComponent;
  let fixture: ComponentFixture<BucketLifecycleDatatablePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BucketLifecycleDatatablePageComponent],
      imports: [PagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BucketLifecycleDatatablePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
