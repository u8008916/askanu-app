import { memo, useEffect, useRef } from 'react';
import { ResourceCards } from '../resources/ResourceCards';
import { CloseIcon } from '../ui/Icon';
import { ClearChatButton } from './ClearChatButton';
import { DomainNav } from './DomainNav';
import styles from './MobileDrawer.module.css';

interface MobileDrawerProps {
  open: boolean;
  onClearChat: () => void;
  onClose: () => void;
}

/**
 * Off-canvas navigation for mobile, in the order of the confirmed design:
 * close, Clear Chat, Explore, then the resource cards. V3 keeps mobile as the
 * same responsive website, so the components are shared with the desktop rail.
 *
 * Memoised for the same reason as the rail: the composer draft lives in App, so
 * an unmemoised drawer would re-render on every keystroke.
 */
export const MobileDrawer = memo(function MobileDrawer({
  open,
  onClearChat,
  onClose,
}: MobileDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleClearChat() {
    onClearChat();
    onClose();
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        aria-label="Menu"
        aria-modal="true"
        className={styles.panel}
        id="resource-drawer"
        role="dialog"
      >
        <div className={styles.panelHeader}>
          <button
            aria-label="Close menu"
            className={styles.close}
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <ClearChatButton block onClearChat={handleClearChat} />
        <DomainNav bare onNavigate={onClose} />
        <ResourceCards />
      </div>
    </>
  );
});
