import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[s3gw-datatable-expanded-row-template]' // eslint-disable-line
})
export class DatatableExpandedRowTemplateDirective {
  constructor(public template?: TemplateRef<any>) {}
}
