import { useState } from 'react';
import {
  MOCK_SCENARIOS,
  getMockScenarioId,
  setMockScenarioId,
} from './mockTransport';
import styles from './FixturePicker.module.css';

/**
 * Development-only control for choosing which contract fixture the mock
 * transport returns, so every response state can be seen in a real browser
 * before the backend exists.
 *
 * Rendered only when the dev mock transport is selected, so it appears exactly
 * when it can do something. Vite replaces both operands at its call site with
 * literals, so a production build drops the branch and this module with it. It
 * must never ship, and it must never be the thing that decides an answer in the
 * real send path.
 */
export function FixturePicker() {
  const [scenarioId, setScenarioId] = useState(getMockScenarioId);

  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor="dev-fixture">
        Dev: mock response
      </label>
      <select
        className={styles.select}
        id="dev-fixture"
        onChange={(event) => {
          setMockScenarioId(event.target.value);
          setScenarioId(event.target.value);
        }}
        value={scenarioId}
      >
        {MOCK_SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.label}
          </option>
        ))}
      </select>
    </div>
  );
}
