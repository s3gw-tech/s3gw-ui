import { Component } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { format } from '~/app/functions.helper';

@Component({
  selector: 's3gw-page-title',
  templateUrl: './page-title.component.html',
  styleUrls: ['./page-title.component.scss']
})
export class PageTitleComponent {
  public subTitle?: string;
  public title?: string;
  public url?: string;

  constructor(private activatedRoute: ActivatedRoute) {
    this.activatedRoute.params.subscribe((params: Params) => {
      this.subTitle = this.activatedRoute.snapshot.data?.['subTitle']
        ? format(this.activatedRoute.snapshot.data['subTitle'], params)
        : undefined;
      this.title = this.activatedRoute.snapshot.data?.['title']
        ? format(this.activatedRoute.snapshot.data['title'], params)
        : undefined;
      this.url = this.activatedRoute.snapshot.data?.['url']
        ? format(this.activatedRoute.snapshot.data['url'], params)
        : undefined;
    });
  }
}
