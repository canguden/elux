// Global type extensions for Elux
interface Window {
  EluxLink: (props: {
    href: string;
    children: any;
    className?: string;
    [key: string]: any;
  }) => Element;
  updateCounterDisplay: (value: number) => void;
  __INITIAL_DATA__?: Record<string, any>;
  __ELUX_DEBUG__?: boolean;
}
