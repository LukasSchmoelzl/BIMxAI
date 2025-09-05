"use client";
import Link from 'next/link';

export default function ImpressumPage() {
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  return (
    <div className="legal-page">
      <header className="header">
        <div className="container">
          <h1>Impressum</h1>
          <p className="subtitle">AI BIM Viewer Demo</p>
          <div className="meta">
            <span>Stand: {currentDate}</span>
          </div>
        </div>
      </header>

      <main className="content">
        <div className="container">
          
          <section>
            <h2>Angaben gemäß § 5 DDG</h2>
            <p>Verantwortlich für den Inhalt:</p>
            <address>
              Lukas Schmölzl<br />
              c/o flexdienst - #10787<br />
              Kurt-Schumacher-Straße 76<br />
              67663 Kaiserslautern<br />
              Deutschland
            </address>
          </section>

          <section>
            <h2>Kontakt</h2>
            <p>
              E-Mail: Kontakt über das Kontaktformular
            </p>
          </section>

          <section>
            <h2>Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter bin ich gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den 
              allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG bin ich als Diensteanbieter jedoch nicht 
              verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen 
              zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
            <p>
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen 
              Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt 
              der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden 
              Rechtsverletzungen werde ich diese Inhalte umgehend entfernen.
            </p>
          </section>

          <section>
            <h2>Haftung für Links</h2>
            <p>
              Mein Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. 
              Deshalb kann ich für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der 
              verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
            <p>
              Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. 
              Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche 
              Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht 
              zumutbar. Bei Bekanntwerden von Rechtsverletzungen werde ich derartige Links umgehend entfernen.
            </p>
          </section>

          <section>
            <h2>Datenschutz</h2>
            <p>
              Die Nutzung meiner Website ist in der Regel ohne Angabe personenbezogener Daten möglich. 
              Soweit auf meinen Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) 
              erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis.
            </p>
            <p>
              Ich weise darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail) 
              Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte 
              ist nicht möglich.
            </p>
            <p>
              Detaillierte Informationen zum Datenschutz finden Sie in unserer 
              <a href="/privacy"> Datenschutzerklärung</a>.
            </p>
          </section>

          <section>
            <h2>Urheberrecht</h2>
            <p>
              Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem 
              deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung 
              außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen 
              Autors bzw. Erstellers.
            </p>
            <p>
              Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. 
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte 
              Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem 
              auf eine Urheberrechtsverletzung aufmerksam werden, bitte ich um einen entsprechenden Hinweis. 
              Bei Bekanntwerden von Rechtsverletzungen werde ich derartige Inhalte umgehend entfernen.
            </p>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-nav">
            <Link href="/" className="back-link">← Zurück zur App</Link>
            <a href="/privacy" className="other-link">Datenschutz</a>
            <a href="/terms" className="other-link">Nutzungsbedingungen</a>
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
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
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
      `}</style>
    </div>
  );
} 