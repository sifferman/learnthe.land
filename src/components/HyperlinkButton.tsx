import * as React from 'react';
import Button from 'react-bootstrap/Button';

export const HyperlinkButton = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <Button size="sm" variant="outline-secondary" href={href} target="_blank" rel="noreferrer">
      {children}
    </Button>
  );
};
