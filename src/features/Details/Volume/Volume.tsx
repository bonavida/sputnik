import { ChangeEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
/** Components */
import Button from '@components/Button';
import RangeSlider from '@components/RangeSlider';
/** Utils */
import { getVolumeIcon } from '@utils/common';
/** Styles */
import './Volume.scss';

interface VolumeProps {
  value: number;
  isEnabled: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}

const Volume = ({
  value = 0,
  isEnabled = false,
  onChange,
  onToggle,
}: VolumeProps) => {
  return (
    <div className="volume">
      <Button className="volume__icon-wrapper" onClick={onToggle}>
        <FontAwesomeIcon
          icon={getVolumeIcon(value, isEnabled)}
          className="volume__icon"
        />
      </Button>

      <RangeSlider
        min={0}
        max={1}
        value={isEnabled ? value : 0}
        step={0.01}
        onChange={onChange}
      />
    </div>
  );
};

export default Volume;
