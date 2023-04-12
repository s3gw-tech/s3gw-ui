import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

export type ForTimesContext = {
  $implicit: number;
  index: number;
};

@Directive({
  selector: '[ngForTimes]' // eslint-disable-line
})
export class ForTimesDirective {
  constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef) {}

  @Input()
  set ngForTimes(count: number) {
    this.viewContainer.clear();
    for (let i = 0; i < count; i++) {
      this.viewContainer.createEmbeddedView<ForTimesContext>(this.templateRef, {
        $implicit: i,
        index: i
      });
    }
  }

  static ngTemplateContextGuard(dir: ForTimesDirective, ctx: unknown): ctx is ForTimesDirective {
    return true;
  }
}
