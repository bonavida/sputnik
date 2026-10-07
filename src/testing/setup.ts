import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { setRandomSource } from '@/stores/playerStore';
import { runTeardowns } from './renderApp';
import { resetAllStores } from './zustandMock';

vi.mock('zustand', () => import('./zustandMock'));

// jsdom gaps: browser APIs the app uses but jsdom does not implement

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) satisfies MediaQueryList,
});

globalThis.MediaMetadata ??= class {
  title: string;
  artist: string;
  album: string;
  artwork: readonly MediaImage[];

  constructor({
    title = '',
    artist = '',
    album = '',
    artwork = [],
  }: MediaMetadataInit = {}) {
    this.title = title;
    this.artist = artist;
    this.album = album;
    this.artwork = artwork;
  }
} as unknown as typeof MediaMetadata;

const showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};

const close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
}

afterEach(() => {
  cleanup();
  runTeardowns();
  resetAllStores();
  setRandomSource(Math.random);
});
