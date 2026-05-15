import './Switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export default function Switch({ checked, onChange, disabled, label, id }: SwitchProps) {
  return (
    <div className="switch-container">
      <label className="switch" htmlFor={id}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="switch-slider"></span>
      </label>
      {label && <span className="switch-label">{label}</span>}
    </div>
  );
}
