import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';

type Breadcrumb = {
  label: string;
  path: string | null;
};

@Component({
  selector: 's3gw-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})
export class BreadcrumbsComponent implements OnDestroy {
  public breadcrumbs: Breadcrumb[] = [];
  public subscription: Subscription;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.breadcrumbs = this.buildBreadCrumb(this.activatedRoute.root);
    this.subscription = this.router.events
      .pipe(
        filter((x) => x instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.breadcrumbs = this.buildBreadCrumb(this.activatedRoute.root);
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private buildBreadCrumb(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    let label = route.routeConfig?.data?.['breadcrumb'] ?? '';
    let path: string = route.routeConfig?.data ? (route.routeConfig.path as string) : '';

    // If the route is dynamic route such as 'users/edit/:id', remove it.
    const lastRoutePart = path.split('/').pop() || '';
    if (lastRoutePart.startsWith(':') && !!route.snapshot) {
      const paramName = lastRoutePart.split(':')[1];
      path = path.replace(lastRoutePart, route.snapshot.params[paramName]);
      label = route.snapshot.params[paramName];
    }

    // If path still contains tokens, e.g. ':uid/key', then replace them.
    if (!!route.snapshot) {
      const paramNames = _.keys(route.snapshot.params);
      const replaceTokens = _.some(paramNames, (name: string) => path.includes(`:${name}`));
      if (replaceTokens) {
        _.forEach(paramNames, (name: string) => {
          path = path.replace(`:${name}`, route.snapshot.params[name]);
        });
      }
    }

    const nextUrl = path ? `${url}/${path}` : url;
    const breadcrumb: Breadcrumb = {
      label,
      path: nextUrl
    };
    const newBreadcrumbs = breadcrumb.label ? [...breadcrumbs, breadcrumb] : [...breadcrumbs];
    if (route.firstChild) {
      return this.buildBreadCrumb(route.firstChild, nextUrl, newBreadcrumbs);
    }
    return newBreadcrumbs;
  }
}
