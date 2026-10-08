import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestBridge, renderApp } from '@/testing/renderApp';

type Bridge = ReturnType<typeof createTestBridge>;

const update = { version: '2.2.0', size: 86_497_213, canInstall: true };

const setup = async (updates: Partial<Bridge['updates']> = {}) => {
  const bridge = createTestBridge();
  bridge.updates = { ...bridge.updates, ...updates };
  return renderApp({ bridge });
};

const banner = () =>
  screen.queryByRole('region', { name: 'Sputnik 2.2.0 está disponible' });

const openSettings = async (user: Awaited<ReturnType<typeof setup>>['user']) =>
  user.click(screen.getByRole('button', { name: 'Ajustes' }));

describe('update notice', () => {
  it('offers to download and install a new version on Windows', async () => {
    const { user, bridge } = await setup({ available: update });

    const notice = banner();
    expect(notice).toBeInTheDocument();
    await user.click(
      within(notice as HTMLElement).getByRole('button', {
        name: 'Descargar e instalar',
      })
    );

    expect(bridge.calls.updates).toEqual(['install']);
  });

  it('offers the download elsewhere, and the release notes everywhere', async () => {
    const { user, bridge } = await setup({
      available: { ...update, canInstall: false },
    });

    await user.click(screen.getByRole('button', { name: 'Descargar' }));
    await user.click(screen.getByRole('button', { name: 'Novedades' }));

    expect(bridge.calls.updates).toEqual(['download', 'notes']);
  });

  it('does not mention a skipped version again', async () => {
    const { user, bridge } = await setup({ available: update });

    await user.click(
      screen.getByRole('button', { name: 'Omitir esta versión' })
    );

    expect(banner()).not.toBeInTheDocument();
    expect(bridge.updates.skippedVersion).toBe('2.2.0');
  });

  it('can be closed until the next start', async () => {
    const { user } = await setup({ available: update });

    await user.click(
      within(banner() as HTMLElement).getByRole('button', { name: 'Cerrar' })
    );

    expect(banner()).not.toBeInTheDocument();
  });

  it('explains why an installer that did not match was not run', async () => {
    const { user } = await setup({
      available: update,
      nextInstall: 'verification-failed',
    });

    await user.click(
      screen.getByRole('button', { name: 'Descargar e instalar' })
    );

    expect(
      await screen.findByText(/no coincide con la publicada/)
    ).toBeInTheDocument();
  });
});

describe('checking from the settings menu', () => {
  it('shows the version and confirms when it is the latest', async () => {
    const { user } = await setup();

    await openSettings(user);
    expect(screen.getByText('Versión 2.1.0')).toBeInTheDocument();
    await user.click(
      screen.getByRole('menuitem', { name: 'Buscar actualizaciones ahora' })
    );

    expect(
      await screen.findByText('Tienes la última versión (2.1.0)')
    ).toBeInTheDocument();
  });

  it('shows the notice when a check finds a new version', async () => {
    const { user } = await setup({ latest: update });

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitem', { name: 'Buscar actualizaciones ahora' })
    );

    expect(
      await screen.findByRole('region', {
        name: 'Sputnik 2.2.0 está disponible',
      })
    ).toBeInTheDocument();
  });

  it('says so when it cannot check', async () => {
    const { user } = await setup({ isOffline: true });

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitem', { name: 'Buscar actualizaciones ahora' })
    );

    expect(
      await screen.findByText(/No se pudo comprobar si hay actualizaciones/)
    ).toBeInTheDocument();
  });

  it('turns automatic checks off', async () => {
    const { user, bridge } = await setup();

    await openSettings(user);
    await user.click(
      screen.getByRole('menuitemcheckbox', { name: 'Buscar automáticamente' })
    );

    expect(bridge.updates.checkAutomatically).toBe(false);
  });
});
