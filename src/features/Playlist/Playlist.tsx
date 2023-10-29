import { useState, useEffect, useCallback, MouseEvent, useMemo } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
/** Hooks */
import useKeyPress from '@hooks/useKeyPress';
/** Context */
import usePlaylist from '@context/usePlaylist';
import useControls from '@context/useControls';
/** Components */
import PlaylistItem from '@features/Playlist/PlaylistItem';
import SortablePlaylistItem from '@features/Playlist/SortablePlaylistItem';
/** Utils */
import { parseMusicFiles } from '@utils/electronAPI';
/** Constants */
import { ACCEPTED_AUDIO_EXTENSIONS } from '@constants/metadata';
import {
  KEYBOARD_ARROW_UP_KEY,
  KEYBOARD_ARROW_DOWN_KEY,
  KEYBOARD_ENTER_KEY,
  KEYBOARD_DELETE_KEY,
} from '@constants/common';
/** Types */
import { SongMetadata } from '@customTypes/metadata';
/** Styles */
import './Playlist.scss';

const Playlist = () => {
  const [activePlaylistItem, setActivePlaylistItem] = useState<SongMetadata>();
  const {
    list,
    setList,
    selectedIndex,
    setSelectedIndex,
    nowPlaying,
    nowPlayingIndex,
    setNowPlayingIndex,
  } = usePlaylist();
  const { play, remove } = useControls();
  const arrowUpPressed = useKeyPress(KEYBOARD_ARROW_UP_KEY);
  const arrowDownPressed = useKeyPress(KEYBOARD_ARROW_DOWN_KEY);
  const enterPressed = useKeyPress(KEYBOARD_ENTER_KEY);
  const deletePressed = useKeyPress(KEYBOARD_DELETE_KEY);
  const isListEmpty = useMemo(() => !list.length, [list]);
  const activePlaylistItemIndex = useMemo(() => {
    if (!activePlaylistItem) return undefined;
    return list.findIndex(({ id }) => id === activePlaylistItem.id);
  }, [activePlaylistItem, list]);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating.
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDrop = useCallback(
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
    onDrop: handleDrop,
    accept: {
      'audio/mpeg': ACCEPTED_AUDIO_EXTENSIONS,
    },
  });

  const handleClick = (e: MouseEvent<HTMLTableRowElement>, index: number) => {
    // Handle double-click
    if (e.detail === 2) {
      play(index);
      return;
    }
    // Handle click
    setSelectedIndex(index);
  };

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActivePlaylistItem(list.find(({ id }) => id === active.id));
    },
    [list]
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) return;

      const activeItem = list.find(({ id }) => id === active.id);
      const overItem = list.find(({ id }) => id === over.id);

      if (!activeItem || !overItem) {
        return;
      }

      const activeIndex = list.findIndex(({ id }) => id === active.id);
      const overIndex = list.findIndex(({ id }) => id === over.id);

      if (activeIndex !== overIndex) {
        setList((prevList: SongMetadata[]) =>
          arrayMove(prevList, activeIndex, overIndex)
        );

        setSelectedIndex(overIndex);

        if (nowPlayingIndex === undefined) return;

        if (activeIndex < nowPlayingIndex) {
          setNowPlayingIndex(nowPlayingIndex - 1);
          return;
        }

        const updatedNowPlayingIndex =
          activePlaylistItem?.id === nowPlaying?.id
            ? overIndex
            : nowPlayingIndex + 1;
        setNowPlayingIndex(updatedNowPlayingIndex);
      }

      setActivePlaylistItem(undefined);
    },
    [list, nowPlaying, nowPlayingIndex, activePlaylistItem]
  );

  useEffect(() => {
    if (arrowUpPressed && selectedIndex !== undefined) {
      const nextIndex =
        selectedIndex !== 0 ? selectedIndex - 1 : list.length - 1;
      setSelectedIndex(nextIndex);
    }
  }, [arrowUpPressed]);

  useEffect(() => {
    if (arrowDownPressed && selectedIndex !== undefined) {
      const nextIndex =
        selectedIndex !== list.length - 1 ? selectedIndex + 1 : 0;
      setSelectedIndex(nextIndex);
    }
  }, [arrowDownPressed]);

  useEffect(() => {
    if (enterPressed && selectedIndex !== undefined) {
      play(selectedIndex);
    }
  }, [enterPressed]);

  useEffect(() => {
    if (deletePressed && selectedIndex !== undefined) {
      remove(selectedIndex);
    }
  }, [deletePressed]);

  return (
    <section className="playlist">
      <label {...getRootProps({ className: 'dropzone' })} htmlFor="drop-zone">
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="dropzone__overlay">
            <span>Drop songs here</span>
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToFirstScrollableAncestor]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table className="playlist__list">
            <thead>
              <tr className="playlist__header">
                <th className="playlist__first">#</th>
                <th>Title</th>
                <th>Artist</th>
                <th>Album</th>
                <th>
                  <FontAwesomeIcon icon={['far', 'clock']} />
                </th>
              </tr>
            </thead>
            {isListEmpty ? (
              <tbody>
                <tr>
                  <td className="playlist__empty">
                    <span>Drag and drop songs to add them to the playlist</span>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                <SortableContext
                  items={list}
                  strategy={verticalListSortingStrategy}
                >
                  {list.map(({ id, ...item }, index) => (
                    <SortablePlaylistItem
                      key={`list_item_${id}`}
                      {...item}
                      id={id}
                      itemIndex={index}
                      isSelected={index === selectedIndex}
                      isPlaying={id === nowPlaying?.id}
                      onClick={(e: MouseEvent<HTMLTableRowElement>) =>
                        handleClick(e, index)
                      }
                    />
                  ))}
                </SortableContext>
              </tbody>
            )}
          </table>
          <DragOverlay adjustScale style={{ transformOrigin: '0 0 ' }}>
            {activePlaylistItem ? (
              <table className="playlist__draggable">
                <tbody>
                  <PlaylistItem
                    {...activePlaylistItem}
                    itemIndex={activePlaylistItemIndex}
                    isPlaying={activePlaylistItem.id === nowPlaying?.id}
                  />
                </tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
      </label>
    </section>
  );
};

export default Playlist;
