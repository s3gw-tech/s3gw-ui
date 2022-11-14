import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ComponentsModule } from '~/app/shared/components/components.module';
import { NavigationBarItemComponent } from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { NavigationItem } from '~/app/shared/models/navigation-item.type';
import { TestingModule } from '~/app/testing.module';

describe('NavigationBarItemComponent', () => {
  let component: NavigationBarItemComponent;
  let fixture: ComponentFixture<NavigationBarItemComponent>;
  let router: Router;

  const item: NavigationItem = {
    text: 'item',
    icon: 'mdi:apps',
    url: '/itemroute'
  };
  const itemSubs: NavigationItem = {
    text: 'itemSubs',
    icon: 'mdi:apps',
    children: [item],
    expanded: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentsModule, TestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigationBarItemComponent);
    component = fixture.componentInstance;
    component.item = item;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockImplementation();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have depth 0 by default', () => {
    expect(component.depth).toBe(0);
  });

  it('should navigate if no children defined', () => {
    component.itemClicked(item);
    expect(router.navigate).toHaveBeenCalledWith(['/itemroute']);
  });

  it('should not navigate and show subs if defined', () => {
    expect(itemSubs.expanded).toBeFalsy();
    component.itemClicked(itemSubs);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(itemSubs.expanded).toBeTruthy();
  });
});
