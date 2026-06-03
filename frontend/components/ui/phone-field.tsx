"use client";

/**
 * PhoneField — country-code dropdown + national number, E.164 output.
 *
 * Wave 13 (2026-06-03, item #5). Replaces the raw <input type="tel">
 * in AddClientModal + EditClientModal that accepted any garbage
 * (12, 13, 14 digits with no country code).
 *
 * Behavior:
 *   - Default country: India (+91) — KP astrology user base
 *   - Parent receives a stable E.164 string ("+919876543210") via
 *     onChange, OR undefined when the field is empty / invalid-in-progress
 *   - Validates on blur: shows a small red helper "Doesn't look right"
 *     when the value isn't a valid number for the selected country
 *   - Styling matched to the existing inputStyle (gold focus border,
 *     dark surface)
 *
 * Why a wrapper:
 *   react-phone-number-input ships with its own styles + behavior.
 *   We wrap to:
 *     1. Match the rest of the form's visual language
 *     2. Hide library implementation from call sites — if we later
 *        swap to libphonenumber-js + a custom UI, callers don't change
 */

import { useState, useId } from "react";
import PhoneInput, {
  isValidPhoneNumber,
  type Country,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { theme } from "@/lib/theme";

interface PhoneFieldProps {
  value: string | undefined;
  onChange: (e164: string | undefined) => void;
  /** Initial country guess. Defaults to "IN". */
  defaultCountry?: Country;
  /** When false, hides the inline validation message (useful inside
   *  optional-fields composer where empty is fine). */
  showValidation?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneField({
  value,
  onChange,
  defaultCountry = "IN",
  showValidation = true,
  disabled,
  placeholder = "Enter phone number",
}: PhoneFieldProps) {
  const id = useId();
  const [touched, setTouched] = useState(false);

  // Validation only when there's something entered AND the field has
  // been blurred at least once.
  const valid = !value || isValidPhoneNumber(value);
  const showError = showValidation && touched && !valid;

  return (
    <div>
      <PhoneInput
        id={id}
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={onChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        placeholder={placeholder}
        // Library-specific CSS-class targets — see global override
        // below in this file's <style jsx global>.
        className="kpa-phone-field"
        countryCallingCodeEditable={false}
      />
      {showError && (
        <div
          role="alert"
          style={{
            marginTop: 5,
            fontSize: 11,
            color: "#f87171",
          }}
        >
          That phone number doesn&apos;t look right. Double-check the
          country code and try again.
        </div>
      )}
      {/* Library inserts a flag + select + input. Brand the surface to
          match our existing form fields without forking the library. */}
      <style jsx global>{`
        .kpa-phone-field {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .kpa-phone-field .PhoneInputCountry {
          height: 38px;
          padding: 0 8px;
          background: rgba(9, 9, 15, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .kpa-phone-field .PhoneInputCountrySelect {
          background: transparent;
          color: ${theme.text.primary};
          border: none;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
        }
        .kpa-phone-field .PhoneInputCountrySelect option {
          background: #161620;
          color: ${theme.text.primary};
        }
        .kpa-phone-field .PhoneInputCountryIcon {
          width: 20px;
          height: 14px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }
        .kpa-phone-field .PhoneInputInput {
          flex: 1;
          height: 38px;
          padding: 0 12px;
          background: rgba(9, 9, 15, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 7px;
          color: ${theme.text.primary};
          font-size: 13px;
          outline: none;
          font-family: inherit;
        }
        .kpa-phone-field .PhoneInputInput::placeholder {
          color: ${theme.text.muted};
        }
        .kpa-phone-field .PhoneInputInput:focus {
          border-color: rgba(201, 169, 110, 0.5);
        }
      `}</style>
    </div>
  );
}
