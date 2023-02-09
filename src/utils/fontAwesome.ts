import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faPlay,
  faPause,
  faForwardStep,
  faBackwardStep,
  faShuffle,
  faRepeat,
} from '@fortawesome/free-solid-svg-icons';

const registerIcons = (): void => {
  // Add fontawesome icons to the library in order to import just used icons
  library.add(
    faPlay,
    faPause,
    faForwardStep,
    faBackwardStep,
    faShuffle,
    faRepeat
  );
};

export default registerIcons;
