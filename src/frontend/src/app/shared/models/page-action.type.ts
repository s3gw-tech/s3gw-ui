export type PageAction = {
  type?: 'button' | 'file' | 'divider';
  text?: string;
  icon?: string;
  tooltip?: string;
  callback?: (event: any) => void;
};
