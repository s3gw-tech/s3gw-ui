import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { Router } from '@angular/router';
import * as _ from 'lodash';
import { EMPTY, Observable, Subscription, timer } from 'rxjs';
import { catchError, finalize, take, tap } from 'rxjs/operators';

@Component({
  selector: 's3gw-dashboard-widget',
  templateUrl: './dashboard-widget.component.html',
  styleUrls: ['./dashboard-widget.component.scss']
})
export class DashboardWidgetComponent implements OnInit, OnDestroy {
  @Input()
  title?: string = '';

  @Input()
  tooltip?: string = '';

  // The auto-reload time in milliseconds. The load event will be fired
  // immediately. Set to `0` or `false` to disable this feature.
  // Defaults to `15000`.
  @Input()
  autoReload: number | boolean = 15000;

  @Input()
  loadData?: () => Observable<any>;

  // The URL to navigate to when the widget is clicked.
  @Input()
  url?: string = '';

  @Output()
  readonly updateData = new EventEmitter<any>();

  public error = false;
  public loading = false;
  public firstLoadComplete = false;

  private loadDataSubscription?: Subscription;
  private timerSubscription?: Subscription;

  constructor(private router: Router) {}

  @HostListener('click', ['$event.target'])
  onClick(): void {
    if (this.url) {
      this.router.navigate([this.url]);
    }
  }

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.loadDataSubscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();
  }

  reload(): void {
    if (!_.isFunction(this.loadData)) {
      throw new Error('No loadData attribute set.');
    }
    this.loading = true;
    this.loadDataSubscription = this.loadData()
      .pipe(
        catchError((err) => {
          if (_.isFunction(err.preventDefault)) {
            err.preventDefault();
          }
          this.loading = false;
          this.error = true;
          return EMPTY;
        }),
        tap(() => {
          this.loading = false;
          this.error = false;
          this.firstLoadComplete = true;
        }),
        finalize(() => {
          if (_.isNumber(this.autoReload) && this.autoReload > 0) {
            this.timerSubscription = timer(this.autoReload)
              .pipe(take(1))
              .subscribe(() => {
                this.loadDataSubscription!.unsubscribe();
                this.reload();
              });
          }
        })
      )
      .subscribe((data: any) => {
        this.updateData.emit(data);
      });
  }
}
