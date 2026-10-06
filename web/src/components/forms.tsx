import { useState, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { vi } from '../locales/vi';
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
export const PasswordField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordField(props, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className="password-input">
        <input {...props} ref={ref} type={show ? 'text' : 'password'} />
        <button
          type="button"
          aria-label={show ? vi.auth.hidePassword : vi.auth.showPassword}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  },
);
export function FormError({ message }: { message?: string }) {
  return message ? (
    <div role="alert" className="form-error">
      <AlertCircle size={17} />
      {message}
    </div>
  ) : null;
}
