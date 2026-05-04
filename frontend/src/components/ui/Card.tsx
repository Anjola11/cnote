import React from 'react';
import clsx from 'clsx';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  children: React.ReactNode;
}

export default function Card({ hoverable = true, children, className, ...props }: CardProps) {
  return (
    <div className={clsx('card', hoverable && 'card--hoverable', className)} {...props}>
      {children}
    </div>
  );
}
