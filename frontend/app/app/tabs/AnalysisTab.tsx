"use client";

/**
 * AnalysisTab — the AI chat interface (8-topic grid + bubble chat + TOC + abort).
 *
 * PR R4 (Phase A foundation refactor) — extracted from page.tsx lines
 * 7090-7454 (~365 lines). SACRED-ADJACENT territory per
 * .claude/research/world-first-vision.md §15:
 *
 *   The AnalysisTab UI is the user-facing shell for `get_prediction_stream`
 *   (which IS sacred). The frontend extraction is safe BUT must preserve
 *   ALL behavior exactly:
 *     - Chat message state (analysisMessages array — streamed via SSE)
 *     - Streaming SSE flow with AbortController cleanup
 *     - Language toggle (EN / TE+EN) — affects backend `language` param
 *     - Topic detection state — chip click vs free-text routing
 *     - Empty state vs active chat state (PageHero only when empty;
 *       sticky topic strip when active)
 *     - Clear-confirmation modal before wiping conversation
 *     - Regenerate button — drops the message + re-fires same prompt
 *     - Stop generation button — aborts BOTH ask + analyze streams
 *
 * State decisions:
 *   - Chat state STAYS in parent (page.tsx) because the shared chat
 *     input strip at the bottom (used by Chart/Houses/Dasha/Match too)
 *     also writes to analysisMessages when on Analysis tab. All chat
 *     state + handlers + refs come through as props.
 *   - No tab-local state — AnalysisTab is a pure rendering component
 *     that delegates all mutation to the parent's handlers.
 *
 * Sacred-region check:
 *   ✓ No backend AI code touched (llm_service.py untouched)
 *   ✓ get_prediction_stream contract preserved (handleTopicAnalysis
 *     called identically; SSE handling lives in parent)
 *   ✓ Language toggle params preserved (analysisLang flow unchanged)
 *   ✓ AbortController cleanup preserved (refs passed through, .abort()
 *     calls happen here but the controllers themselves live in parent)
 *   ✓ Topic-switch escalation logic NOT TOUCHED (lives in parent's
 *     handleWorkspaceChat in page.tsx — unchanged)
 */

import type { RefObject } from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/lib/i18n";
import { PageHero } from "@/components/ui/PageHero";
import { StaggerChildren, StaggerItem } from "@/components/motion";
import { TOPICS, TOPIC_EMOJI } from "../lib/topics";
import {
  HeartPulse,
  Briefcase,
  Stethoscope,
  Globe,
  Baby,
  BookOpen,
  Home as HomeIcon,
  Wallet,
  TrendingUp,
  Scale,
  HelpCircle
} from "lucide-react";

const TOPIC_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  marriage: HeartPulse,
  job: Briefcase,
  health: Stethoscope,
  foreign_travel: Globe,
  children: Baby,
  education: BookOpen,
  property: HomeIcon,
  wealth: Wallet,
  finance: TrendingUp,
  legal: Scale,
};

// Loose Message shape — matches the runtime structure from page.tsx.
// Pre-R4 page.tsx typed analysisMessages as Message[] from ./types
// but the AnalysisTab block accesses extra fields (msg.id, msg.t,
// msg.isTopic) so we mirror that here.
interface AnalysisMessage {
  q: string;
  a: string;
  isTopic?: boolean;
  id?: string | number;
  t?: number;
  // ...any other runtime fields preserved via the `as any` escape hatch
  // when passed back to setAnalysisMessages updaters.
}

interface AnalysisTabProps {
  // Chat state
  analysisMessages: AnalysisMessage[];
  setAnalysisMessages: (
    m: AnalysisMessage[] | ((prev: AnalysisMessage[]) => AnalysisMessage[])
  ) => void;
  analysisLoading: boolean;
  setAnalysisLoading: (b: boolean) => void;
  activeTopic: string;
  setActiveTopic: (s: string) => void;
  analysisLang: "english" | "telugu_english";
  setAnalysisLang: (l: "english" | "telugu_english") => void;
  // Chat input shared with bottom strip (write only for follow-up chips)
  setChatQ: (s: string) => void;
  // Topic analysis handler (lives in parent, talks to /astrologer/analyze-stream)
  handleTopicAnalysis: (topicId: string) => void | Promise<void>;
  // Stream refs (abort controllers live in parent)
  askStreamAbortRef: RefObject<AbortController | null>;
  analyzeStreamAbortRef: RefObject<AbortController | null>;
  // Scroll anchor (end-of-conversation div ref)
  chatEndRef: RefObject<HTMLDivElement | null>;
}

