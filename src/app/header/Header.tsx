"use client";

import React from 'react';
import Image from 'next/image';
import { Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StandardButton } from '@/components/ui-ls';

interface HeaderProps {
  // Optional props for future use
}

// Combined Header Component
export function Header({}: HeaderProps) {
  const handleNotImplemented = () => {
    alert('Noch nicht implementiert und keine neue Seite geöffnet');
  };
  return (
    <div className="header-container">
      {/* Left: Logo */}
      <div className="logo-wrapper">
        <Image
          src="/icons/ls-logo.svg"
          alt="LS Logo"
          className="app-logo"
            fill
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Center: Title + Subline */}
      <div className="brand">
        <h1 className="app-title">LS BIM Viewer</h1>
        <div className="subline">
          <Badge variant="outline" className="version-badge header-badge text-base font-normal">v0.4</Badge>
          <Badge variant="outline" className="privacy-badge header-badge text-base font-normal">
            <span className="privacy-icon">⚠️</span>
            <span className="privacy-text">Keine persönlichen Daten eingeben</span>
          </Badge>
        </div>
      </div>

      {/* Right: User + Settings Buttons */}
      <div className="header-right">
        <StandardButton
          icon={<User size={16} strokeWidth={2} color="white" />}
          text="User"
          variant="secondary"
          onClick={handleNotImplemented}
        />
        <StandardButton
          icon={<Settings size={16} strokeWidth={2} color="white" />}
          text="Settings"
          onClick={handleNotImplemented}
          variant="outline"
        />
      </div>
    </div>
  );
}

export default Header;
