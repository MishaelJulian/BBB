# DAKSH — eCourts Karnataka Automated Data Pipeline & Judicial Case Extraction Engine

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python)](https://python.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?style=flat-square&logo=playwright)](https://playwright.dev/)
[![BeautifulSoup](https://img.shields.io/badge/BS4-Parsing-59666C?style=flat-square)](https://www.crummy.com/software/BeautifulSoup/)
[![Pandas](https://img.shields.io/badge/Pandas-Data%20Pipelines-150458?style=flat-square&logo=pandas)](https://pandas.pydata.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square)]()

An enterprise-grade automation framework and data consolidation pipeline engineered to extract, normalize, and serialize disposed judicial case records (Executive Petitions) from the Indian eCourts portal for Karnataka.

Developed as part of the **DAKSH Judicial Research & Service Learning Initiative**.

---

## 🏛️ Pipeline Overview

Extracting structured judicial data from the eCourts platform requires navigating dynamic AJAX pages, anti-automation controls, and heterogeneous case table layouts. This pipeline provides end-to-end reliability with human-in-the-loop arbitration and atomic data persistence.

```
┌────────────────────────────────────────────────────────┐
│           Playwright Stateful Browser Driver           │
│     Session Auth • CAPTCHA Arbitration • Pagination    │
└───────────────────────────┬────────────────────────────┘
                            │ Raw AJAX HTML Snippets
                            ▼
┌────────────────────────────────────────────────────────┐
│             BeautifulSoup4 Resilient Parser            │
│   Table Normalization • Schema Parsing • Sanitization  │
└───────────────────────────┬────────────────────────────┘
                            │ Strongly-typed Case Models
                            ▼
┌────────────────────────────────────────────────────────┐
│            Atomic Multi-Format Exporter                │
│    JSON Records • Consolidated CSV • Audit Reports     │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Core Capabilities

- **Resilient Automation Engine:** Uses Playwright for stateful browser session lifecycle management, robust against network latency and DOM mutation.
- **Human-in-the-Loop Arbitration:** Interactive CAPTCHA prompt system allowing human verification while automating 100% of subsequent traversal, query execution, and pagination.
- **Strict Schema Enforcement:** Case records are validated and mapped into strongly typed Python dataclasses ensuring zero data corruption.
- **Atomic Serialization:** Exports individual case payloads to JSON with transaction logging, accompanied by consolidated year-wise CSV and formatted Excel datasets.
- **Audit & Validation Suite:** Comprehensive test suite validating schema integrity, record consistency across years, and missing-field audits.

---

## 📂 Project Architecture

```
DAKSH/
├── ecourts_scraper/           # Core scraping and navigation engine
│   ├── browser.py            # Playwright lifecycle & session manager
│   ├── config.py             # Timeouts, endpoints, and environment variables
│   ├── exporter.py           # Atomic JSON, CSV, and Excel serializers
│   ├── models.py             # Typed case schemas & data contracts
│   ├── parser.py             # Pure BS4 extraction & table parsing
│   ├── scraper.py            # High-level stateful workflow
│   └── utils.py              # Exponential backoff and structured logger
├── tests/                    # Unit and regression test suites
│   ├── test_export_consistency.py
│   └── test_production_exporter.py
├── consolidate_data.py       # Multi-year dataset consolidation
└── requirements.txt          # Production dependencies
```

---

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.10+
- Playwright browser binaries

### 2. Installation
```bash
git clone https://github.com/MishaelJulian/DAKSH.git
cd DAKSH

python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

pip install -r requirements.txt
playwright install chromium
```

### 3. Execution
```bash
# Run the extraction workflow
python -m ecourts_scraper.scraper

# Consolidate scraped JSON outputs into unified CSV
python consolidate_data.py
```

---

## 📄 License & Attribution
Developed for judicial research and data transparency under the DAKSH Service Learning Initiative.
