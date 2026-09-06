import * as React from 'react';
import { useState } from 'react';
import { Form } from 'react-bootstrap';

/**
 * The common name a flashcard is tested on, which hovering turns into a box for
 * renaming it. The box stays while it is being typed in, so the name cannot be
 * snatched away mid-edit by the pointer wandering off.
 */
export const EditableCommonName = ({
  commonName,
  onEdit,
}: {
  commonName: string;
  onEdit: (commonName: string) => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  if (hovered || focused) {
    return (
      <Form.Control
        size="sm"
        type="text"
        value={commonName}
        aria-label="Common name to test"
        autoComplete="off"
        onChange={(event) => onEdit(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setHovered(false);
        }}
        onMouseLeave={() => setHovered(false)}
      />
    );
  }

  return (
    <div title="Hover to rename" style={{ cursor: 'text' }} onMouseEnter={() => setHovered(true)}>
      {commonName}
    </div>
  );
};
