'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StandardButton } from './standard-button';

export function FirstVisitModal() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if user has already accepted
    const hasAccepted = localStorage.getItem('demo-disclaimer-accepted');
    if (!hasAccepted) {
      setShowModal(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('demo-disclaimer-accepted', 'true');
    setShowModal(false);
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent 
        className="max-w-2xl"
        style={{
          backgroundColor: 'var(--modal-content-bg)',
          borderRadius: 'var(--modal-border-radius)',
          padding: 'var(--modal-padding)',
          boxShadow: 'var(--modal-shadow)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Willkommen zur BIM Viewer Demo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              ⚠️ Wichtige Hinweise
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Dies ist eine <strong>Demo-Version</strong> mit eigenem API-Key</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Hochgeladene Dateien werden <strong>nur lokal</strong> in deinem Browser verarbeitet</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Keine Dateien werden auf unseren Servern gespeichert</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Chat-Verläufe werden nicht gespeichert</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🔐 Datenschutz
            </h3>
            <p className="text-sm">
              Durch die Nutzung stimmst du unserer{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Datenschutzerklärung
              </a>{' '}
              und den{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Nutzungsbedingungen
              </a>{' '}
              zu.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🚀 Open Source
            </h3>
            <p className="text-sm">
              In 8 Wochen wird dieses Projekt Open Source! 
              Dann kannst du es mit deinem eigenen API-Key selbst hosten.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <StandardButton
              text="Verstanden & Demo starten"
              onClick={handleAccept}
              size="lg"
              icon="✅"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 