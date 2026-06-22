import { useState } from 'react';

// Ввод интересов/хобби чипсами: пишешь слово и жмёшь Enter — добавился чип.
// Backspace на пустом поле удаляет последний. Используется в онбординге и
// редактировании профиля.
export default function InterestsInput({
  value,
  onChange,
  placeholder,
  max = 12,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max?: number;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim().slice(0, 30);
    if (v && !value.includes(v) && value.length < max) onChange([...value, v]);
    setDraft('');
  }

  return (
    <div className="interests-input">
      {value.length > 0 && (
        <div className="interests-chips">
          {value.map((it) => (
            <span className="interest-chip" key={it}>
              {it}
              <button
                type="button"
                className="interest-chip-x"
                onClick={() => onChange(value.filter((x) => x !== it))}
                aria-label="×"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="ep-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
