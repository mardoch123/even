import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-eveneo-gradient text-white hover:shadow-lg hover:shadow-eveneo-violet/30 hover:scale-[1.02] border border-transparent",
    secondary: "bg-white text-eveneo-violet border-2 border-eveneo-violet hover:bg-eveneo-violet/5",
    // Changed outline to be visible on light backgrounds (default theme) by using dark text and gray border
    outline: "bg-transparent border-2 border-gray-300 text-eveneo-dark hover:border-eveneo-violet hover:text-eveneo-violet hover:bg-gray-50",
    ghost: "bg-transparent text-eveneo-dark hover:bg-gray-100",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg font-semibold",
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};