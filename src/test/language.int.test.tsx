import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { resetAllStores } from './zustandMock';
import { createTestBridge, renderApp, runTeardowns } from './renderApp';

describe('language', () => {
  it('switches the whole UI to English', async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Ajustes' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your playlist is empty' })
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('remembers the language after a restart', async () => {
    const bridge = createTestBridge();
    const first = await renderApp({ bridge });
    await first.user.click(screen.getByRole('button', { name: 'Ajustes' }));
    await first.user.click(
      screen.getByRole('menuitemradio', { name: 'English' })
    );
    await waitFor(() => expect(bridge.state.settings.locale).toBe('en'));

    first.unmount();
    runTeardowns();
    resetAllStores();
    await renderApp({ bridge });

    expect(
      screen.getByRole('button', { name: 'Previous' })
    ).toBeInTheDocument();
  });

  it('labels the native dialogs in the current language', async () => {
    const { user, bridge } = await renderApp();
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'English' }));

    await user.click(screen.getByRole('button', { name: 'Add songs' }));

    expect(bridge.calls.dialogLabels.at(-1)).toEqual({
      title: 'Add songs',
      filterName: 'Audio files',
    });
  });
});
