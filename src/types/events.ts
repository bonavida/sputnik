import { DragEvent, SyntheticEvent } from 'react';

export type DraggableEvent<T extends HTMLElement> = DragEvent<T> & {
  target: T;
};

export type AudioTimeUpdateEvent<T> = SyntheticEvent<T> & {
  target: T;
};
