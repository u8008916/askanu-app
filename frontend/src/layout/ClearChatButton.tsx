import { ClearChatIcon } from '../ui/Icon';
import styles from './ClearChatButton.module.css';

interface ClearChatButtonProps {
  onClearChat: () => void;
  /** The drawer shows Clear Chat full width at the top of the panel. */
  block?: boolean;
}

/** V3 locks the label as `Clear Chat`; `New Chat` is not permitted. */
export function ClearChatButton({ onClearChat, block }: ClearChatButtonProps) {
  return (
    <button
      className={`${styles.root} ${block ? styles.block : ''}`}
      onClick={onClearChat}
      type="button"
    >
      <ClearChatIcon size={17} />
      Clear Chat
    </button>
  );
}
