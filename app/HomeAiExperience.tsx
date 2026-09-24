"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./home-ai.module.css";

type Action = {
  label: string;
  href: string;
  external?: boolean;
  affiliate?: boolean;
  icon?: string;
};

type Insight = {
  headline: string;
  text: string;
  facts: string[];
  aiEnabled: boolean;
  updatedAt: string | null;
};

type AssistantReply = {
  answer: string;
  actions: Action[];
  aiEnabled: boolean;
  updatedAt: string | null;
};

const prompts = [
  "Was können wir heute Abend machen?",
  "Was ist heute mit Kindern sinnvoll?",
  "Wo kann ich bei Regen hin?",
  "Lohnt sich Holnis morgen Vormittag?",
];

function actionRel(action: Action) {
  if (action.affiliate) return "sponsored noreferrer";
  return action.external ? "noreferrer" : undefined;
}

export default function HomeAiExperience() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadInsight() {
      try {
        const response = await fetch("/api/assistant?mode=home", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Heute-Überblick nicht verfügbar");
        setInsight((await response.json()) as Insight);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setInsight(null);
      } finally {
        setInsightLoading(false);
      }
    }

    loadInsight();
    return () => controller.abort();
  }, []);

  async function ask(value?: string) {
    const text = (value ?? question).trim();
    if (text.length < 3 || asking) return;

    setQuestion(text);
    setAsking(true);
    setError("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const payload = (await response.json()) as AssistantReply & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Antwort konnte nicht geladen werden.");
      setReply(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Antwort konnte nicht geladen werden.");
    } finally {
      setAsking(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask();
  }

  return (
    <section className={styles.wrap} aria-label="Glücksburg Assistent und aktueller Tagesüberblick">
      <article className={styles.nowCard}>
        <div className={styles.nowTop}>
          <div>
            <span className={styles.kicker}>Heute in Glücksburg</span>
            <h2>{insightLoading ? "Aktuelle Lage wird ausgewertet …" : insight?.headline || "Glücksburg im Blick"}</h2>
          </div>
          <a className={styles.liveLink} href="/live">
            <span className={styles.liveDot} aria-hidden="true" />
            LIVE
          </a>
        </div>

        <p className={styles.nowText}>
          {insightLoading
            ? "Wetter, Warnungen, Strandbedingungen und Veranstaltungen werden zusammengeführt."
            : insight?.text ||
              "Die Live-Daten sind gerade nicht vollständig verfügbar. Im Live-Bereich findest du die aktuellen Einzelwerte."}
        </p>

        {insight?.facts?.length ? (
          <div className={styles.factRow}>
            {insight.facts.slice(0, 4).map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
        ) : null}

        <small className={styles.dataNote}>
          {insight?.aiEnabled ? "KI-Zusammenfassung auf Basis aktueller lokaler Daten" : "Automatisch aus aktuellen lokalen Daten zusammengefasst"}
        </small>
      </article>

      <article className={styles.assistantCard}>
        <div className={styles.assistantHeading}>
          <span className={styles.aiIcon} aria-hidden="true">✦</span>
          <div>
            <span className={styles.kicker}>Glücksburg-Assistent</span>
            <h2>Frag GlücksburgDirekt</h2>
            <p>Antwortet mit Live-Daten und den veröffentlichten Inhalten von GlücksburgDirekt.</p>
          </div>
        </div>

        <div className={styles.promptRow}>
          {prompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => void ask(prompt)} disabled={asking}>
              {prompt}
            </button>
          ))}
        </div>

        <form className={styles.askForm} onSubmit={onSubmit}>
          <label htmlFor="gluecksburg-assistant-question">Was möchtest du wissen?</label>
          <div className={styles.inputRow}>
            <input
              id="gluecksburg-assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={400}
              placeholder="z. B. Was können wir heute mit zwei Kindern machen?"
              autoComplete="off"
            />
            <button type="submit" disabled={asking || question.trim().length < 3}>
              {asking ? "Prüfe …" : "Fragen →"}
            </button>
          </div>
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}

        {reply ? (
          <div className={styles.reply} aria-live="polite">
            <div className={styles.replyHead}>
              <span>✦</span>
              <strong>GlücksburgDirekt</strong>
              <small>{reply.aiEnabled ? "KI + Live-Daten" : "Live-Daten"}</small>
            </div>
            <p>{reply.answer}</p>
            {reply.actions.length ? (
              <div className={styles.actionRow}>
                {reply.actions.map((action) => (
                  <a
                    key={action.label + action.href}
                    href={action.href}
                    target={action.external ? "_blank" : undefined}
                    rel={actionRel(action)}
                  >
                    <span aria-hidden="true">{action.icon || "→"}</span>
                    {action.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <small className={styles.disclaimer}>
          Der Assistent erfindet keine Öffnungszeiten oder Verfügbarkeiten. Bei amtlichen Warnungen und Hinweisen gelten immer die Originalquellen.
        </small>
      </article>
    </section>
  );
}
