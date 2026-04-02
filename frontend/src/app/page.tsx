"use client";

import { useState, useCallback, useMemo } from "react";
import reviewsData from "../data/competitor_reviews.json";

// ─── Types ────────────────────────────────────────────────────────

interface Review {
  review_id: string;
  source: string;
  language: string;
  text: string;
}

interface ComplaintStats {
  pdfExportCrashes: number;
  frenchLocalizationIssues: number;
  otherComplaints: number;
}

interface CompetitorWeakness {
  competitor_weakness: string;
  traceable_quotes: string[];
  our_solution: string;
  engineering_ticket: string;
}

interface AnalysisResponse {
  weaknesses: CompetitorWeakness[];
}

// ─── Constants ────────────────────────────────────────────────────

const API_URL = "http://localhost:8000/api/analyze";
const reviews: Review[] = reviewsData as Review[];

// ─── Helper Functions ─────────────────────────────────────────────

function analyzeComplaints(reviewList: Review[]): ComplaintStats {
  const pdfKeywords = ["pdf", "export", "crash", "freeze", "fail", "broken"];
  const frenchKeywords = ["français", "anglais", "traduction", "localiz", "fr"];
  
  let pdfCount = 0;
  let frenchCount = 0;

  reviewList.forEach((review) => {
    const lowerText = review.text.toLowerCase();
    const isFrench = review.language === "fr" || frenchKeywords.some(kw => lowerText.includes(kw));
    const isPdf = pdfKeywords.some(kw => lowerText.includes(kw));

    if (isPdf) pdfCount++;
    else if (isFrench) frenchCount++;
  });

  return {
    pdfExportCrashes: pdfCount,
    frenchLocalizationIssues: frenchCount,
    otherComplaints: reviewList.length - pdfCount - frenchCount,
  };
}

function PieChart({
  data,
}: {
  data: ComplaintStats;
}) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const pdfPercent = (data.pdfExportCrashes / total) * 100;
  const frenchPercent = (data.frenchLocalizationIssues / total) * 100;
  const otherPercent = (data.otherComplaints / total) * 100;

  // Calculate SVG pie slices
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  const pdfOffset = 0;
  const pdfDasharray = (pdfPercent / 100) * circumference;
  
  const frenchOffset = pdfDasharray;
  const frenchDasharray = (frenchPercent / 100) * circumference;
  
  const otherOffset = pdfDasharray + frenchDasharray;
  const otherDasharray = (otherPercent / 100) * circumference;

  return (
    <div className="bg-surface-raised border border-border rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
        Complaint Distribution
      </h3>
      
      <div className="flex items-center gap-8">
        {/* Pie Chart */}
        <svg width="200" height="200" viewBox="0 0 200 200" className="flex-shrink-0">
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#ff4444"
            strokeWidth="28"
            fill="none"
            strokeDasharray={`${pdfDasharray} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#ff9c4d"
            strokeWidth="28"
            fill="none"
            strokeDasharray={`${frenchDasharray} ${circumference}`}
            strokeDashoffset={-pdfDasharray}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#4f9fff"
            strokeWidth="28"
            fill="none"
            strokeDasharray={`${otherDasharray} ${circumference}`}
            strokeDashoffset={-(pdfDasharray + frenchDasharray)}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
          <text
            x="100"
            y="100"
            textAnchor="middle"
            dy="0.3em"
            className="font-bold text-base fill-accent"
          >
            {total}
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            dy="0.3em"
            className="fill-text-dim text-xs"
          >
            Reviews
          </text>
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                PDF Export Crashes
              </span>
            </div>
            <div className="text-2xl font-bold text-red-500">
              {data.pdfExportCrashes}
              <span className="text-xs text-text-dim font-normal ml-1">
                ({pdfPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                French Localization Issues
              </span>
            </div>
            <div className="text-2xl font-bold text-orange-500">
              {data.frenchLocalizationIssues}
              <span className="text-xs text-text-dim font-normal ml-1">
                ({frenchPercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Other Issues
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {data.otherComplaints}
              <span className="text-xs text-text-dim font-normal ml-1">
                ({otherPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  G2: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Capterra: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Reddit: "bg-red-500/15 text-red-400 border-red-500/30",
  Trustpilot: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  ProductHunt: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const SEVERITY_CONFIG = [
  { label: "CRITICAL", color: "text-danger", bg: "bg-danger-bg border-danger/30", icon: "🔴" },
  { label: "HIGH", color: "text-warning", bg: "bg-warning-bg border-warning/30", icon: "🟠" },
  { label: "MODERATE", color: "text-accent", bg: "bg-accent-glow border-accent/30", icon: "🔵" },
];

// ─── Sub-Components ───────────────────────────────────────────────

function Header() {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            MA
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              Market Arbitrage
            </h1>
            <p className="text-[11px] text-text-muted">
              Competitor Weakness Miner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="px-2 py-1 rounded bg-surface-raised border border-border font-mono">
            gpt-4o-mini
          </span>
          <span className="px-2 py-1 rounded bg-surface-raised border border-border">
            Boundary AI Hackathon
          </span>
        </div>
      </div>
    </header>
  );
}

function ReviewCard({
  review,
  isHighlighted,
  isTraced,
}: {
  review: Review;
  isHighlighted: boolean;
  isTraced: boolean;
}) {
  const sourceStyle = SOURCE_COLORS[review.source] || "bg-gray-500/15 text-gray-400 border-gray-500/30";

  return (
    <div
      id={`review-${review.review_id}`}
      className={`
        group relative p-3.5 rounded-xl border transition-all duration-300
        ${isHighlighted
          ? "bg-highlight-bg border-highlight-border shadow-[0_0_20px_rgba(99,102,241,0.1)] scale-[1.02]"
          : isTraced
            ? "bg-accent-glow/50 border-accent/20"
            : "bg-surface-raised border-border hover:border-border-bright"
        }
      `}
    >
      {/* Trace indicator */}
      {isTraced && (
        <div className="absolute -left-px top-3 bottom-3 w-[3px] rounded-full bg-accent" />
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[11px] text-text-dim font-medium">
          {review.review_id}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${sourceStyle}`}>
          {review.source}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-overlay border border-border text-text-muted uppercase tracking-wider">
          {review.language}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground/80">
        {review.text}
      </p>
    </div>
  );
}

