# Competition Analysis

A Python project to scrape and analyze emotional sentiment on two competitive companies, identifying insights on what one company should change and improve.

## Project Structure

```
CompetitionAnalysis/
├── src/                      # Source code
│   ├── scraper.py           # Web scraping module
│   ├── sentiment_analyzer.py # Sentiment analysis module
│   └── main.py              # Main execution script
├── data/                     # Data storage
│   ├── raw/                 # Raw scraped data
│   └── processed/           # Processed data
├── notebooks/               # Jupyter notebooks for analysis
├── tests/                   # Unit tests
├── requirements.txt         # Project dependencies
├── README.md               # This file
└── .gitignore             # Git ignore file
```

## Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv\Scripts\activate  # On Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Download required NLTK data:
   ```bash
   python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"
   ```

## Usage

Run the main analysis:
```bash
python src/main.py
```

## Dependencies

- **requests**: HTTP requests for web scraping
- **beautifulsoup4**: HTML parsing
- **selenium**: Browser automation for dynamic content
- **pandas**: Data manipulation and analysis
- **nltk / textblob / vaderSentiment**: Sentiment analysis
- **matplotlib / seaborn**: Data visualization
- **scikit-learn**: Machine learning utilities

## Project Goals

1. Scrape sentiment data from multiple sources about two competing companies
2. Perform sentiment analysis on the collected data
3. Compare emotional sentiment between competitors
4. Generate actionable insights for company improvement
5. Visualize findings through charts and reports

## Next Steps

1. Define which companies to analyze
2. Identify data sources (social media, reviews, news, forums, etc.)
3. Implement web scraping logic in `scraper.py`
4. Build sentiment analysis pipeline in `sentiment_analyzer.py`
5. Create analysis notebooks in `notebooks/`

## Author

Created: April 2026
