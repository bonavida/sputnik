import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faPlay,
  faPause,
  faForwardStep,
  faBackwardStep,
  faShuffle,
  faRepeat,
} from '@fortawesome/free-solid-svg-icons';
import { faClock } from '@fortawesome/free-regular-svg-icons';

const registerIcons = (): void => {
  // Add fontawesome icons to the library in order to import just used icons
  library.add(
    faPlay,
    faPause,
    faForwardStep,
    faBackwardStep,
    faShuffle,
    faRepeat,
    faClock
  );
};

export default registerIcons;
