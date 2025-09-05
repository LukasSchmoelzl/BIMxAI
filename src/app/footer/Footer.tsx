"use client";

import React from 'react';

export default function Footer() {
  return (
    <footer className="modern-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="copyright">© 2025 Lukas Schmölzl</span>
        </div>
        <div className="footer-links">
          <a href="/impressum" className="footer-link">Impressum</a>
          <a href="/privacy" className="footer-link">Datenschutz</a>
          <a href="/terms" className="footer-link">Nutzungsbedingungen</a>
        </div>
      </div>
    </footer>
  );
} 