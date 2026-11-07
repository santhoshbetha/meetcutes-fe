import { useState } from "react";

export function Editable({ text, placeholder, children, ...props }) {
  const [isEditing, setEditing] = useState(false);

  const handleKeyDown = () => {
    // Handle when key is pressed
  };

  return (
    <span>
      <span {...props}>
        {isEditing ? (
            <span
            onBlur={() => setEditing(false)}
            onKeyDown={() => handleKeyDown()}
          >
            {children}
          </span>
        ) : (
          <span onClick={() => setEditing(true)}>
            <span>{text || placeholder || "Editable content"}</span>
          </span>
        )}
      </span>
    </span>
  );
}
