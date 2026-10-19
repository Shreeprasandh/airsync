import * as React from 'react';

type ModelViewerCustomElement = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement> & {
    src?: string;
    alt?: string;
    'camera-controls'?: boolean;
    'auto-rotate'?: boolean;
    'auto-rotate-delay'?: string | number;
    'rotation-per-second'?: string;
    'shadow-intensity'?: string | number;
    'shadow-softness'?: string | number;
    exposure?: string | number;
    'environment-image'?: string;
    'camera-orbit'?: string;
    'camera-target'?: string;
    'field-of-view'?: string;
    'min-field-of-view'?: string;
    'max-field-of-view'?: string;
    'interaction-prompt'?: string;
    'animation-name'?: string;
    autoplay?: boolean;
    'power-preference'?: string;
    slot?: string;
  },
  HTMLElement
>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerCustomElement;
    }
  }
  namespace React.JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerCustomElement;
    }
  }
}

export {};
