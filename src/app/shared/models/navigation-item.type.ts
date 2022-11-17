export type NavigationItem = {
  text: string;
  icon: string;
  url?: string;
  children?: NavigationItem[];
  // Only used when an item has children.
  expanded?: boolean;
};
