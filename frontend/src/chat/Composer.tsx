import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { QUESTION_MAX_CHARS } from '../types/api';
import { SearchIcon, SendIcon } from '../ui/Icon';
import styles from './Composer.module.css';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** The mobile home input carries the search affordance. */
  showSearchIcon?: boolean;
  /** True while a question is in flight. One question at a time. */
  disabled?: boolean;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  showSearchIcon = false,
  disabled = false,
}: ComposerProps) {
  const [showCounter, setShowCounter] = useState(false);

  const overLimit = value.length > QUESTION_MAX_CHARS;
  const canSend = value.trim() !== '' && !overLimit && !disabled;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSend) {
      onSubmit(value);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSubmit(value);
      }
    }
  }

  return (
    <form className={styles.root} onSubmit={submit}>
      {showSearchIcon && <SearchIcon className={styles.searchIcon} size={19} />}
      <div className={styles.field}>
        <label className="visually-hidden" htmlFor="chat-input">
          Ask AskANU a question
        </label>
        <textarea
          className={styles.input}
          id="chat-input"
          onBlur={() => setShowCounter(false)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setShowCounter(true)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about courses, scholarships, accommodation, jobs, events or support services at ANU."
          rows={showSearchIcon ? 3 : 2}
          value={value}
        />
        <span
          className={`${styles.counter} ${overLimit ? styles.counterOverLimit : ''}`}
        >
          {showCounter || overLimit
            ? `${value.length} / ${QUESTION_MAX_CHARS}`
            : ''}
        </span>
      </div>
      <button
        aria-label="Send"
        className={styles.send}
        disabled={!canSend}
        type="submit"
      >
        <SendIcon size={19} />
      </button>
    </form>
  );
}
