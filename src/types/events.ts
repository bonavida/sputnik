export type DraggableEvent<T extends HTMLElement> = React.DragEvent<T> & {
  target: T;
};

export type InputChangeEvent<T> = React.ChangeEvent<T> & {
  target: T;
};
