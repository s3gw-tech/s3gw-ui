import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ComponentsModule } from '~/app/shared/components/components.module';
import {
  NavigationBarItemComponent,
  NavItem
} from '~/app/shared/components/navigation-bar/navigation-bar-item/navigation-bar-item.component';
import { TestingModule } from '~/app/testing.module';

describe('NavigationBarItemComponent', () => {
  let component: NavigationBarItemComponent;
  let fixture: ComponentFixture<NavigationBarItemComponent>;
  let router: Router;

  const item: NavItem = {
    name: 'item',
    icon: 'mdi:apps',
    route: '/itemroute'
  };
  const itemSubs: NavItem = {
    name: 'itemSubs',
    icon: 'mdi:apps',
    children: [item]
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
    component.itemClicked(itemSubs);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.showSub).toBe(true);
  });
});
