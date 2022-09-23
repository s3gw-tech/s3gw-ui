import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 's3gw-page-title',
  templateUrl: './page-title.component.html',
  styleUrls: ['./page-title.component.scss']
})
export class PageTitleComponent {
  public title: string;

  constructor(private activatedRoute: ActivatedRoute) {
    this.title = this.activatedRoute.snapshot.data?.['title'] ?? '';
  }
}
