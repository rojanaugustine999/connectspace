"use client";

// A text input or textarea that suggests people when you type "@".
// Accessible "combobox" pattern (WAI-ARIA):
//   - ↑/↓ move through the suggestions, Enter or Tab picks one, Escape closes the list
//   - the screen reader hears the highlighted person via aria-activedescendant
// Picking "@ali" → Alice inserts "@alice " and keeps typing where you were.
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";

// "@" + up to 20 username characters, right before the cursor, not after a letter (so emails don't trigger it).
const TRIGGER = /(?:^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{1,20})$/;

export default function MentionField({ as: Tag = "input", value, onChange, onKeyDown, className = "", ...props }) {
  const ref = useRef(null);
  const listId = useId();
  const [match, setMatch] = useState(null); // { query, start, end }
  const [people, setPeople] = useState([]);
  const [active, setActive] = useState(0);
  const open = match !== null && people.length > 0;

  function updateMatch(el) {
    const caret = el.selectionStart ?? el.value.length;
    const m = TRIGGER.exec(el.value.slice(0, caret));
    setMatch(m ? { query: m[1], start: caret - m[1].length - 1, end: caret } : null);
  }

  // Look people up (debounced, and ignore answers that arrive after the query changed).
  const query = match?.query;
  useEffect(() => {
    if (!query) return setPeople([]);
    let current = true;
    const t = setTimeout(() => {
      api(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((data) => {
          if (!current) return;
          setPeople(data.users.slice(0, 5));
          setActive(0);
        })
        .catch(() => current && setPeople([]));
    }, 150);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [query]);

  function pick(person) {
    const text = `@${person.username} `;
    const next = value.slice(0, match.start) + text + value.slice(match.end);
    onChange({ target: { value: next } });
    setMatch(null);
    setPeople([]);
    const caret = match.start + text.length;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(caret, caret);
    });
  }

  function handleKeyDown(e) {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i + step + people.length) % people.length);
        return;
      }
      if ((e.key === "Enter" && !e.ctrlKey && !e.metaKey) || e.key === "Tab") {
        e.preventDefault(); // pick the person instead of submitting the form
        pick(people[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMatch(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Tag
        ref={ref}
        {...props}
        value={value}
        onChange={(e) => {
          onChange(e);
          updateMatch(e.target);
        }}
        onKeyDown={handleKeyDown}
        onClick={(e) => updateMatch(e.target)}
        onBlur={() => setMatch(null)}
        // HTML allows role="combobox" on <input> only; a <textarea> keeps its textbox role.
        {...(Tag === "input" && { role: "combobox", "aria-expanded": open })}
        aria-autocomplete="list"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        className={`w-full ${className}`}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="People"
          className="absolute left-0 top-full z-30 mt-1 w-64 max-w-full overflow-hidden rounded-xl border border-line bg-surface py-1 text-base font-normal shadow-lg"
        >
          {people.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} // keep focus in the field
              onClick={() => pick(p)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${i === active ? "bg-subtle" : ""}`}
            >
              <Avatar user={p} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="block truncate text-xs opacity-60">@{p.username}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
