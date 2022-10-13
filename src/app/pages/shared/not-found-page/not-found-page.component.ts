import { Location } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 's3gw-not-found-page',
  templateUrl: './not-found-page.component.html',
  styleUrls: ['./not-found-page.component.scss']
})
export class NotFoundPageComponent {
  constructor(private location: Location) {}

  onBack() {
    this.location.back();
  }
}
