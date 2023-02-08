import { useEffect, useCallback, MouseEvent, useMemo } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
/** Hooks */
import useDraggableList from '@hooks/useDraggableList';
import useKeyPress from '@hooks/useKeyPress';
/** Context */
import usePlaylist from '@context/usePlaylist';
import useAudio from '@context/useAudio';
/** Components */
import PlaylistItem from '@features/Playlist/PlaylistItem';
/** Utils */
import { parseMusicFiles } from '@utils/electronAPI';
/** Constants */
import { ACCEPTED_AUDIO_EXTENSIONS } from '@constants/metadata';
import {
  PLAYLIST_ROW_CLASSNAME,
  PLAYLIST_DRAGGING_ROW_CLASSNAME,
  KEYBOARD_ARROW_UP_KEY,
  KEYBOARD_ARROW_DOWN_KEY,
  KEYBOARD_ENTER_KEY,
} from '@constants/common';
/** Styles */
import './Playlist.scss';

const Playlist = () => {
  const { list, setList, selectedIndex, setSelectedIndex } = usePlaylist();
  const { nowPlaying, setNowPlaying, setNowPlayingIndex } = useAudio();
  const {
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDragEnd,
  } = useDraggableList(PLAYLIST_ROW_CLASSNAME, PLAYLIST_DRAGGING_ROW_CLASSNAME);
  const arrowUpPressed = useKeyPress(KEYBOARD_ARROW_UP_KEY);
  const arrowDownPressed = useKeyPress(KEYBOARD_ARROW_DOWN_KEY);
  const enterPressed = useKeyPress(KEYBOARD_ENTER_KEY);
  const isListEmpty = useMemo(() => !list.length, [list]);

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

  const handleClick = (e: MouseEvent<HTMLDivElement>, index: number) => {
    // Handle double-click
    if (e.detail === 2) {
      setNowPlayingIndex(index);
      setNowPlaying(list[index]);
      return;
    }
    // Handle click
    setSelectedIndex(index);
  };

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
    if (selectedIndex !== undefined) {
      setNowPlayingIndex(selectedIndex);
      setNowPlaying(list[selectedIndex]);
    }
  }, [enterPressed]);

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
