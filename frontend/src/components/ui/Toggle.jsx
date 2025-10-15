import { cn } from '../../lib/utils';

export const Toggle = ({ 
  className, 
  checked, 
  onChange, 
  disabled = false,
  size = 'default',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-7',
    default: 'h-5 w-9',
    lg: 'h-6 w-11'
  };

  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-full' : 'translate-x-0',
          thumbSizeClasses[size]
        )}
      />
    </button>
  );
};

