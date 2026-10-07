import { ProgressBar } from './ProgressBar';
import { TransportControls } from './TransportControls';
import { VolumeControl } from './VolumeControl';

/** Controls centered with the progress bar below them; volume on the right */
export const PlayerBar = () => (
  <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3 pt-2 md:px-6">
    <div className="col-start-2 flex w-[clamp(15rem,50vw,38rem)] flex-col items-center gap-1">
      <TransportControls />
      <ProgressBar />
    </div>
    <VolumeControl className="justify-self-end" />
  </footer>
);
