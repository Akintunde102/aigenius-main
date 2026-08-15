import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

type NextLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
};

export default function Link({ href, children, prefetch: _prefetch, ...rest }: NextLinkProps) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <RouterLink to={href} {...rest}>
      {children}
    </RouterLink>
  );
}
