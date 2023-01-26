import { useState, useRef } from 'react';
/** Types */
import { DraggableEvent } from '@customTypes/drag';

const App = () => {
  const [list, setList] = useState([
    {
      id: 1,
      title: 'I Wanna Be Adored - Remastered',
      artist: 'The Stone Roses',
      album: 'The Stone Roses',
      duration: '4:53',
    },
    {
      id: 2,
      title: 'Unfinished Sympathy',
      artist: 'Massive Attack',
      album: 'Blue Lines',
      duration: '5:08',
    },
    {
      id: 3,
      title: 'Stop',
      artist: 'J Dilla',
      album: 'Donuts',
      duration: '1:39',
    },
    {
      id: 4,
      title: 'B.O.T.A. (Baddest Of Them All) - Edit',
      artist: 'Eliza Rose, Interplanetary Criminal',
      album: 'B.O.T.A. (Baddest Of Them All) / Move To The',
      duration: '3:46',
    },
    {
      id: 5,
      title: 'The Will To Death',
      artist: 'John Frusciante',
      album: 'The Will To Death',
      duration: '3:48',
    },
  ]);
  const dragItem = useRef<number>();
  const dragOverItem = useRef<number>();

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
    // Necessary to prevent the not-allowed cursor to appear when draggin items
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
    <div className="App">
      {!!list.length && (
        <ul className="playlist">
          <li className="playlist__header">
            <span>#</span>
            <span>Title</span>
            <span>Artist</span>
            <span>Album</span>
            <span>Duration</span>
          </li>
          {list.map(({ id, title, artist, album, duration }, index) => (
            <li
              key={`list_item_${id}`}
              className="playlist__row"
              draggable
              onDragStart={(e: DraggableEvent<HTMLLIElement>) =>
                handleDragStart(e, index)
              }
              onDragEnter={(e: DraggableEvent<HTMLLIElement>) =>
                handleDragEnter(e, index)
              }
              onDragLeave={(e: DraggableEvent<HTMLLIElement>) =>
                handleDragLeave(e, index)
              }
              onDragOver={(e: DraggableEvent<HTMLLIElement>) =>
                handleDragOver(e)
              }
              onDragEnd={handleDragEnd}
            >
              <span>{index + 1}</span>
              <span>{title}</span>
              <span>{artist}</span>
              <span>{album}</span>
              <span>{duration}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default App;