export function AnalysisTab({
  analysisMessages,
  setAnalysisMessages,
  analysisLoading,
  setAnalysisLoading,
  activeTopic,
  setActiveTopic,
  analysisLang,
  setAnalysisLang,
  setChatQ,
  handleTopicAnalysis,
  askStreamAbortRef,
  analyzeStreamAbortRef,
  chatEndRef,
}: AnalysisTabProps) {
  const { t, lang } = useLanguage();
  // 2026-06-10 UX overhaul: two-tap "Clear" instead of a native
  // window.confirm() (which shattered the premium dark-gold look,
  // worst on mobile). First tap arms; second within 3s clears.
  const [clearArmed, setClearArmed] = useState(false);

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Phase 15.2 — Track A serif PageHero (Analysis tab).
          Only on the empty state (before chat starts) — once
          a conversation is active the sticky topic strip takes
          over and a big hero would waste vertical space. */}
      {analysisMessages.length === 0 && (
        <PageHero
          eyebrow={t("AI · KP Sonnet", "AI · KP సోనెట్")}
          title={t("Ask the chart", "చార్ట్‌ని అడగండి")}
          subcopy={t(
            "Pick a life topic for a full 7-section KP worksheet, or type any question. Every verdict cites the chart's CSL chains and dasha context.",
            "పూర్తి 7-సెక్షన్ KP వర్క్‌షీట్ కోసం జీవిత అంశాన్ని ఎంచుకోండి, లేదా ఏదైనా ప్రశ్న టైప్ చేయండి. ప్రతి నిర్ణయం చార్ట్ CSL చైన్‌లు + దశ సందర్భాన్ని ఉదహరిస్తుంది."
          )}
          bottomGap={16}
        />
      )}
      {/* Topics — full grid before chat starts, compact horizontal strip after */}
      <div
        style={{
          marginBottom: "0.75rem",
          flexShrink: 0,
          // Phase 11 / PR 28 (#A6) — sticky chip strip when chat is active.
          ...(analysisMessages.length > 0
            ? { position: "sticky" as const, top: 0, zIndex: 5, background: "var(--bg)", paddingTop: 8, paddingBottom: 8 }
            : {}),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            {(() => {
              const tpHeading = t("Topics", "అంశాలు");
              if (analysisMessages.length === 0) return tpHeading;
              const active = TOPICS.find(tp => tp.id === activeTopic);
              const activeLabel = active ? (lang === "en" ? active.en : active.te) : "";
              const subtle = activeTopic ? activeLabel : t("switch anytime", "ఎప్పుడైనా మార్చండి");
              return `${tpHeading} · ${subtle}`;
            })()}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {analysisMessages.length > 0 && (
              <button
                className="analysis-clear-btn"
                onClick={() => {
                  // Two-tap confirm (no native dialog). First tap arms +
                  // auto-disarms after 3s; second tap clears.
                  if (!clearArmed) {
                    setClearArmed(true);
                    setTimeout(() => setClearArmed(false), 3000);
                    return;
                  }
                  setClearArmed(false);
                  setAnalysisMessages([]); setActiveTopic("");
                }}
                style={{
                  background: clearArmed ? "rgba(248,113,113,0.12)" : "transparent",
                  border: `0.5px solid ${clearArmed ? "rgba(248,113,113,0.5)" : "var(--border2)"}`,
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 11,
                  color: clearArmed ? "#f87171" : "var(--muted)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >{clearArmed ? t("Tap to confirm", "నిర్ధారించండి") : t("Clear", "క్లియర్")}</button>
            )}
            <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 6, border: "0.5px solid var(--border2)", overflow: "hidden" }}>
              {([["english", "EN"], ["telugu_english", "తె+EN"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setAnalysisLang(val)} style={{ padding: "4px 10px", background: analysisLang === val ? "rgba(201,169,110,0.15)" : "transparent", color: analysisLang === val ? "var(--accent)" : "var(--muted)", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        {/* Before chat starts: full 4×2 grid.
            Phase 6 / PR 15 — topic labels now respect `lang`
            (#6). Was hardcoded Telugu before, leaking into
            the EN view of the Analysis tab. */}
        {analysisMessages.length === 0 ? (
          /* Phase 15.3 — 8 topic chips cascade in (60ms gap)
             after the PageHero settles (delay 0.5s).
             Each chip wraps a button with StaggerItem for
             per-item motion variants. */
          <StaggerChildren
            gap="base"
            delay={0.5}
            immediate
            className="analysis-topic-grid"
            style={{ display: "grid", gap: 8 }}
          >
            {TOPICS.map(tp => (
              <StaggerItem key={tp.id}>
                <button onClick={() => handleTopicAnalysis(tp.id)} disabled={analysisLoading}
                  style={{ width: "100%", padding: "10px 6px", borderRadius: 10, border: `0.5px solid ${activeTopic === tp.id ? "var(--accent)" : "var(--border2)"}`, background: activeTopic === tp.id ? "rgba(201,169,110,0.15)" : "var(--card)", cursor: analysisLoading ? "default" : "pointer", fontFamily: "inherit", textAlign: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => { if (activeTopic !== tp.id) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,169,110,0.4)"; }}
                  onMouseLeave={e => { if (activeTopic !== tp.id) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; }}>
                  {(() => {
                    const TopicIcon = TOPIC_ICONS[tp.id] || HelpCircle;
                    return (
                      <div style={{ color: activeTopic === tp.id ? "var(--accent)" : "var(--muted)", marginBottom: 4, display: "flex", justifyContent: "center" }}>
                        <TopicIcon size={20} />
                      </div>
                    );
                  })()}
                  <div style={{ fontSize: 11, color: activeTopic === tp.id ? "var(--accent)" : "var(--text)", fontWeight: activeTopic === tp.id ? 500 : 400 }}>{lang === "en" ? tp.en : tp.te}</div>
                </button>
              </StaggerItem>
            ))}
          </StaggerChildren>
        ) : (
          // Once chat is active: compact horizontal topic strip
          <div className="topic-strip">
            {TOPICS.map(tp => {
              const ChipIcon = TOPIC_ICONS[tp.id] || HelpCircle;
              return (
                <button key={tp.id} onClick={() => handleTopicAnalysis(tp.id)} disabled={analysisLoading}
                  className={`topic-chip ${activeTopic === tp.id ? "active" : ""}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <ChipIcon size={12} style={{ color: activeTopic === tp.id ? "var(--accent)" : "var(--muted)" }} />
                  <span>{lang === "en" ? tp.en : tp.te}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Phase 12 / PR 30 — chat area + right-rail TOC.
          The TOC is power-user navigation for long sessions
          (#A5). Lists each AI bubble in order; clicking jumps
          to that message. Only shown after 2+ messages so a
          single-answer view stays uncluttered. */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      {/* Chat messages — bubble style */}
      {/* PR A1.3-fix-25 — role=log + aria-live=polite so screen
          readers announce streaming AI chunks as they arrive.
          Was completely silent for AT users in astrologer mode
          (user mode already had this). */}
      <div
        role="log"
        aria-live="polite"
        aria-label={t("AI analysis conversation", "AI విశ్లేషణ సంభాషణ")}
        style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 2 }}
      >
        {analysisMessages.length === 0 && !analysisLoading && (
          <div style={{ textAlign: "center", padding: "2.25rem 1rem 1.25rem" }}>
            <div style={{ fontSize: 32, marginBottom: 10, color: "var(--accent)", opacity: 0.7 }}>↑</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>{t("Pick a topic above", "పై నుండి అంశాన్ని ఎంచుకోండి")}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", opacity: 0.6, marginBottom: 18 }}>{t("or type your question below", "లేదా మీ ప్రశ్నను క్రింద టైప్ చేయండి")}</div>
            {/* Suggested starter questions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 520, margin: "0 auto" }}>
              {[
                { en: "When will I get married?", te: "నాకు వివాహం ఎప్పుడు?" },
                { en: "What career suits my chart?", te: "నా చార్ట్‌కు ఏ కెరీర్ సరిపోతుంది?" },
                { en: "Tell me about my personality", te: "నా వ్యక్తిత్వం గురించి చెప్పండి" },
                { en: "Should I move abroad?", te: "నేను విదేశాలకు వెళ్లాలా?" },
              ].map((q, i) => (
                <button key={i}
                  onClick={() => { setChatQ(t(q.en, q.te)); }}
                  className="followup-chip">
                  {t(q.en, q.te)}
                </button>
              ))}
            </div>
          </div>
        )}
        {analysisMessages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "1.25rem" }} className="fade-in" id={`analysis-msg-${msg.id ?? i}`}>
            {/* User question quote block */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, width: "100%" }}>
              <div
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "var(--accent)",
                  maxWidth: "100%",
                  width: "100%",
                  borderRadius: 4,
                  background: "rgba(201, 169, 110, 0.03)",
                  borderLeft: "3px solid var(--accent)",
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontFamily: "inherit"
                }}
              >
                {msg.isTopic && <span style={{ fontSize: 9, color: "var(--accent)", display: "block", marginBottom: 4, fontStyle: "normal", letterSpacing: "0.05em", textTransform: "uppercase" }}>◈ {t("Topic Analysis", "అంశ విశ్లేషణ")}</span>}
                "{msg.q}"
              </div>
            </div>
            {/* AI answer block — left aligned, with avatar dot + copy button. */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
              <div className="chat-ai-dot" title="DevAstroAI" style={{ border: "1px solid rgba(201, 169, 110, 0.3)", background: "rgba(201, 169, 110, 0.08)", color: "var(--accent)" }}>D</div>
              <div
                className="md-body"
                style={{
                  padding: "1.25rem 1.5rem",
                  maxWidth: "min(78ch, calc(94% - 34px))",
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                  borderRadius: 8,
                }}
              >
                <button
                  className="copy-btn"
                  data-copy-id={`copy-${i}`}
                  onClick={(e) => {
                    navigator.clipboard.writeText(msg.a);
                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.textContent = "✓ Copied";
                    btn.classList.add("copied");
                    setTimeout(() => {
                      btn.textContent = "Copy";
                      btn.classList.remove("copied");
                    }, 1500);
                  }}
                >Copy</button>
                {/* PR A1.3-fix-22 — streaming placeholder: render typing dots
                    inline while the bubble is empty and streaming, then swap
                    to markdown as chunks arrive. Avoids the duplicate-bubble
                    glitch (empty placeholder + standalone loading-dots block). */}
                {i === analysisMessages.length - 1 && analysisLoading && !msg.a ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 12 }}>
                    <span className="typing-dots"><span /><span /><span /></span>
                    <span>{(() => {
                      // Phase 6 / PR 15 — Analyzing-loader uses
                      // language-aware topic label.
                      if (!activeTopic) return t("Thinking…", "ఆలోచిస్తున్నాను…");
                      const tp = TOPICS.find(tp => tp.id === activeTopic);
                      const enLabel = tp?.en || activeTopic;
                      const teLabel = tp?.te || activeTopic;
                      return t(`Analyzing ${enLabel}…`, `${teLabel} విశ్లేషిస్తున్నాను…`);
                    })()}</span>
                    {/* Phase 11 / PR 29 (#A2) — Stop generation.
                        Aborts the in-flight SSE stream. Both the
                        topic-analysis and chat streams expose
                        AbortControllers via refs at the top of
                        page.tsx, so this is a tiny click handler
                        over those existing channels. */}
                    <button
                      onClick={() => {
                        askStreamAbortRef.current?.abort();
                        analyzeStreamAbortRef.current?.abort();
                        setAnalysisLoading(false);
                      }}
                      className="analysis-stop-btn"
                      title={t("Stop generating this answer (Esc)", "జనరేషన్ ఆపండి (Esc)")}
                      style={{
                        marginLeft: 6,
                        padding: "3px 10px",
                        fontSize: 10.5,
                        background: "rgba(248,113,113,0.12)",
                        border: "0.5px solid rgba(248,113,113,0.4)",
                        color: "#f87171",
                        borderRadius: 5,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >■ {t("Stop", "ఆపండి")}</button>
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.a}</ReactMarkdown>
                )}
                {/* Phase 11 / PR 28 (#A16) — timestamp + Phase 11 / PR 29 (#A3) — Regenerate.
                    Timestamp surfaces "when was this generated"; Regenerate
                    re-fires the same topic/question against the same
                    streaming endpoint. Only shown after the response
                    finishes streaming. Subtle row, doesn't fight content. */}
                {msg.a && !(i === analysisMessages.length - 1 && analysisLoading) && (
                  <div className="analysis-meta-row">
                    {msg.t && (
                      <span title={new Date(msg.t).toLocaleString()}>
                        {(() => {
                          const mins = Math.floor((Date.now() - msg.t!) / 60000);
                          if (mins < 1) return t("just now", "ఇప్పుడే");
                          if (mins < 60) return t(`${mins}m ago`, `${mins} నిమిషాల క్రితం`);
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return t(`${hrs}h ago`, `${hrs} గంటల క్రితం`);
                          const days = Math.floor(hrs / 24);
                          return t(`${days}d ago`, `${days} రోజుల క్రితం`);
                        })()}
                      </span>
                    )}
                    {!analysisLoading && (
                      <button
                        className="analysis-regen-btn"
                        title={t(
                          "Regenerate — drops this answer and re-fires the same prompt",
                          "మళ్ళీ తయారు చేయండి — ఈ సమాధానాన్ని తీసివేసి అదే ప్రశ్న మళ్ళీ అడుగుతుంది"
                        )}
                        onClick={() => {
                          const wasTopic = msg.isTopic;
                          const sameQ = msg.q;
                          // Drop this message + everything below it.
                          setAnalysisMessages(prev => prev.slice(0, i));
                          if (wasTopic) {
                            // Topic q is "<Label> — Full Analysis";
                            // reverse-lookup id from TOPICS.
                            const found = TOPICS.find(tp =>
                              sameQ.startsWith((lang === "en" ? tp.en : tp.te))
                            );
                            if (found) handleTopicAnalysis(found.id);
                          } else {
                            // Chat message — repopulate input so the
                            // user can re-submit with one Enter (avoids
                            // a stale-closure bug on handleWorkspaceChat
                            // which reads chatQ from React state).
                            setChatQ(sameQ);
                          }
                        }}
                      >↻ {t("Regenerate", "మళ్ళీ")}</button>
                    )}
                  </div>
                )}
                {/* Suggested follow-up chips on the LATEST AI message only */}
                {i === analysisMessages.length - 1 && !analysisLoading && (
                  <div className="followup-chips">
                    {[
                      { en: "When exactly within this window?", te: "ఈ విండోలో సరిగ్గా ఎప్పుడు?" },
                      { en: "Show timing in plain English", te: "సాధారణ భాషలో సమయం చూపించండి" },
                      { en: "What should I do now?", te: "ఇప్పుడు నేను ఏమి చేయాలి?" },
                    ].map((q, j) => (
                      <button key={j}
                        onClick={() => { setChatQ(t(q.en, q.te)); }}
                        className="followup-chip">
                        {t(q.en, q.te)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* PR A1.3-fix-22 — standalone loading-dots block removed.
            Streaming now renders typing dots INSIDE the placeholder
            AI bubble (above) so there's no duplicate-bubble glitch.
            Fallback safety: if loading is true but no placeholder
            exists yet (race window), show a minimal indicator. */}
        {analysisLoading && analysisMessages.length === 0 && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "0.5rem 0" }}>
            <div className="chat-ai-dot">D</div>
            <div className="chat-bubble-ai" style={{ padding: "0.85rem 1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 12 }}>
                <span className="typing-dots"><span /><span /><span /></span>
                <span>{t("Thinking…", "ఆలోచిస్తున్నాను…")}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Phase 12 / PR 30 — right-rail TOC. Lists every
          message in order with a jump-scroll handler. Topic
          messages get the topic emoji + bold; chat messages
          get a light truncated preview. Hidden on viewports
          below 1100px (mobile/tablet) and when there are
          fewer than 2 messages. */}
      {analysisMessages.length >= 2 && (
        <nav
          className="analysis-toc kp-hide-below-1100"
          aria-label={t("Conversation outline", "సంభాషణ సూచిక")}
        >
          <div className="analysis-toc-eyebrow">
            {t("Outline", "సూచిక")}
          </div>
          {analysisMessages.map((msg, i) => {
            const isTopic = !!msg.isTopic;
            // For topic messages, find the topic to grab the emoji.
            const topic = isTopic
              ? TOPICS.find(tp =>
                  msg.q.startsWith((lang === "en" ? tp.en : tp.te))
                )
              : undefined;
            const TopicIcon = topic ? TOPIC_ICONS[topic.id] : undefined;
            const preview = isTopic
              ? (topic ? (lang === "en" ? topic.en : topic.te) : msg.q)
              : msg.q.length > 38 ? `${msg.q.slice(0, 38)}…` : msg.q;
            return (
              <button
                key={msg.id ?? i}
                type="button"
                className={`analysis-toc-item ${isTopic ? "is-topic" : "is-followup"}`}
                onClick={() => {
                  const el = document.getElementById(`analysis-msg-${msg.id ?? i}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {isTopic && (
                  <span className="analysis-toc-emoji" style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}>
                    {TopicIcon ? <TopicIcon size={12} style={{ color: "var(--accent)" }} /> : "◈"}
                  </span>
                )}
                {preview}
              </button>
            );
          })}
        </nav>
      )}
      </div>
    </div>
  );
}
