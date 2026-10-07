import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { createTestBridge, renderApp } from '@/testing/renderApp';

const volumeSlider = () => screen.getByRole('slider', { name: 'Volumen' });

describe('volume', () => {
  it('changes the volume with the slider and remembers it', async () => {
    const { audio, bridge } = await renderApp();

    fireEvent.change(volumeSlider(), { target: { value: '0.3' } });

    expect(audio.volume).toBe(0.3);
    // Intl uses a no-break space in Spanish: "30 %"
    expect(volumeSlider()).toHaveAttribute(
      'aria-valuetext',
      expect.stringMatching(/^30\s%$/)
    );
    await waitFor(() => expect(bridge.state.settings.volume).toBe(0.3));
  });

  it('mutes with `muted` and restores the previous volume (R10)', async () => {
    const { user, audio } = await renderApp();
    fireEvent.change(volumeSlider(), { target: { value: '0.3' } });

    await user.click(screen.getByRole('button', { name: 'Silenciar' }));

    expect(audio.muted).toBe(true);
    expect(audio.volume).toBe(0.3);
    expect(volumeSlider()).toHaveValue('0');

    await user.click(screen.getByRole('button', { name: 'Activar sonido' }));

    expect(audio.muted).toBe(false);
    expect(volumeSlider()).toHaveValue('0.3');
  });

  it('unmutes when the volume is raised', async () => {
    const { user, audio } = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Silenciar' }));

    fireEvent.change(volumeSlider(), { target: { value: '0.5' } });

    expect(audio.muted).toBe(false);
  });

  it('starts with the volume saved in the last session', async () => {
    const { audio } = await renderApp({
      bridge: createTestBridge({
        state: { settings: { ...DEFAULT_SETTINGS, volume: 0.4, muted: true } },
      }),
    });

    expect(audio.volume).toBe(0.4);
    expect(audio.muted).toBe(true);
  });
});
