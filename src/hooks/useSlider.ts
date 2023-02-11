import { useState, useEffect, useCallback } from 'react';

export interface SliderConfig {
  min: number | string | undefined;
  max: number | string | undefined;
  step: number | string | undefined;
  value?: string | number | undefined;
  onChange: (val: string | number | undefined) => void;
  onSlide: (val: string | number | undefined) => void;
}

const useSlider = ({ value, ...config }: SliderConfig) => {
  const [sliderVal, setSliderVal] = useState(value);
  const [configuration, setConfiguration] = useState<SliderConfig>(config);

  const onChange = useCallback((val: string | number | undefined) => {
    setSliderVal(val);
  }, []);

  useEffect(() => {
    const updatedConfig: SliderConfig = {
      ...config,
      onChange,
      value: sliderVal,
    };
    setConfiguration(updatedConfig);
  }, [sliderVal]);

  return [sliderVal, configuration] as const;
};

export default useSlider;
