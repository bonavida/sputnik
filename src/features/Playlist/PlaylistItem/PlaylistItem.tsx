import { forwardRef, MouseEvent } from 'react';
import type { ForwardedRef, CSSProperties, HTMLAttributes } from 'react';
import cx from 'classnames';
/** Types */
import { SongMetadata } from '@customTypes/metadata';
/** Utils */
import { formatTime } from '@utils/time';
/** Styles */
import './PlaylistItem.scss';
import { isNumber } from '@utils/common';

export type PlaylistItemProps = {
  isSelected?: boolean;
  isPlaying?: boolean;
  isDragging?: boolean;
  itemIndex?: number;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLTableRowElement>) => void;
} & SongMetadata &
  HTMLAttributes<HTMLTableRowElement>;

const PlaylistItem = forwardRef(
  (
    {
      title,
      artist,
      album,
      duration = 0,
      itemIndex,
      isSelected = false,
      isPlaying = false,
      isDragging = false,
      style = {},
      onClick,
      cover,
      ...props
    }: PlaylistItemProps,
    ref: ForwardedRef<HTMLTableRowElement>
  ) => {
    const itemClasses = cx({
      playlist__row: true,
      'playlist__row--selected': isSelected,
      'playlist__row--playing': isPlaying,
      'playlist__row--dragging': isDragging,
    });
    return (
      <tr
        ref={ref}
        style={style}
        className={itemClasses}
        onClick={onClick}
        {...props}
      >
        <td className="playlist__first">
          {isNumber(itemIndex) ? itemIndex! + 1 : null}
        </td>
        <td>{title}</td>
        <td>{artist}</td>
        <td>{album}</td>
        <td>{formatTime(duration)}</td>
      </tr>
    );
  }
);

PlaylistItem.defaultProps = {
  style: {},
  isSelected: false,
  isPlaying: false,
  isDragging: false,
  itemIndex: undefined,
  onClick: () => '',
};

export default PlaylistItem;