function WeaknessCard({
  weakness,
  index,
  isSelected,
  onClick,
}: {
  weakness: CompetitorWeakness;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const severity = SEVERITY_CONFIG[index] || SEVERITY_CONFIG[2];

  return (
    <button
      onClick={onClick}
      className={`
        animate-slide-up w-full text-left rounded-2xl border p-5 transition-all duration-300 cursor-pointer
        ${isSelected
          ? "bg-surface-overlay border-accent shadow-[0_0_30px_rgba(99,102,241,0.12)]"
          : "bg-surface-raised border-border hover:border-border-bright hover:bg-surface-overlay"
        }
      `}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Severity + Title */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-lg mt-0.5">{severity.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-md border ${severity.bg} ${severity.color}`}>
              {severity.label}
            </span>
            <span className="text-[11px] text-text-dim">
              {weakness.traceable_quotes.length} reviews cited
            </span>
          </div>
          <h3 className="font-semibold text-[15px] leading-snug">
            {weakness.competitor_weakness}
          </h3>
        </div>
      </div>

      {/* Our Solution */}
      <div className="ml-8 mb-3 p-3 rounded-lg bg-success-bg border border-success/20">
        <p className="text-[11px] font-semibold text-success uppercase tracking-wider mb-1">
          Our Competitive Advantage
        </p>
        <p className="text-[13px] text-foreground/80 leading-relaxed">
          {weakness.our_solution}
        </p>
      </div>

      {/* Jira Ticket */}
      <div className="ml-8 p-3 rounded-lg bg-surface border border-border">
        <p className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-1.5">
          Engineering Ticket
        </p>
        <div className="text-[12px] text-foreground/70 leading-relaxed font-mono whitespace-pre-line">
          {weakness.engineering_ticket}
        </div>
      </div>

      {/* Traced Review IDs */}
      <div className="ml-8 mt-3 flex flex-wrap gap-1.5">
        {weakness.traceable_quotes.map((id) => (
          <span
            key={id}
            className={`
              text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors
              ${isSelected
                ? "bg-accent/20 border-accent/40 text-accent-hover"
                : "bg-surface-overlay border-border text-text-muted"
              }
            `}
          >
            {id}
          </span>
        ))}
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-surface-raised p-5 animate-pulse-glow"
          style={{ animationDelay: `${i * 300}ms` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-surface-overlay" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-surface-overlay" />
              <div className="h-4 w-3/4 rounded bg-surface-overlay" />
            </div>
          </div>
          <div className="ml-8 space-y-2">
            <div className="h-16 rounded-lg bg-surface-overlay" />
            <div className="h-20 rounded-lg bg-surface-overlay" />
          </div>
        </div>
      ))}
      <div className="text-center pt-2">
        <p className="text-sm text-text-muted animate-pulse-glow">
          Analyzing {reviews.length} reviews across English & French...
        </p>
        <p className="text-xs text-text-dim mt-1">
          GPT-4o-mini is extracting traceable competitive intelligence
        </p>
      </div>
    </div>
  );
}

