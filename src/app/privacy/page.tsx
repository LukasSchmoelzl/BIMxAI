"use client";

import React from 'react';
import Link from 'next/link';

export default function Privacy() {
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  return (
    <div className="legal-page">
      <header className="header">
        <div className="container">
          <h1>Datenschutzerklärung</h1>
          <p className="subtitle">IFC-Claude Beta App</p>
          <div className="meta">
            <span>Stand: {currentDate}</span>
            <span>Version: 3.0</span>
          </div>
        </div>
      </header>

      <main className="content">
        <div className="container">
          
          <section>
            <h2>Verantwortlicher</h2>
            <p>
              Verantwortlich für die Datenverarbeitung dieser Anwendung ist:
            </p>
            <address>
              Lukas Schmölzl<br />
              c/o flexdienst - #10787<br />
              Kurt-Schumacher-Straße 76<br />
              67663 Kaiserslautern<br />
              Deutschland
            </address>
            <p>
              E-Mail: Kontakt über das Kontaktformular
            </p>
          </section>

          <section>
            <h2>Überblick</h2>
            <p>
              Diese Beta-Anwendung ermöglicht die 3D-Visualisierung von IFC-Bauwerksmodellen und deren KI-gestützte Analyse. 
              Wir verarbeiten dabei nur die minimal erforderlichen Daten für den technischen Betrieb und die KI-Funktionalität. 
              Ihre hochgeladenen IFC-Dateien werden temporär im Browser verarbeitet und automatisch nach 24 Stunden gelöscht. 
              Chat-Nachrichten für die KI-Analyse werden an Anthropic Inc. in den USA übertragen, wobei keine Dateien selbst übermittelt werden.
            </p>
          </section>

          <section>
            <h2>Verarbeitete Daten</h2>
            <p>
              Wir verarbeiten folgende Datenarten: Ihre hochgeladenen IFC/Fragment-Dateien zur 3D-Visualisierung, 
              Chat-Nachrichten für die KI-gestützte Bauteilanalyse, technische Log-Daten mit anonymisierten IP-Adressen 
              zur Sicherheit und Fehlerdiagnose sowie Ihre Cookie-Einstellungen. 
              Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) für die KI-Analyse 
              und unserer berechtigten Interessen (Art. 6 Abs. 1 lit. f DSGVO) für den technischen Betrieb.
            </p>
          </section>

          <section>
            <h2>Speicherdauer</h2>
            <p>
              Ihre Daten werden nur temporär gespeichert. IFC-Dateien werden maximal 24 Stunden auf unserem Server gehalten 
              und dann automatisch gelöscht. Chat-Verläufe bleiben nur während Ihrer Browser-Session bestehen und werden 
              beim Schließen des Browsers entfernt. Technische Log-Daten werden nach 7 Tagen automatisch gelöscht. 
              Es erfolgt keine dauerhafte Speicherung oder Backup-Erstellung Ihrer Inhalte.
            </p>
          </section>

          <section>
            <h2>Internationale Datenübertragung</h2>
            <p>
              Für die KI-Funktionalität übertragen wir Ihre Chat-Nachrichten an Anthropic Inc. in den USA. 
              Diese Übertragung erfolgt nur mit Ihrer ausdrücklichen Einwilligung und unter Anwendung der 
              Standardvertragsklauseln der EU-Kommission. Ihre IFC-Dateien selbst werden nicht an Dritte übertragen 
              und verbleiben auf unseren Servern in Deutschland. Weitere Informationen zum Datenschutz bei Anthropic 
              finden Sie unter www.anthropic.com/privacy.
            </p>
          </section>

          <section>
            <h2>Ihre Rechte</h2>
            <p>
              Sie haben umfassende Rechte bezüglich Ihrer personenbezogenen Daten. Dazu gehören das Recht auf Auskunft 
              über die gespeicherten Daten, deren Berichtigung bei Unrichtigkeit, Löschung bei Wegfall des Verarbeitungszwecks 
              und Datenübertragbarkeit in einem strukturierten Format. Sie können Ihre Einwilligung jederzeit mit Wirkung 
              für die Zukunft widerrufen und haben ein Widerspruchsrecht bei Verarbeitung aufgrund berechtigter Interessen. 
              Zur Ausübung Ihrer Rechte wenden Sie sich an uns über das Kontaktformular. Bei Beschwerden können Sie sich an die 
              zuständige Datenschutzbehörde wenden.
            </p>
          </section>

          <section>
            <h2>Datensicherheit</h2>
            <p>
              Wir setzen umfassende technische und organisatorische Maßnahmen zum Schutz Ihrer Daten ein. 
              Alle Datenübertragungen erfolgen verschlüsselt über HTTPS. Zugriffe auf unsere Server sind streng kontrolliert 
              und werden protokolliert. Wir implementieren automatische Löschungsroutinen und Rate-Limiting zum Schutz 
              vor Missbrauch. Die Anwendung folgt dem Prinzip der Datenminimierung und Privacy by Design.
            </p>
          </section>

          <section>
            <h2>Änderungen</h2>
            <p>
              Diese Datenschutzerklärung kann bei technischen oder rechtlichen Änderungen aktualisiert werden. 
              Wesentliche Änderungen teilen wir Ihnen über die Anwendung mit. Die jeweils aktuelle Version 
              ist unter dieser URL verfügbar. Bei Fragen zum Datenschutz kontaktieren Sie uns über das Kontaktformular.
            </p>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-nav">
            <Link href="/" className="back-link">← Zurück zur App</Link>
            <Link href="/terms" className="other-link">Nutzungsbedingungen</Link>
          </div>
          <p className="footer-text">
            Bei Fragen nutzen Sie bitte das Kontaktformular auf der Hauptseite.
          </p>
        </div>
      </footer>

      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.7;
          color: #333;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 30px;
        }

        .header {
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          padding: 40px 0;
          text-align: center;
        }

        .header h1 {
          font-size: 2.2rem;
          font-weight: 600;
          margin: 0 0 10px 0;
          color: #333;
        }

        .subtitle {
          font-size: 1rem;
          color: #666;
          margin: 0 0 15px 0;
        }

        .meta {
          font-size: 0.85rem;
          color: #888;
        }

        .meta span {
          margin: 0 10px;
        }

        .content {
          padding: 40px 0 60px 0;
        }

        section {
          margin-bottom: 35px;
        }

        h2 {
          font-size: 1.4rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 15px 0;
          padding-bottom: 5px;
          border-bottom: 1px solid #eee;
        }

        p {
          margin: 0 0 15px 0;
          text-align: justify;
        }

        address {
          font-style: normal;
          margin: 15px 0;
          padding: 15px;
          background: #f9f9f9;
          border-left: 4px solid #667eea;
        }

        a {
          color: #0066cc;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        .footer {
          background: #f5f5f5;
          border-top: 1px solid #ddd;
          padding: 30px 0;
        }

        .footer-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .back-link {
          background: #0066cc;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          text-decoration: none;
          font-size: 0.9rem;
        }

        .back-link:hover {
          background: #0052a3;
          color: white;
        }

        .other-link {
          color: #0066cc;
          font-size: 0.9rem;
        }

        .footer-text {
          text-align: center;
          font-size: 0.85rem;
          color: #666;
          margin: 0;
        }

        .footer a {
          color: #0066cc;
        }

        @media (max-width: 768px) {
          .container {
            padding: 0 20px;
          }

          .header h1 {
            font-size: 1.8rem;
          }

          .footer-nav {
            flex-direction: column;
            text-align: center;
          }

          p {
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .container {
            padding: 0 15px;
          }

          .content {
            padding: 30px 0 40px 0;
          }

          h2 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
} 