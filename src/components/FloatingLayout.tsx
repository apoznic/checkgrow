import { ReactNode } from 'react';

interface FloatingLayoutProps {
  children: ReactNode;
  fullScreen?: boolean;
}

export function FloatingLayout({ children }: FloatingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

export function MeshBackground() {
  return null;
}
