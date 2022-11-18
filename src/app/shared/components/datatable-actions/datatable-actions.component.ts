import { Component, Input } from '@angular/core';
import * as _ from 'lodash';

import { Constraint } from '~/app/shared/models/constraint.type';
import { Datatable } from '~/app/shared/models/datatable.interface';
import { DatatableAction } from '~/app/shared/models/datatable-action.type';
import { DatatableData } from '~/app/shared/models/datatable-data.type';
import { ConstraintService } from '~/app/shared/services/constraint.service';

type ValidatorFn = (selected: DatatableData[]) => boolean;

@Component({
  selector: 's3gw-datatable-actions',
  templateUrl: './datatable-actions.component.html',
  styleUrls: ['./datatable-actions.component.scss']
})
export class DatatableActionsComponent {
  @Input()
  actions?: DatatableAction[];

  @Input()
  table?: Datatable;

  constructor() {}

  isDisabled(action: DatatableAction): boolean {
    const validators: ValidatorFn[] = [];
    if (action.enabledConstraints) {
      if (_.isNumber(action.enabledConstraints.minSelected)) {
        validators.push(
          // @ts-ignore
          (selected: DatatableData[]) => selected.length >= action.enabledConstraints.minSelected
        );
      }
      if (_.isNumber(action.enabledConstraints.maxSelected)) {
        validators.push(
          // @ts-ignore
          (selected: DatatableData[]) => selected.length <= action.enabledConstraints.maxSelected
        );
      }
      if (_.isArray(action.enabledConstraints.constraint)) {
        _.forEach(action.enabledConstraints.constraint, (constraint: Constraint) => {
          validators.push(
            (selected: DatatableData[]) =>
              ConstraintService.filter(selected, constraint).length === selected.length
          );
        });
      }
      const disabled = !_.every(validators, (validator: ValidatorFn) =>
        validator(this.table?.selected ?? [])
      );
      return disabled;
    }

    return false;
  }

  onAction(action: DatatableAction): void {
    if (this.table && _.isFunction(action.callback)) {
      action.callback(this.table);
    }
  }
}
