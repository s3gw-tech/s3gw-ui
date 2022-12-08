import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentsModule } from '~/app/shared/components/components.module';
import {
  DatatableComponent,
  SortDirection
} from '~/app/shared/components/datatable/datatable.component';
import { DatatableColumn } from '~/app/shared/models/datatable-column.type';
import { TestingModule } from '~/app/testing.module';
import { FixtureHelper } from '~/testing/unit-test-helper';

describe('DatatableComponent', () => {
  let component: DatatableComponent;
  let fixture: ComponentFixture<DatatableComponent>;
  let fh: FixtureHelper;
  let columns: DatatableColumn[];
  const data = {
    a: { foo: 'a', bar: 2, hidden: 16, inside: { color: 'Black' } },
    b: { foo: 'b', bar: 3, hidden: 2, inside: { color: 'White' } },
    c: { foo: 'c', bar: 1, hidden: 13, inside: { color: 'Green' } }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatatableComponent],
      imports: [ComponentsModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatatableComponent);
    fh = new FixtureHelper(fixture);
    component = fixture.componentInstance;
    columns = [
      {
        name: 'Foo',
        prop: 'foo'
      },
      {
        name: 'Bar',
        prop: 'bar'
      }
    ];
    component.columns = [columns[0], columns[1]];
    component.data = [data.c, data.b, data.a];
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render cell', () => {
    const pipe = {
      transform: (value: any) => value
    };
    const pipeSpy = jest.spyOn(pipe, 'transform').mockReturnValue('bar');
    component.columns = [
      {
        name: 'Foo',
        prop: 'foo',
        pipe
      }
    ];
    fixture.detectChanges();
    expect(component.renderCellValue([{ foo: 'test' }], component.columns[0])).toBe('bar');
    expect(pipeSpy).toHaveBeenCalled();
  });

  it('should set first column as sorted ascending column if not set specific', () => {
    fixture.detectChanges();
    expect(component.sortHeader).toBe('foo');
    expect(component.sortDirection).toBe(SortDirection.ascending);
    expect(component.filteredData).toEqual([data.a, data.b, data.c]);
  });

  it('should sort after specific column', () => {
    component.sortHeader = 'bar';
    component.sortDirection = SortDirection.descending;
    fixture.detectChanges();
    expect(component.sortHeader).toBe('bar');
    expect(component.sortDirection).toBe(SortDirection.descending);
    expect(component.filteredData).toEqual([data.b, data.a, data.c]);
  });

  it('should reverse listing order if the current sorting header is clicked', () => {
    fixture.detectChanges();
    component.onSortChange(columns[0]);
    expect(component.sortDirection).toBe(SortDirection.descending);
    expect(component.filteredData).toEqual([data.c, data.b, data.a]);
    component.onSortChange(columns[0]);
    expect(component.sortDirection).toBe(SortDirection.ascending);
    expect(component.filteredData).toEqual([data.a, data.b, data.c]);
  });

  it('should sort new sorting header always ascending first', () => {
    component.sortDirection = SortDirection.descending;
    fixture.detectChanges();
    component.onSortChange(columns[1]);
    expect(component.filteredData).toEqual([data.c, data.a, data.b]);
  });

  it('should highlight which column is sorted and in which direction', () => {
    fh.expectTextToBe('.sort-header.asc', 'Foo');
    fh.clickElement('.sort-header');
    fh.expectTextToBe('.sort-header.asc', null);
    fh.expectTextToBe('.sort-header.desc', 'Foo');
    fh.clickElement('thead > tr > th:nth-child(2)');
    fh.expectTextToBe('.sort-header.asc', 'Bar');
  });

  it('should not sort not sortable columns', () => {
    component.columns[0].sortable = false;
    fixture.detectChanges();
    expect(component.sortHeader).toBe('bar');
    component.onSortChange(columns[0]);
    expect(component.sortHeader).toBe('bar');
  });

  it('should not override a given css style for the column', () => {
    component.columns[0].css = 'custom-style';
    fixture.detectChanges();
    expect(component.columns[0].css).toBe('s3gw-text-no-overflow custom-style');
  });

  it('should use a different compare property', () => {
    component.columns[0].compareProp = 'hidden';
    fixture.detectChanges();
    expect(component.filteredData).toEqual([data.b, data.c, data.a]);
  });

  it('should find nested property names', () => {
    component.columns[1].compareProp = 'inside.color';
    fixture.detectChanges();
    fh.clickElement('thead > tr > th:nth-child(2)');
    fh.expectTextToBe('.sort-header.asc', 'Bar');
    expect(component.sortHeader).toBe('inside.color');
    expect(component.filteredData).toEqual([data.a, data.c, data.b]);
  });

  // This resolve the issue that the action menu closes on data refresh without a seen change.
  it('should cache the current view', () => {
    fixture.detectChanges();
    const oldTableData = component.filteredData;
    component.data = [data.c, data.b, data.a];
    expect(oldTableData).toBe(component.filteredData);
  });
});
