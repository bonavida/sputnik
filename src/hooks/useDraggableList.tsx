import { useRef } from 'react';
/** Context */
import usePlaylist from '@context/usePlaylist';
/** Types */
import { DraggableEvent } from '@customTypes/playlist';

const useDraggableList = (
  rowClassName: string,
  draggingRowClassName: string
) => {
  const { list, setList } = usePlaylist();
  const dragItem = useRef<number>();
  const dragOverItem = useRef<number>();

  const handleDragStart = (
    e: DraggableEvent<HTMLElement>,
    position: number
  ) => {
    dragItem.current = position;
    e.target.style.opacity = '0.7';
  };

  const handleDragEnter = (
    e: DraggableEvent<HTMLElement>,
    position: number
  ) => {
    dragOverItem.current = position;
    e.target.classList.add(draggingRowClassName);
    if (dragItem.current === position) return;
    e.target.style.opacity = '0.9';
  };

  const handleDragLeave = (
    e: DraggableEvent<HTMLElement>,
    position: number
  ) => {
    e.target.classList.remove(draggingRowClassName);
    if (dragItem.current === position) return;
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e: DraggableEvent<HTMLElement>) => {
    // Necessary to prevent the not-allowed cursor to appear when dragging items
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (dragItem.current === undefined || dragOverItem.current === undefined) {
      return;
    }

    // Reorder list
    const copyListItems = [...list];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    setList(copyListItems);

    // Initialize refs
    dragItem.current = undefined;
    dragOverItem.current = undefined;

    // Remove all residual dragging classes
    document.querySelectorAll<HTMLElement>(rowClassName).forEach((row) => {
      row.classList.remove(draggingRowClassName);
      row.style.opacity = '1';
    });
  };

  return {
    list,
    setList,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDragEnd,
  };
};

export default useDraggableList;
