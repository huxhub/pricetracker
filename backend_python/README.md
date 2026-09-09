# PricePulse Python Scraper (SeleniumBase UC Mode)

An independent, standalone Python backend dedicated to testing and evaluating **SeleniumBase Undetected-Chromedriver (UC Mode)** against Noon Saudi Arabia and Akamai Bot Manager.

> **Note**: This folder is completely self-contained and isolated from the main Node.js/Next.js application.

---

## 1. Prerequisites

1. **Python 3.10+**:
   If Python is not installed on your system, install it via:
   - Official installer: [python.org/downloads](https://www.python.org/downloads/) (Check **"Add Python to PATH"** during setup).
   - Or via `winget`:
     ```powershell
     winget install Python.Python.3.12
     ```
2. **Google Chrome**:
   Must have regular Google Chrome installed, as SeleniumBase UC mode attaches to your installed Chrome binary.

---

## 2. Installation & Setup

Navigate into this folder and create a dedicated Python virtual environment:

```powershell
cd backend_python

# 1. Create virtual environment
python -m venv venv

# 2. Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# (If execution policy error occurs: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)

# 3. Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3. How to Run

### Option A: Run Standalone CLI Script
Test a Noon product URL directly from the terminal:

```powershell
# Test default iPhone product:
python scraper.py

# Test any specific Noon URL:
python scraper.py https://www.noon.com/saudi-en/N70211541V/p/
```

### Option B: Run as a FastAPI Microservice
Run a local HTTP server on port 8000:

```powershell
python api.py
# Or:
uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

Once running:
- **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Scrape endpoint**:
  ```text
  GET http://localhost:8000/scrape?url=https://www.noon.com/saudi-en/N70211541V/p/&headless=false
  ```

---

## 4. Key Notes on SeleniumBase UC Mode vs Akamai

1. **Visible Browser (`headless=False`)**:
   - Akamai’s client-side behavioral sensor (`_akamai/sensor_data`) evaluates window dimensions, screen focus, and hardware rendering.
   - For initial testing, **leave `headless=False`** so Chrome opens in a visible window. This yields significantly higher bypass rates than headless.
2. **Headless Mode (`headless=True`)**:
   - In pure headless environments (like Linux servers or Docker containers), Akamai detects the lack of physical display metrics unless a virtual framebuffer (`Xvfb`) or specialized flags are provided.
3. **Driver Drift**:
   - Whenever your Google Chrome browser updates to a new major version (e.g. 131 -> 132), run:
     ```powershell
     sbase get chromedriver
     ```
     to ensure the chromedriver matches your installed browser.
