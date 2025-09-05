'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  timestamp: number;
}

// Cookie configuration constants
const CONSENT_COOKIE_NAME = 'ifc-app-consent';
const CONSENT_EXPIRY_MONTHS = 13; // GDPR-compliant
const CONSENT_VERSION = '1.0'; // For future cookie format migrations

const DEFAULT_CONSENT: ConsentState = {
  necessary: true, // Always required by law and functionality
  analytics: false,
  functional: false,
  timestamp: 0,
};

// Modern Cookie Management Class
class CookieManager {
  private static instance: CookieManager;
  
  static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }
  
  // Set cookie with modern security attributes
  setCookie(name: string, value: string, days: number = 365): boolean {
    try {
      if (typeof document === 'undefined') return false; // SSR safety
      
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      
      // Modern secure cookie attributes
      const cookieAttributes = [
        `${name}=${encodeURIComponent(value)}`,
        `expires=${expires.toUTCString()}`,
        'path=/',
        'SameSite=Strict', // CSRF protection
        ...(location.protocol === 'https:' ? ['Secure'] : []), // Secure in production
      ].join('; ');
      
      document.cookie = cookieAttributes;
      return true;
    } catch (error) {
      console.error('[ERROR] Failed to set cookie:', error);
      return false;
    }
  }
  
  // Get cookie with error handling
  getCookie(name: string): string | null {
    try {
      if (typeof document === 'undefined') return null; // SSR safety
      
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue ? decodeURIComponent(cookieValue) : null;
      }
      
      return null;
    } catch (error) {
      console.error('[ERROR] Failed to get cookie:', error);
      return null;
    }
  }
  
  // Delete cookie
  deleteCookie(name: string): void {
    try {
      if (typeof document === 'undefined') return;
      
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
    } catch (error) {
      console.error('[ERROR] Failed to delete cookie:', error);
    }
  }
  
  // Check if cookies are enabled
  areCookiesEnabled(): boolean {
    try {
      if (typeof document === 'undefined') return false;
      
      const testCookie = 'cookietest';
      this.setCookie(testCookie, 'test', 1);
      const isEnabled = this.getCookie(testCookie) === 'test';
      this.deleteCookie(testCookie);
      
      return isEnabled;
    } catch {
      return false;
    }
  }
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [cookiesEnabled, setCookiesEnabled] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Memoized cookie manager instance
  const cookieManager = useMemo(() => CookieManager.getInstance(), []);

  // Check consent expiry
  const isConsentExpired = useCallback((consentTimestamp: number): boolean => {
    const thirteenMonthsMs = CONSENT_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000;
    return Date.now() - consentTimestamp > thirteenMonthsMs;
  }, []);

  // Load consent from cookies (modern implementation)
  const loadStoredConsent = useCallback((): ConsentState | null => {
    try {
      const storedConsentJson = cookieManager.getCookie(CONSENT_COOKIE_NAME);
      
      if (!storedConsentJson) return null;
      
      const parsedConsent: ConsentState & { version?: string } = JSON.parse(storedConsentJson);
      
      // Version check for future migration compatibility
      if (parsedConsent.version && parsedConsent.version !== CONSENT_VERSION) {
        // console.log('Cookie consent version mismatch, requesting new consent');
        return null;
      }
      
      // Validate required fields
      if (typeof parsedConsent.timestamp !== 'number' || 
          typeof parsedConsent.necessary !== 'boolean') {
        console.warn('[WARNING] Invalid consent data structure');
        return null;
      }
      
      return {
        necessary: parsedConsent.necessary,
        analytics: parsedConsent.analytics ?? false,
        functional: parsedConsent.functional ?? false,
        timestamp: parsedConsent.timestamp,
      };
      
    } catch (error) {
      console.error('[ERROR] Failed to parse stored consent:', error);
      return null;
    }
  }, [cookieManager]);

  // Initialize component (with SSR safety)
  useEffect(() => {
    setIsClient(true);
    
    // Check if cookies are enabled
    const enabled = cookieManager.areCookiesEnabled();
    setCookiesEnabled(enabled);
    
    if (!enabled) {
      console.warn('[WARNING] Cookies are disabled - some features may not work');
      setShowBanner(true);
      return;
    }
    
    const storedConsent = loadStoredConsent();
    
    if (storedConsent) {
      if (isConsentExpired(storedConsent.timestamp)) {
        // console.log('Consent expired, requesting renewal');
        setShowBanner(true);
      } else {
        setConsent(storedConsent);
        // console.log('[SUCCESS] Valid consent loaded from storage');
      }
    } else {
      setShowBanner(true);
    }
  }, [cookieManager, loadStoredConsent, isConsentExpired]);



  // Modern consent saving with error handling
  const saveConsent = useCallback((newConsent: ConsentState) => {
    try {
      const consentWithTimestamp: ConsentState & { version: string } = {
        ...newConsent,
        timestamp: Date.now(),
        version: CONSENT_VERSION,
      };
      
      const success = cookieManager.setCookie(
        CONSENT_COOKIE_NAME, 
        JSON.stringify(consentWithTimestamp),
        CONSENT_EXPIRY_MONTHS * 30 // Convert months to days
      );
      
      if (!success) {
        throw new Error('Failed to save consent cookie');
      }
      
      setConsent(consentWithTimestamp);
      
      setShowBanner(false);
      setShowDetails(false);
      
      // console.log('Cookie consent saved successfully');
      
    } catch (error) {
      console.error('[ERROR] Failed to save consent:', error);
      // Fallback: still update state even if cookie save failed
      setConsent(newConsent);
    }
  }, [cookieManager]);

  // Optimized event handlers with useCallback
  const handleAcceptAll = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: true,
      functional: true,
      timestamp: Date.now(),
    });
  }, [saveConsent]);

  const handleAcceptNecessary = useCallback(() => {
    saveConsent({
      necessary: true,
      analytics: false,
      functional: false,
      timestamp: Date.now(),
    });
  }, [saveConsent]);

  const handleCustomConsent = useCallback(() => {
    saveConsent(consent);
  }, [saveConsent, consent]);

  const handleConsentChange = useCallback((category: keyof ConsentState, value: boolean) => {
    if (category === 'necessary') {
      console.warn('[WARNING] Necessary cookies cannot be disabled');
      return;
    }
    
    setConsent(prev => ({
      ...prev,
      [category]: value,
    }));
  }, []);

  // Handle banner dismiss (for accessibility)
  const handleDismissBanner = useCallback(() => {
    setShowBanner(false);
    setShowDetails(false);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleDismissBanner();
    }
  }, [handleDismissBanner]);

  // SSR safety check
  if (!isClient || !showBanner) return null;

  return (
    <>
      {!showDetails ? (
        // Cookie Banner - Layout Guidelines compliant
        <div 
          className="cookie-banner"
          role="banner" 
          aria-label="Cookie-Einstellungen"
          onKeyDown={handleKeyDown}
        >
          <div className="cookie-banner__content">
            <div className="cookie-banner__info">
              <h3 className="cookie-banner__title" id="cookie-banner-title">
                Cookies & Datenschutz
              </h3>
              <p className="cookie-banner__description" id="cookie-banner-description">
                {!cookiesEnabled && (
                  <span className="status-badge warning">
                    Cookies deaktiviert
                  </span>
                )}
                Wir verwenden Cookies für die Funktionalität dieser Beta-App. 
                Ihre IFC-Daten werden nur temporär verarbeitet und nach 24h automatisch gelöscht.
                {!cookiesEnabled && (
                  <span className="cookie-banner__warning">
                    Einige Features funktionieren möglicherweise nicht korrekt.
                  </span>
                )}
              </p>
            </div>
            
            <div className="cookie-banner__actions" role="group" aria-labelledby="cookie-banner-title">
              <button
                className="secondary-btn"
                onClick={() => setShowDetails(true)}
                aria-describedby="cookie-banner-description"
                type="button"
              >
                Einstellungen
              </button>
              <button
                className="secondary-btn"
                onClick={handleAcceptNecessary}
                disabled={!cookiesEnabled}
                aria-describedby="cookie-banner-description"
                type="button"
              >
                Nur Notwendige
              </button>
              <button
                className="primary-btn"
                onClick={handleAcceptAll}
                disabled={!cookiesEnabled}
                aria-describedby="cookie-banner-description"
                type="button"
              >
                Alle Akzeptieren
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Cookie Settings Modal - Layout Guidelines compliant
        <div 
          className="cookie-modal-overlay"
          role="dialog" 
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          onKeyDown={handleKeyDown}
        >
          <div className="card cookie-modal">
            {/* Header */}
            <div className="card-header cookie-modal__header">
              <div>
                <h3 id="cookie-settings-title" className="card-title">
                  Cookie-Einstellungen
                </h3>
                <p className="cookie-modal__subtitle">Passen Sie Ihre Präferenzen an</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="secondary-btn cookie-modal__close"
                aria-label="Einstellungen schließen"
                type="button"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="cookie-modal__content">
              {!cookiesEnabled && (
                <div className="warning-card">
                  <h4 className="card-title">Cookies deaktiviert</h4>
                  <p>Bitte aktivieren Sie Cookies in Ihren Browser-Einstellungen.</p>
                </div>
              )}

              {/* Cookie Categories */}
              <div className="cookie-categories">
                {/* Necessary Cookies */}
                <div className="card cookie-category">
                  <div className="cookie-category__content">
                    <div className="cookie-category__info">
                      <h4 className="card-title">Notwendige Cookies</h4>
                      <p className="cookie-category__description">Für die Grundfunktionen erforderlich</p>
                    </div>
                    <div className="cookie-category__control">
                      <div className="toggle-switch toggle-switch--disabled">
                        <div className="toggle-switch__slider toggle-switch__slider--active"></div>
                      </div>
                      <span className="status-badge">Immer aktiv</span>
                    </div>
                  </div>
                </div>
                
                {/* Functional Cookies */}
                <div className="card cookie-category">
                  <div className="cookie-category__content">
                    <div className="cookie-category__info">
                      <h4 className="card-title">Funktionale Cookies</h4>
                      <p className="cookie-category__description">UI-Präferenzen und Einstellungen</p>
                    </div>
                    <div className="cookie-category__control">
                      <div 
                        className={`toggle-switch ${consent.functional ? 'toggle-switch--active' : ''} ${!cookiesEnabled ? 'toggle-switch--disabled' : ''}`}
                        onClick={() => cookiesEnabled && handleConsentChange('functional', !consent.functional)}
                      >
                        <div className="toggle-switch__slider"></div>
                      </div>
                      <span className="status-badge">
                        {consent.functional ? 'An' : 'Aus'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Analytics Cookies */}
                <div className="card cookie-category">
                  <div className="cookie-category__content">
                    <div className="cookie-category__info">
                      <h4 className="card-title">Analyse-Cookies</h4>
                      <p className="cookie-category__description">Anonymisierte Nutzungsstatistiken</p>
                    </div>
                    <div className="cookie-category__control">
                      <div 
                        className={`toggle-switch ${consent.analytics ? 'toggle-switch--active' : ''} ${!cookiesEnabled ? 'toggle-switch--disabled' : ''}`}
                        onClick={() => cookiesEnabled && handleConsentChange('analytics', !consent.analytics)}
                      >
                        <div className="toggle-switch__slider"></div>
                      </div>
                      <span className="status-badge">
                        {consent.analytics ? 'An' : 'Aus'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Info Card */}
              <div className="card info-card">
                <h4 className="card-title">Ihre Rechte</h4>
                <p>
                  Sie können Ihre Einwilligung jederzeit ändern. Weitere Details in unserer{' '}
                  <a href="/privacy" className="link">
                    Datenschutzerklärung
                  </a>.
                </p>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="cookie-modal__actions">
              <button
                className="secondary-btn"
                onClick={handleAcceptNecessary}
                disabled={!cookiesEnabled}
                type="button"
              >
                Nur Notwendige
              </button>
              <button
                className="primary-btn"
                onClick={handleCustomConsent}
                disabled={!cookiesEnabled}
                type="button"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
      

    </>
  );
} 