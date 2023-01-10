import { library } from '@fortawesome/fontawesome-svg-core';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const registerIcons = (): void => {
  // Add fontawesome icons to the library in order to import just used icons
  library.add(faTimes);
};

export default registerIcons;
