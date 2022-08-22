import { Directive, ElementRef, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';
import * as _ from 'lodash';

@Directive({
  selector: '[formControlName]' // eslint-disable-line
})
export class NativeElementDirective implements OnInit {
  constructor(private elementRef: ElementRef, private control: NgControl) {}

  ngOnInit(): void {
    if (this.control.control) {
      _.set(this.control.control, 'nativeElement', this.elementRef.nativeElement);
    }
  }
}
