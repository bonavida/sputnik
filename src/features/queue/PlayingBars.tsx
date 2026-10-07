const BAR_COUNT = 3;

interface PlayingBarsProps {
  isPlaying: boolean;
  label: string;
  className?: string;
}

/** Equalizer bars for the current song: moving while it plays, still when paused */
export const PlayingBars = ({
  isPlaying,
  label,
  className = '',
}: PlayingBarsProps) => (
  <span
    // A graphic made of animated elements: an <img> cannot hold them
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
    role="img"
    aria-label={label}
    data-playing={isPlaying || undefined}
    className={`playing-bars ${className}`}
  >
    {Array.from({ length: BAR_COUNT }, (_, index) => (
      <span key={index} className="playing-bar" />
    ))}
  </span>
);
