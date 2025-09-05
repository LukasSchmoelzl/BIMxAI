"use client";
import Link from 'next/link';

export default function TermsPage() {
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  return (
    <div className="legal-page">
      <header className="header">
        <div className="container">
          <h1>Nutzungsbedingungen</h1>
          <p className="subtitle">BIM Viewer Demo</p>
          <div className="meta">
            <span>Stand: {currentDate}</span>
            <span>Version: 1.0</span>
          </div>
        </div>
      </header>

      <main className="content">
        <div className="container">
          
          <section>
            <h2>1. Geltungsbereich</h2>
            <p>
              Diese Nutzungsbedingungen gelten für die Nutzung der Demo-Version des BIM Viewers.
              Mit der Nutzung der Anwendung akzeptieren Sie diese Bedingungen.
            </p>
          </section>

          <section>
            <h2>2. Leistungsbeschreibung</h2>
            <p>
              Der BIM Viewer ist eine Demo-Anwendung zur:
            </p>
            <ul>
              <li>3D-Visualisierung von IFC/Fragment-Dateien</li>
              <li>KI-gestützten Analyse von Gebäudemodellen</li>
              <li>Natürlichsprachlichen Interaktion mit BIM-Daten</li>
            </ul>
            <p>
              Dies ist eine <strong>Demo-Version</strong> ohne Gewährleistung für 
              Verfügbarkeit oder Funktionalität.
            </p>
          </section>

          <section>
            <h2>3. Nutzungsrechte</h2>
            <p>
              Sie erhalten ein nicht-exklusives, nicht übertragbares Recht zur Nutzung 
              der Demo für private und geschäftliche Evaluierungszwecke.
            </p>
            <p>
              <strong>Verboten ist:</strong>
            </p>
            <ul>
              <li>Reverse Engineering oder Dekompilierung</li>
              <li>Automatisierte Massenabfragen</li>
              <li>Umgehung von Sicherheitsmaßnahmen</li>
              <li>Kommerzielle Weitervermarktung</li>
            </ul>
          </section>

          <section>
            <h2>4. Ihre Inhalte</h2>
            <p>
              Sie behalten alle Rechte an hochgeladenen IFC-Dateien. Durch das Hochladen 
              gewähren Sie uns das Recht, diese temporär für die Funktionalität zu verarbeiten.
            </p>
            <p>
              Sie versichern, dass Sie berechtigt sind, die hochgeladenen Dateien zu verwenden 
              und keine Rechte Dritter verletzen.
            </p>
          </section>

          <section>
            <h2>5. Haftungsausschluss</h2>
            <p>
              <strong>Die Nutzung erfolgt auf eigenes Risiko.</strong> Wir übernehmen keine Haftung für:
            </p>
            <ul>
              <li>Datenverlust oder Beschädigung</li>
              <li>Fehlerhafte KI-Analysen</li>
              <li>Ausfallzeiten oder Nichtverfügbarkeit</li>
              <li>Indirekte oder Folgeschäden</li>
            </ul>
            <p>
              Die KI-generierten Antworten sind <strong>nicht als professionelle Beratung</strong> zu verstehen.
            </p>
          </section>

          <section>
            <h2>6. API-Nutzung und Limits</h2>
            <p>
              Die Demo nutzt einen gemeinsamen API-Key mit folgenden Einschränkungen:
            </p>
            <ul>
              <li>Rate Limiting: 10 Anfragen pro Minute</li>
              <li>Maximale Dateigröße: 100 MB</li>
              <li>Unterstützte Formate: .ifc, .frag</li>
            </ul>
          </section>

          <section>
            <h2>7. Open Source</h2>
            <p>
              Nach der Demo-Phase (ca. 8 Wochen) wird das Projekt als Open Source 
              veröffentlicht. Sie können dann die Software mit eigenem API-Key selbst hosten.
            </p>
          </section>

          <section>
            <h2>8. Änderungen</h2>
            <p>
              Wir behalten uns vor, diese Nutzungsbedingungen jederzeit zu ändern. 
              Die jeweils aktuelle Version ist auf dieser Seite einsehbar.
            </p>
          </section>

          <section>
            <h2>9. Anwendbares Recht</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. 
              Gerichtsstand ist Kaiserslautern, Deutschland.
            </p>
          </section>

          <section>
            <h2>10. Kontakt</h2>
            <p>
              Bei Fragen zu diesen Nutzungsbedingungen kontaktieren Sie uns:<br />
              Lukas Schmölzl<br />
              c/o flexdienst - #10787<br />
              Kurt-Schumacher-Straße 76<br />
              67663 Kaiserslautern<br />
              Deutschland<br /><br />
              E-Mail: Kontakt über das Kontaktformular
            </p>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-nav">
            <Link href="/" className="back-link">← Zurück zur App</Link>
            <a href="/privacy" className="other-link">Datenschutz</a>
          </div>
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

        ul {
          margin: 0 0 15px 0;
          padding-left: 25px;
        }

        li {
          margin: 5px 0;
        }

        strong {
          font-weight: 600;
          color: #000;
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
          text-decoration: none;
        }

        .other-link {
          color: #0066cc;
          font-size: 0.9rem;
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