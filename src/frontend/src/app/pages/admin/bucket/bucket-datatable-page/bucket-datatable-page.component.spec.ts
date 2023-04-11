import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastrModule } from 'ngx-toastr';

import { AdminPagesModule } from '~/app/pages/admin/admin-pages.module';
import { BucketDatatablePageComponent } from '~/app/pages/admin/bucket/bucket-datatable-page/bucket-datatable-page.component';
import { TestingModule } from '~/app/testing.module';

describe('BucketDatatablePageComponent', () => {
  let component: BucketDatatablePageComponent;
  let fixture: ComponentFixture<BucketDatatablePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BucketDatatablePageComponent],
      imports: [AdminPagesModule, TestingModule, ToastrModule.forRoot()]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BucketDatatablePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
