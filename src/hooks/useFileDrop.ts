import { useEffect, useEffectEvent, useState } from 'react';
import { bridge } from '@/lib/bridge';

const hasFiles = (event: DragEvent) =>
  event.dataTransfer?.types.includes('Files') ?? false;

/**
 * Accepts files and folders dropped anywhere on the window and reports their
 * paths. Returns whether files are being dragged over the window.
 */
export const useFileDrop = (onDrop: (paths: string[]) => void): boolean => {
  const [isActive, setIsActive] = useState(false);
  // Always calls the latest `onDrop` without re-subscribing the listeners
  const handleDrop = useEffectEvent(onDrop);

  useEffect(() => {
    // dragenter/dragleave also fire for every child element, so count them
    let depth = 0;

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setIsActive(true);
    };
    const onDragOver = (event: DragEvent) => {
      // Required for the drop event to fire (and stops Chromium from opening the file)
      if (hasFiles(event)) event.preventDefault();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsActive(false);
    };
    const onDropEvent = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setIsActive(false);
      const files = [...(event.dataTransfer?.files ?? [])];
      handleDrop(
        files.map((file) => bridge().getPathForFile(file)).filter(Boolean)
      );
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDropEvent);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDropEvent);
    };
  }, []);

  return isActive;
};
