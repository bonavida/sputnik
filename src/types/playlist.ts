export type DraggableEvent<T extends HTMLElement> = React.DragEvent<T> & {
  target: T;
};
