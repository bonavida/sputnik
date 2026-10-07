import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from './IconButton';

interface SelectableItem {
  id: string;
  label: string;
  onSelect: () => void;
}

export type MenuItem =
  | (SelectableItem & { kind: 'action'; icon?: LucideIcon })
  | (SelectableItem & { kind: 'radio' | 'checkbox'; isChecked: boolean })
  | { kind: 'heading' | 'note'; id: string; label: string }
  | { kind: 'separator'; id: string };

type Selectable = Extract<MenuItem, SelectableItem>;

interface MenuProps {
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
  align?: 'start' | 'end';
}

const ROLES: Record<Selectable['kind'], string> = {
  action: 'menuitem',
  radio: 'menuitemradio',
  checkbox: 'menuitemcheckbox',
};

const isSelectable = (item: MenuItem): item is Selectable => 'onSelect' in item;

const STATIC_STYLES: Record<'heading' | 'note', string> = {
  heading: 'px-3 pb-1 pt-2 text-xs font-medium text-fg-muted',
  note: 'px-3 py-2 text-sm text-fg-muted',
};

const renderStatic = (item: Exclude<MenuItem, Selectable>) => {
  if (item.kind === 'separator') {
    return <hr key={item.id} className="my-1 border-line" />;
  }
  return (
    <div key={item.id} role="presentation" className={STATIC_STYLES[item.kind]}>
      {item.label}
    </div>
  );
};

const iconOf = (item: Selectable): LucideIcon | undefined => {
  if (item.kind === 'action') return item.icon;
  return item.isChecked ? Check : undefined;
};

/**
 * Accessible dropdown menu (WAI-ARIA menu button pattern): arrow keys, Home,
 * End and Escape, focus returns to the trigger, closes on outside clicks.
 */
export const Menu = ({ label, icon, items, align = 'end' }: MenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const menuId = useId();
  const selectable = items.filter(isSelectable);

  const open = (id: string | undefined) => {
    setFocusedId(id);
    setIsOpen(true);
  };

  const close = (shouldRestoreFocus = true) => {
    setIsOpen(false);
    if (shouldRestoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (isOpen && focusedId) itemRefs.current.get(focusedId)?.focus();
  }, [isOpen, focusedId]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const moveFocus = (offset: 1 | -1) => {
    const index = selectable.findIndex(({ id }) => id === focusedId);
    const next = (index + offset + selectable.length) % selectable.length;
    setFocusedId(selectable[next]?.id);
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const handlers: Record<string, () => void> = {
      ArrowDown: () => moveFocus(1),
      ArrowUp: () => moveFocus(-1),
      Home: () => setFocusedId(selectable[0]?.id),
      End: () => setFocusedId(selectable.at(-1)?.id),
      Escape: () => close(),
    };
    if (event.key === 'Tab') return close(false);
    const handler = handlers[event.key];
    if (!handler) return;
    // Also tells the global shortcuts to ignore this key
    event.preventDefault();
    handler();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    open(event.key === 'ArrowDown' ? selectable[0]?.id : selectable.at(-1)?.id);
  };

  const renderItem = (item: MenuItem) => {
    if (!isSelectable(item)) return renderStatic(item);

    const isChecked = item.kind === 'action' ? undefined : item.isChecked;
    const Icon = iconOf(item);
    return (
      <button
        key={item.id}
        ref={(node) => {
          if (node) itemRefs.current.set(item.id, node);
          return () => {
            itemRefs.current.delete(item.id);
          };
        }}
        type="button"
        role={ROLES[item.kind]}
        aria-checked={isChecked}
        tabIndex={item.id === focusedId ? 0 : -1}
        onClick={() => {
          close();
          item.onSelect();
        }}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm outline-none hover:bg-raised focus-visible:bg-raised"
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {Icon && (
            <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          )}
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        ref={triggerRef}
        label={label}
        icon={icon}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => (isOpen ? close() : open(selectable[0]?.id))}
        onKeyDown={onTriggerKeyDown}
      />
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className={`no-drag absolute top-full z-30 mt-1 max-h-[min(24rem,70vh)] w-64 overflow-y-auto rounded-xl border border-line bg-canvas p-1 shadow-lg ${align === 'end' ? 'right-0' : 'left-0'}`}
        >
          {items.map(renderItem)}
        </div>
      )}
    </div>
  );
};
