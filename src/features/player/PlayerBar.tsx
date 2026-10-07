import { ProgressBar } from './ProgressBar';
import { TransportControls } from './TransportControls';
import { VolumeControl } from './VolumeControl';

export const PlayerBar = () => (
  <footer className="border-t border-line px-4 pb-4 pt-3 md:px-6">
    <ProgressBar />
    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center">
      <div className="col-start-2">
        <TransportControls />
      </div>
      <VolumeControl className="justify-self-end" />
    </div>
  </footer>
);
