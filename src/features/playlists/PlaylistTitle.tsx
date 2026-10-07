import { useState } from 'react';
import { useT } from '@/hooks/useT';
import { usePlaylistsStore } from '@/stores/playlistsStore';

const MAX_NAME_LENGTH = 120;

/** The list name, renamed in place: Enter or blur saves, Escape cancels */
export const PlaylistTitle = () => {
  const t = useT();
  const name = usePlaylistsStore((state) => state.name);
  const rename = usePlaylistsStore((state) => state.rename);
  // undefined while not editing
  const [draft, setDraft] = useState<string>();
  const displayName = name ?? t('untitled');

  if (draft === undefined) {
    return (
      <h2 className="min-w-0">
        <button
          type="button"
          title={t('rename')}
          onClick={() => setDraft(displayName)}
          className="no-drag block max-w-full cursor-text truncate rounded-md px-1 text-left text-lg font-medium hover:bg-raised md:text-xl"
        >
          {displayName}
        </button>
      </h2>
    );
  }

  const commit = () => {
    rename(draft);
    setDraft(undefined);
  };

  return (
    <input
      // oxlint-disable-next-line jsx-a11y/no-autofocus -- the field appears because the user asked to rename
      autoFocus
      value={draft}
      maxLength={MAX_NAME_LENGTH}
      aria-label={t('playlistName')}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') setDraft(undefined);
      }}
      className="no-drag min-w-0 flex-1 rounded-md border border-line bg-canvas px-1 text-lg font-medium md:text-xl"
    />
  );
};
