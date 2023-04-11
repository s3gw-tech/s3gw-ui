import { ViewMode } from '~/app/shared/enum/view-mode.enum';
import { NavigationItem } from '~/app/shared/models/navigation-item.type';

export type NavigationConfig = {
  viewMode: ViewMode;
  // The URL that is called whenever the view mode is changed.
  startUrl: string;
  // The navigation menu items.
  items: NavigationItem[];
};