function StatsBar() {
  const langCount = reviews.reduce(
    (acc, r) => {
      acc[r.language] = (acc[r.language] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sourceCount = reviews.reduce(
    (acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      <div className="p-3 rounded-xl bg-surface-raised border border-border">
        <p className="text-[10px] text-text-dim uppercase tracking-widest mb-1">Reviews</p>
        <p className="text-2xl font-bold">{reviews.length}</p>
      </div>
      <div className="p-3 rounded-xl bg-surface-raised border border-border">
        <p className="text-[10px] text-text-dim uppercase tracking-widest mb-1">Sources</p>
        <p className="text-2xl font-bold">{Object.keys(sourceCount).length}</p>
      </div>
      <div className="p-3 rounded-xl bg-surface-raised border border-border">
        <p className="text-[10px] text-text-dim uppercase tracking-widest mb-1">English</p>
        <p className="text-2xl font-bold">{langCount["en"] || 0}</p>
      </div>
      <div className="p-3 rounded-xl bg-surface-raised border border-border">
        <p className="text-[10px] text-text-dim uppercase tracking-widest mb-1">French</p>
        <p className="text-2xl font-bold">{langCount["fr"] || 0}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeakness, setSelectedWeakness] = useState<number | null>(null);

  // Derive the set of highlighted review IDs from the selected weakness
  const highlightedIds = useMemo<Set<string>>(() => {
    if (analysis && selectedWeakness !== null) {
      return new Set(analysis.weaknesses[selectedWeakness]?.traceable_quotes || []);
    }
    return new Set();
  }, [analysis, selectedWeakness]);

  // All traced IDs across all weaknesses (for subtle indicators)
  const allTracedIds = useMemo<Set<string>>(() => {
    if (!analysis) return new Set();
    return new Set(analysis.weaknesses.flatMap((w) => w.traceable_quotes));
  }, [analysis]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setSelectedWeakness(null);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setAnalysis(data);
      setSelectedWeakness(0); // auto-select first weakness
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  }, []);

  // Scroll a highlighted review into view
  const scrollToReview = useCallback((id: string) => {
    const el = document.getElementById(`review-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <main className="flex-1 overflow-hidden">
        <div className="max-w-[1600px] mx-auto h-full flex flex-col">
          {/* Top bar */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                OmniDesk Competitive Analysis
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {`Analyzing ${reviews.length} public reviews · EN & FR · 5 data sources`}
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={loading}
              className={`
                relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300
                ${loading
                  ? "bg-surface-overlay text-text-muted border border-border cursor-not-allowed"
                  : "bg-gradient-to-r from-accent to-purple-500 text-white shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                }
              `}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                "🚀 Run Agentic Market Analysis"
              )}
            </button>
          </div>

          {/* Two-panel layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT — Intelligence Panel */}
            <div className="w-[55%] border-r border-border overflow-y-auto p-6 space-y-4">
              {!analysis && !loading && !error && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/20 flex items-center justify-center text-3xl mb-4">
                    🎯
                  </div>
                  <h3 className="text-base font-semibold mb-2">
                    Ready to Mine Competitor Weaknesses
                  </h3>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed">
                    Click{" "}
                    <span className="text-accent font-medium">
                      &quot;Run Agentic Market Analysis&quot;
                    </span>{" "}
                    to send {reviews.length} noisy bilingual reviews through our
                    GPT-4o-mini pipeline. The AI will identify the top 3
                    competitor weaknesses with full traceability.
                  </p>
                </div>
              )}

              {loading && <LoadingState />}

              {error && (
                <div className="p-4 rounded-xl bg-danger-bg border border-danger/30">
                  <p className="text-sm font-semibold text-danger mb-1">Analysis Failed</p>
                  <p className="text-xs text-foreground/70">{error}</p>
                </div>
              )}

              {analysis && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                      {analysis.weaknesses.length} weaknesses discovered
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {analysis.weaknesses.map((w, i) => (
                    <WeaknessCard
                      key={i}
                      weakness={w}
                      index={i}
                      isSelected={selectedWeakness === i}
                      onClick={() => {
                        setSelectedWeakness(i);
                        // Scroll first traced review into view
                        if (w.traceable_quotes.length > 0) {
                          setTimeout(() => scrollToReview(w.traceable_quotes[0]), 150);
                        }
                      }}
                    />
                  ))}
                </>
              )}
            </div>

            {/* RIGHT — Raw Reviews Panel */}
            <div className="w-[45%] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                  Raw Review Feed
                </h3>
                {highlightedIds.size > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-accent-glow border border-accent/30 text-accent-hover font-medium">
                    {highlightedIds.size} traced
                  </span>
                )}
              </div>

              <StatsBar />

              <div className="mb-6">
                <PieChart data={useMemo(() => analyzeComplaints(reviews), [reviews])} />
              </div>

              <div className="space-y-2.5">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.review_id}
                    review={review}
                    isHighlighted={highlightedIds.has(review.review_id)}
                    isTraced={allTracedIds.has(review.review_id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
