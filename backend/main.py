"""
Competitor Weakness Miner — FastAPI Backend
Hackathon Project for Boundary AI

Ingests noisy bilingual competitor reviews, uses GPT-4o-mini with
structured outputs to extract traceable competitive intelligence.
"""

import json
import os
from typing import Optional

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


class ReviewPayload(BaseModel):
    """Request body: the frontend sends the array of reviews."""
    reviews: list[Review]


class CompetitorWeakness(BaseModel):
    """A single discovered weakness with full traceability."""
    competitor_weakness: str = Field(
        description="A clear, concise name for the competitor's operational failure."
    )
    traceable_quotes: list[str] = Field(
        description="The exact review_id values (e.g. 'R001', 'R012') from the input data that prove this weakness exists. Minimum 3 IDs."
    )
    our_solution: str = Field(
        description="A 2-sentence pitch explaining how our product solves this problem better to steal their users."
    )
    engineering_ticket: str = Field(
        description="A structured Jira-style engineering ticket with Title, User Story, and Acceptance Criteria."
    )


class AnalysisResponse(BaseModel):
    """Top-level response: an array of discovered weaknesses."""
    weaknesses: list[CompetitorWeakness] = Field(
        description="Array of the top 3 most critical competitor weaknesses found in the reviews, ordered by severity."
    )


# ─── FastAPI App ────────────────────────────────────────────────────

app = FastAPI(
    title="Competitor Weakness Miner",
    description="Autonomous AI pipeline that extracts traceable competitive intelligence from noisy user reviews.",
    version="1.0.0",
)

# CORS — allow the Next.js frontend (port 3000) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── System Prompt ──────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an elite competitive intelligence analyst working for a SaaS startup.

Your task: Analyze an array of real customer reviews about a competitor product called "OmniDesk". 
The reviews are noisy — they contain internet slang, typos, mixed languages (English and Quebec French), and casual tone.

You MUST:
1. Read ALL reviews carefully, in both English and French.
2. Identify the TOP 3 most recurring and critical pain points / operational failures mentioned across the reviews.
3. For each weakness, provide the EXACT review_id values (e.g. "R001", "R023") of the reviews that mention or relate to that specific weakness. You must cite at least 3 review_ids per weakness. Only cite review_ids that genuinely discuss the weakness.
4. For each weakness, write a 2-sentence pitch on how OUR product can solve this problem better to steal OmniDesk's users.
5. For each weakness, write a structured Jira engineering ticket in this exact format:
   "**Title:** [Feature Title]\\n**User Story:** As a [user type], I want [goal] so that [benefit].\\n**Acceptance Criteria:**\\n- [ ] [Criterion 1]\\n- [ ] [Criterion 2]\\n- [ ] [Criterion 3]"

CRITICAL: Traceability is everything. Every insight MUST be backed by specific review_ids. Never fabricate or hallucinate a review_id that doesn't exist in the input data.

Order your 3 weaknesses from most critical (most frequently mentioned) to least critical."""


# ─── API Endpoint ───────────────────────────────────────────────────

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_reviews(payload: ReviewPayload):
    """
    Accept an array of competitor reviews and return structured
    competitive intelligence with full traceability.
    """
    if not payload.reviews:
        raise HTTPException(status_code=400, detail="No reviews provided.")

    # Serialize reviews into a readable block for the LLM
    reviews_text = json.dumps(
        [r.model_dump() for r in payload.reviews],
        indent=2,
        ensure_ascii=False,
    )

    user_prompt = f"""Analyze the following {len(payload.reviews)} competitor reviews and extract the top 3 weaknesses.

REVIEWS DATA:
{reviews_text}"""

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format=AnalysisResponse,
            temperature=0.2,
        )

        result = completion.choices[0].message.parsed

        if result is None:
            raise HTTPException(
                status_code=502,
                detail="Model returned an unparseable response. The output did not match the required schema.",
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
    return {"status": "ok", "model": "gpt-4o-mini", "pipeline": "competitor-weakness-miner"}


# ─── Run ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
