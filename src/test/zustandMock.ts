/**
 * Zustand's documented testing setup: every store created during the tests is
 * reset to its initial state after each test.
 * https://zustand.docs.pmnd.rs/guides/testing
 */
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type * as Zustand from 'zustand';

const actual = await vi.importActual<typeof Zustand>('zustand');

const resets = new Set<() => void>();

const createUncurried = <State>(creator: Zustand.StateCreator<State>) => {
  const store = actual.create(creator);
  const initialState = store.getInitialState();
  resets.add(() => store.setState(initialState, true));
  return store;
};

export const create = (<State>(creator?: Zustand.StateCreator<State>) =>
  creator
    ? createUncurried(creator)
    : createUncurried) as typeof Zustand.create;

export const resetAllStores = (): void => {
  act(() => resets.forEach((reset) => reset()));
};
