"use client";

/**
 * PasswordInput — input with a show/hide eye toggle.
 *
 * Wave 15 (2026-06-03, item #1). Replaces the bare
 * <input type="password"> used on /auth/login, /auth/signup, and
 * /auth/reset-password. Lets the astrologer verify what they typed
 * (critical on mobile where keystroke feedback is poor).
 *
 * Accessibility:
 *   - Eye / eye-off button is a real <button type="button"> with
 *     aria-label that updates with state
 *   - Keyboard accessible — Tab to button, Enter / Space to toggle
 *   - The toggle does NOT submit the surrounding form
 *
 * Drop-in: matches the existing inputStyle from _shell.ts visually
 * (38px height, dark surface, gold focus border on container) so
 * callers don't need to restyle.
 */

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { theme } from "@/lib/theme";

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Optional className to merge onto the WRAPPER div (not the input). */
  wrapperClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ wrapperClassName, style, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const id = props.id || useId();

    return (
      <div
        className={wrapperClassName}
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        <input
          {...props}
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          // Reserve right padding for the eye button.
          style={{
            ...style,
            paddingRight: 42,
          }}
        />
        <button
          type="button"
          tabIndex={0}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          // Don't submit the parent form, don't steal focus from input
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: "100%",
            width: 38,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: props.disabled ? "not-allowed" : "pointer",
            color: theme.text.muted,
            transition: "color 120ms",
          }}
          onMouseEnter={(e) => {
            if (!props.disabled) e.currentTarget.style.color = "#c9a96e";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.text.muted;
          }}
          disabled={props.disabled}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
