import { useState, useRef, useCallback } from 'react';
import { useDropzone, FileWithPath, FileRejection } from 'react-dropzone';
/** Components */
import PlaylistItem from '@components/Playlist/PlaylistItem';
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
  const [list, setList] = useState<SongMetadata[]>([
    {
      id: '1',
      title: 'I Wanna Be Adored - Remastered',
      artist: 'The Stone Roses',
      album: 'The Stone Roses',
      duration: 251,
      cover: null,
      path: 'unknown',
    },
    {
      id: '2',
      title: 'Unfinished Sympathy',
      artist: 'Massive Attack',
      album: 'Blue Lines',
      duration: 308,
      cover: null,
      path: 'unknown',
    },
    {
      id: '3',
      title: 'Stop',
      artist: 'J Dilla',
      album: 'Donuts',
      duration: 99,
      cover: null,
      path: 'unknown',
    },
    {
      id: '4',
      title: 'B.O.T.A. (Baddest Of Them All) - Edit',
      artist: 'Eliza Rose, Interplanetary Criminal',
      album: 'B.O.T.A. (Baddest Of Them All) / Move To The',
      duration: 226,
      cover: null,
      path: 'unknown',
    },
    {
      id: '5',
      title: 'The Will To Death',
      artist: 'John Frusciante',
      album: 'The Will To Death',
      duration: 328,
      cover: null,
      path: 'unknown',
    },
  ]);
  const dragItem = useRef<number>();
  const dragOverItem = useRef<number>();

  const onDrop = useCallback(
    async (
      acceptedFiles: Array<FileWithPath>,
      rejectedFiles: Array<FileRejection>
    ) => {
      // Do something with the files
      const filePaths = acceptedFiles
        .map(({ path = '' }) => path)
        .filter((path) => path);
      const songs = await parseMusicFiles(filePaths);
      console.log(songs);
      console.log(rejectedFiles);
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
    e: DraggableEvent<HTMLLIElement>,
    position: number
  ) => {
    dragItem.current = position;
    e.target.style.opacity = '0.7';
  };

  const handleDragEnter = (
    e: DraggableEvent<HTMLLIElement>,
    position: number
  ) => {
    dragOverItem.current = position;
    e.target.classList.add('playlist__row--drag');
    if (dragItem.current === position) return;
    e.target.style.opacity = '0.9';
  };

  const handleDragLeave = (
    e: DraggableEvent<HTMLLIElement>,
    position: number
  ) => {
    e.target.classList.remove('playlist__row--drag');
    if (dragItem.current === position) return;
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e: DraggableEvent<HTMLLIElement>) => {
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
      .querySelectorAll<HTMLLIElement>('.playlist__row')
      .forEach((row) => {
        row.classList.remove('playlist__row--drag');
        row.style.opacity = '1';
      });
  };

  return (
    <section className="playlist">
      <label {...getRootProps({ className: 'dropzone' })} htmlFor="drop-zone">
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="dropzone__overlay">
            <span>Drop songs here</span>
          </div>
        )}
        {!!list.length && (
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
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              />
            ))}
          </ul>
        )}
      </label>
    </section>
  );
};

export default Playlist;
