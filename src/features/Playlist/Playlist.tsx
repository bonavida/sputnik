import {
  useState,
  useEffect,
  useRef,
  useCallback,
  MouseEvent,
  useMemo,
} from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
/** Hooks */
import useKeyPress from '@hooks/useKeyPress';
/** Context */
import useAudio from '@context/useAudio';
/** Components */
import PlaylistItem from '@features/Playlist/PlaylistItem';
/** Utils */
import { parseMusicFiles } from '@utils/electronAPI';
/** Constants */
import { ACCEPTED_AUDIO_EXTENSIONS } from '@constants/metadata';
/** Types */
import { DraggableEvent } from '@customTypes/playlist';
import { SongMetadata } from '@customTypes/metadata';
/** Styles */
import './Playlist.scss';

const Playlist = () => {
  const [list, setList] = useState<SongMetadata[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const dragItem = useRef<number>();
  const dragOverItem = useRef<number>();
  const { nowPlaying, changeNowPlaying } = useAudio();
  const arrowUpPressed = useKeyPress('ArrowUp');
  const arrowDownPressed = useKeyPress('ArrowDown');
  const isListEmpty = useMemo(() => !list.length, [list]);

  const onDrop = useCallback(
    async (acceptedFiles: Array<FileWithPath>) => {
      // Do something with the files
      const filePaths = acceptedFiles
        .map(({ path = '' }) => path)
        .filter((path) => path);
      const songs = await parseMusicFiles(filePaths);

      setList([...list, ...songs]);
    },
    [list]
  );

  const { isDragActive, getRootProps, getInputProps } = useDropzone({
    noClick: true,
    onDrop,
    accept: {
      'audio/mpeg': ACCEPTED_AUDIO_EXTENSIONS,
    },
  });

  const handleDragStart = (
    e: DraggableEvent<HTMLDivElement>,
    position: number
  ) => {
    dragItem.current = position;
    e.target.style.opacity = '0.7';
  };

  const handleDragEnter = (
    e: DraggableEvent<HTMLDivElement>,
    position: number
  ) => {
    dragOverItem.current = position;
    e.target.classList.add('playlist__row--drag');
    if (dragItem.current === position) return;
    e.target.style.opacity = '0.9';
  };

  const handleDragLeave = (
    e: DraggableEvent<HTMLDivElement>,
    position: number
  ) => {
    e.target.classList.remove('playlist__row--drag');
    if (dragItem.current === position) return;
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e: DraggableEvent<HTMLDivElement>) => {
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
    document
      .querySelectorAll<HTMLDivElement>('.playlist__row')
      .forEach((row) => {
        row.classList.remove('playlist__row--drag');
        row.style.opacity = '1';
      });
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>, index: number) => {
    // Handle double-click
    if (e.detail === 2) {
      changeNowPlaying(list[index]);
      return;
    }
    // Handle click
    setSelectedIndex(index);
  };

  useEffect(() => {
    if (arrowUpPressed && selectedIndex !== null) {
      const nextIndex =
        selectedIndex !== 0 ? selectedIndex - 1 : list.length - 1;
      setSelectedIndex(nextIndex);
    }
  }, [arrowUpPressed]);

  useEffect(() => {
    if (arrowDownPressed && selectedIndex !== null) {
      const nextIndex =
        selectedIndex !== list.length - 1 ? selectedIndex + 1 : 0;
      setSelectedIndex(nextIndex);
    }
  }, [arrowDownPressed]);

  return (
    <section className="playlist">
      <label {...getRootProps({ className: 'dropzone' })} htmlFor="drop-zone">
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="dropzone__overlay">
            <span>Drop songs here</span>
          </div>
        )}
        {isListEmpty ? (
          <div className="playlist__empty">
            <span>Drag and drop songs to add them to the playlist</span>
          </div>
        ) : (
          <ul className="playlist__list">
            <li className="playlist__header">
              <span>#</span>
              <span>Title</span>
              <span>Artist</span>
              <span>Album</span>
              <span>Duration</span>
            </li>
            {list.map(({ id, ...item }, index) => (
              <PlaylistItem
                key={`list_item_${id}`}
                {...item}
                index={index}
                isSelected={index === selectedIndex}
                isPlaying={id === nowPlaying?.id}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleClick(e, index)}
              />
            ))}
          </ul>
        )}
      </label>
    </section>
  );
};

export default Playlist;
