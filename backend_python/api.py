"""
FastAPI microservice wrapper around SeleniumBase UC Mode scraper.
Run with: uvicorn api:app --host 127.0.0.1 --port 8000 --reload
"""

import os
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from scraper import scrape_noon

app = FastAPI(
    title="PricePulse Python Scraper Service",
    description="Independent Python service running SeleniumBase UC Mode for Noon testing",
    version="1.0.0"
)

class ScrapeRequest(BaseModel):
    url: str
    headless: bool = True

@app.get("/")
def root():
    return {
        "service": "PricePulse Python Scraper Service",
        "status": "ready",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/scrape")
def scrape_get(
    url: str = Query(..., description="Target Noon URL"),
    headless: bool = Query(True, description="Run headless (hidden in background) or False for visible browser")
):
    """Scrape product details and price from Noon URL."""
    res = scrape_noon(url, headless=headless)
    return res

@app.post("/scrape")
def scrape_post(req: ScrapeRequest):
    """Scrape product details via POST request."""
    res = scrape_noon(req.url, headless=req.headless)
    return res

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run("api:app", host=host, port=port, reload=True)
