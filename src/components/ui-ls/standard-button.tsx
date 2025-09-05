"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StandardButtonProps {
  icon?: string | React.ReactNode;
  text: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function StandardButton({
  icon,
  text,
  href,
  onClick,
  className,
  disabled = false,
  variant = 'outline',
  size = 'sm'
}: StandardButtonProps) {
  const baseClasses = "flex items-center justify-center gap-2 leading-none h-auto min-h-0 px-0 py-0 transition-all duration-200 hover:scale-105 hover:shadow-md";
  
  const buttonStyle = {
    padding: 'var(--standard-button-padding)',
    borderRadius: 'var(--standard-button-border-radius)',
    transition: 'var(--standard-button-transition)',
    background: 'var(--brand-gradient)',
    color: 'var(--standard-button-text-color)',
    border: 'var(--standard-button-border)',
  } as React.CSSProperties;
  
  const iconWrapperStyle: React.CSSProperties = {
    width: '1rem',
    height: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    lineHeight: 1,
    flexShrink: 0
  };

  const emojiIconStyle: React.CSSProperties = {
    fontSize: 'clamp(0.8rem, 1cqi, 0.95rem)',
    lineHeight: 1,
    display: 'inline-block'
  };

  const buttonContent = (
    <>
      {icon && (
        typeof icon === 'string' ? (
          <span style={iconWrapperStyle} aria-hidden>
            <span style={emojiIconStyle}>{icon}</span>
          </span>
        ) : (
          <span style={iconWrapperStyle}>{icon}</span>
        )
      )}
      <span className="font-medium text-sm text-white">{text}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <Button
          variant={variant}
          size={size}
          className={cn(baseClasses, className)}
          style={buttonStyle}
          disabled={disabled}
        >
          {buttonContent}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(baseClasses, className)}
      style={buttonStyle}
      disabled={disabled}
    >
      {buttonContent}
    </Button>
  );
} 