import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BlockUiService } from '~/app/shared/services/block-ui.service';

@Component({
  selector: 's3gw-block-ui',
  templateUrl: './block-ui.component.html',
  styleUrls: ['./block-ui.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [style({ opacity: 0 }), animate('250ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('250ms', style({ opacity: 0 }))])
    ])
  ]
})
export class BlockUiComponent {
  constructor(public blockUiService: BlockUiService) {}
}
