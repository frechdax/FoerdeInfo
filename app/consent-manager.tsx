"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import AdSenseLoader from "./adsense-loader";

type ConsentChoice = {
  version: 1;
  statistics: boolean;
  marketing: boolean;
  savedAt: string;
};

const CONSENT_KEY = "gluecksburg-direkt-consent-v1";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-QQLYW4KZYN";

export default function ConsentManager() {
  const [consent, setConsent] = useState<ConsentChoice | null | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    function readStoredConsent(): ConsentChoice | null {
      try {
        const raw = localStorage.getItem(CONSENT_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as ConsentChoice;
        if (
          parsed?.version === 1 &&
          typeof parsed.statistics === "boolean" &&
          typeof parsed.marketing === "boolean"
        ) {
          return parsed;
        }
      } catch {}

      return null;
    }

    function handleOpenConsentSettings() {
      const stored = readStoredConsent();
      setStatistics(stored?.statistics ?? false);
      setMarketing(stored?.marketing ?? false);
      setShowSettings(true);
    }

    const stored = readStoredConsent();
    setConsent(stored);
    if (stored) {
      setStatistics(stored.statistics);
      setMarketing(stored.marketing);
    }

    window.addEventListener("gluecksburg:open-consent", handleOpenConsentSettings);
    return () =>
      window.removeEventListener("gluecksburg:open-consent", handleOpenConsentSettings);
  }, []);

  function saveChoice(nextStatistics: boolean, nextMarketing: boolean) {
    const next: ConsentChoice = {
      version: 1,
      statistics: nextStatistics,
      marketing: nextMarketing,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    } catch {}

    setStatistics(nextStatistics);
    setMarketing(nextMarketing);
    setConsent(next);
    setShowSettings(false);
  }

  function openSettings() {
    setStatistics(consent?.statistics ?? false);
    setMarketing(consent?.marketing ?? false);
    setShowSettings(true);
  }

  const bannerVisible = consent === null || showSettings;

  return (
    <>
      {consent?.statistics ? (
        <>
          <Analytics />
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics-4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      ) : null}
      {consent?.marketing ? <AdSenseLoader /> : null}

      {bannerVisible ? (
        <section
          className="consent-banner"
          role="dialog"
          aria-modal="false"
          aria-labelledby="consent-title"
          aria-describedby="consent-description"
        >
          <div className="consent-copy">
            <span className="consent-kicker">Datenschutz</span>
            <h2 id="consent-title">Deine Auswahl zählt</h2>
            <p id="consent-description">
              Notwendige Speicherungen sorgen dafür, dass GlücksburgDirekt funktioniert.
              Statistik und Marketing werden nur mit deiner Zustimmung geladen. Deine Auswahl
              kannst du jederzeit ändern.{" "}
              <a href="/#impressum">Mehr erfahren</a>
            </p>
          </div>

          {showSettings ? (
            <div className="consent-settings">
              <label className="consent-option">
                <span>
                  <strong>Notwendig</strong>
                  <small>Für Grundfunktionen und das Speichern deiner Auswahl.</small>
                </span>
                <input type="checkbox" checked disabled aria-label="Notwendig, immer aktiv" />
              </label>

              <label className="consent-option">
                <span>
                  <strong>Statistik</strong>
                  <small>Vercel Web Analytics und Google Analytics 4 zur Reichweiten- und Nutzungsanalyse.</small>
                </span>
                <input
                  type="checkbox"
                  checked={statistics}
                  onChange={(event) => setStatistics(event.target.checked)}
                />
              </label>

              <label className="consent-option">
                <span>
                  <strong>Marketing</strong>
                  <small>Für Werbedienste wie Google AdSense, sobald diese aktiviert werden.</small>
                </span>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                />
              </label>

              <div className="consent-actions">
                <button
                  type="button"
                  className="consent-button secondary"
                  onClick={() => saveChoice(false, false)}
                >
                  Nur notwendige
                </button>
                <button
                  type="button"
                  className="consent-button primary"
                  onClick={() => saveChoice(statistics, marketing)}
                >
                  Auswahl speichern
                </button>
              </div>
            </div>
          ) : (
            <div className="consent-actions consent-actions-main">
              <button
                type="button"
                className="consent-button secondary"
                onClick={() => saveChoice(false, false)}
              >
                Nur notwendige
              </button>
              <button
                type="button"
                className="consent-button secondary"
                onClick={openSettings}
              >
                Einstellungen
              </button>
              <button
                type="button"
                className="consent-button primary"
                onClick={() => saveChoice(true, true)}
              >
                Alle akzeptieren
              </button>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
