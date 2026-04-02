"""
Competitor Weakness Miner — FastAPI Backend
Hackathon Project for Boundary AI

Ingests noisy bilingual competitor reviews, uses GPT-4o-mini with
structured outputs to extract traceable competitive intelligence,
churn urgency signals, and a competitor health score.
"""

import json
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

# ─── Load Environment ──────────────────────────────────────────────
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set — create a backend/.env file")

client = OpenAI(api_key=OPENAI_API_KEY)

# ─── Pydantic Schemas ──────────────────────────────────────────────

class Review(BaseModel):
    """Single competitor review from the raw dataset."""
    review_id: str
    source: str
    language: str
    text: str


class CompanyProfile(BaseModel):
    """Context about the user's own company — used to personalize the AI's solution pitch."""
    company_name: str
    description: str
    key_strengths: str
    target_market: str
    biggest_edge: str


class ReviewPayload(BaseModel):
    """Request body: the frontend sends the reviews AND the company profile."""
    reviews: list[Review]
    company_profile: CompanyProfile


class CompetitorWeakness(BaseModel):
    """A single discovered weakness with full traceability."""
    competitor_weakness: str = Field(
        description="A clear, concise name for the competitor's operational failure."
    )
    traceable_quotes: list[str] = Field(
        description="The exact review_id values (e.g. 'R001', 'R012') from the input data that prove this weakness exists. Minimum 3 IDs."
    )
    our_solution: str = Field(
        description="A 2-sentence pitch explaining how OUR SPECIFIC COMPANY (from the profile) solves this problem better—using the company's real strengths and differentiators, not generic language."
    )
    engineering_ticket: str = Field(
        description="A structured Jira-style engineering ticket with Title, User Story, and Acceptance Criteria."
    )


class ChurnSignal(BaseModel):
    """Churn urgency classification for a single review."""
    review_id: str = Field(
        description="The review_id of the review being classified (e.g. 'R001')."
    )
    churn_level: Literal["actively_leaving", "frustrated", "complaining"] = Field(
        description=(
            "'actively_leaving' = the user has decided to switch or is on the verge (e.g. 'I'm switching', 'last month on this platform', 'found an alternative'). "
            "'frustrated' = genuinely angry with eroding loyalty but not yet leaving (e.g. 'unacceptable', 'losing work', 'thinking about leaving'). "
            "'complaining' = annoyed or disappointed but stable (e.g. 'wish they fixed', 'kind of buggy', 'could be better')."
        )
    )
    signal_phrase: str = Field(
        description="A short exact phrase (max 8 words) copied directly from the review text that best reveals the churn level."
    )


class HealthScore(BaseModel):
    """Overall competitor product health score derived from all reviews."""
    score: int = Field(
        description=(
            "Integer from 0 to 100 representing how healthy the competitor's product appears to its users. "
            "0 = catastrophic product failure, 100 = excellent. "
            "Base it on: proportion of negative reviews, severity of pain points, frequency of churn language, "
            "and whether critical bugs remain unfixed over time. A score under 50 signals real vulnerability."
        )
    )
    summary: str = Field(
        description="2-sentence explanation of why the competitor received this specific score."
    )
    opportunity_level: Literal["critical", "high", "moderate", "low"] = Field(
        description=(
            "Market opportunity level for us based on the score. "
            "'critical' = score 0-39 (act immediately), "
            "'high' = score 40-59 (strong window), "
            "'moderate' = score 60-74 (some opportunity), "
            "'low' = score 75-100 (competitor is healthy, proceed carefully)."
        )
    )
    window_statement: str = Field(
        description="A single punchy sentence (max 20 words) about the strategic window of opportunity this score creates."
    )


class AnalysisResponse(BaseModel):
    """Top-level response: weaknesses, per-review churn signals, and overall health score."""
    weaknesses: list[CompetitorWeakness] = Field(
        description="Array of the top 3 most critical competitor weaknesses found in the reviews, ordered by severity."
    )
    churn_signals: list[ChurnSignal] = Field(
        description=(
            "Churn urgency classification for EVERY review in the input. "
            "You must include one entry per review_id — do not skip any review."
        )
    )
    health_score: HealthScore = Field(
        description="An overall health score for the competitor's product based on all reviews."
    )


# ─── FastAPI App ────────────────────────────────────────────────────

app = FastAPI(
    title="Competitor Weakness Miner",
    description="Autonomous AI pipeline that extracts traceable competitive intelligence from noisy user reviews.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── System Prompt Builder ─────────────────────────────────────────

def build_system_prompt(profile: CompanyProfile) -> str:
    return f"""You are an elite competitive intelligence analyst working for {profile.company_name}.

## About {profile.company_name}
- **What they do:** {profile.description}
- **Key strengths:** {profile.key_strengths}
- **Target market:** {profile.target_market}
- **Biggest competitive edge:** {profile.biggest_edge}

## Your Task
Analyze an array of real customer reviews about a competitor called "OmniDesk".
Reviews are noisy — they contain internet slang, typos, mixed English and Quebec French.

You MUST output all three sections:

### SECTION 1 — Top 3 Weaknesses
Identify the 3 most recurring and critical pain points across the reviews.
- For each: cite at least 3 exact review_ids that prove it (only real IDs from the input).
- Write the 'our_solution' pitch using {profile.company_name}'s ACTUAL listed strengths — be specific, never generic.
- Write a structured Jira ticket: **Title**, **User Story**, **Acceptance Criteria** (3 checkboxes).
- Order by severity (most critical first).

### SECTION 2 — Churn Signals (ALL reviews)
Classify EVERY single review as one of:
- "actively_leaving": user has decided or is very close to switching platforms
- "frustrated": genuinely angry, loyalty eroding, but not yet leaving
- "complaining": annoyed or disappointed but stable

Include the exact short phrase from the review that reveals the classification.
You MUST classify all {'{total}'} reviews — do not skip any.

### SECTION 3 — Competitor Health Score
Score the competitor's overall product health from 0–100.
Consider: proportion of negative reviews, severity of pain points, frequency of "switching" language, and whether bugs appear chronic vs one-off.
Then assign an opportunity level and write one punchy window statement.

CRITICAL RULE: Never fabricate review_ids. Only cite IDs from the input data."""


# ─── API Endpoint ───────────────────────────────────────────────────

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_reviews(payload: ReviewPayload):
    if not payload.reviews:
        raise HTTPException(status_code=400, detail="No reviews provided.")

    system_prompt = build_system_prompt(payload.company_profile).replace(
        "{total}", str(len(payload.reviews))
    )

    reviews_text = json.dumps(
        [r.model_dump() for r in payload.reviews],
        indent=2,
        ensure_ascii=False,
    )

    user_prompt = f"""Analyze the following {len(payload.reviews)} competitor reviews.
Output all three sections: top 3 weaknesses, churn signals for ALL {len(payload.reviews)} reviews, and the health score.

REVIEWS DATA:
{reviews_text}"""

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=AnalysisResponse,
            temperature=0.2,
        )

        result = completion.choices[0].message.parsed

        if result is None:
            raise HTTPException(
                status_code=502,
                detail="Model returned an unparseable response.",
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API error: {str(e)}",
        )


# ─── Health Check ───────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "model": "gpt-4o-mini", "pipeline": "competitor-weakness-miner", "version": "2.0.0"}


# ─── Run ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
