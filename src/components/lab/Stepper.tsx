/**
 * The step rail: previous / next and one numbered chip per step.
 *
 * Nothing plays by itself. The reader moves, and whatever owns the rail
 * decides what a step means. Shared by every stepped figure on the page so the
 * rails all read and behave the same way.
 */

export interface StepperStep {
  id: string;
  name: string;
}

export interface StepperLabels {
  /** aria-label for the rail, e.g. "단계" */
  rail: string;
  prev: string;
  next: string;
}

export interface StepperProps {
  steps: readonly StepperStep[];
  index: number;
  onChange: (index: number) => void;
  labels: StepperLabels;
}

export function Stepper({ steps, index, onChange, labels }: StepperProps) {
  const go = (next: number) => onChange(Math.max(0, Math.min(steps.length - 1, next)));
  return (
    <nav className="stepper" aria-label={labels.rail}>
      <button
        type="button"
        className="btn stepper__arrow"
        onClick={() => go(index - 1)}
        disabled={index === 0}
      >
        <span aria-hidden="true">←</span> {labels.prev}
      </button>
      <ol className="stepper__list">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={`stepper__chip${i === index ? ' is-current' : ''}${i < index ? ' is-done' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              onClick={() => go(i)}
            >
              <span className="stepper__num">{i + 1}</span>
              <span className="stepper__name">{s.name}</span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn stepper__arrow"
        onClick={() => go(index + 1)}
        disabled={index === steps.length - 1}
      >
        {labels.next} <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
