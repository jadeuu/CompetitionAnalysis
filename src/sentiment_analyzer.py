"""
Sentiment analysis module for analyzing emotional sentiment in text data.

This module provides tools for:
- Sentiment classification (positive, negative, neutral)
- Emotion detection
- Comparative analysis between companies
- Report generation
"""

import logging
from typing import Dict, List
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import pandas as pd

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Analyzer for company sentiment data."""
    
    def __init__(self):
        """Initialize the sentiment analyzer."""
        self.analyzer = SentimentIntensityAnalyzer()
        self.results = {}
    
    def analyze(self, data: Dict[str, List[str]]) -> Dict[str, Dict]:
        """
        Analyze sentiment for each company.
        
        Args:
            data: Dictionary with company names and list of texts
            
        Returns:
            Dictionary with analysis results
        """
        logger.info("Starting sentiment analysis...")
        
        results = {}
        for company, texts in data.items():
            logger.info(f"Analyzing {len(texts)} texts for {company}...")
            results[company] = self.analyze_texts(texts)
        
        self.results = results
        return results
    
    def analyze_texts(self, texts: List[str]) -> Dict:
        """
        Analyze sentiment for a list of texts.
        
        Args:
            texts: List of text samples
            
        Returns:
            Dictionary with aggregated sentiment scores
        """
        sentiments = []
        
        for text in texts:
            scores = self.analyzer.polarity_scores(text)
            sentiments.append(scores)
        
        if not sentiments:
            return {
                'positive': 0,
                'negative': 0,
                'neutral': 0,
                'compound': 0,
                'count': 0
            }
        
        df = pd.DataFrame(sentiments)
        
        return {
            'positive': (df['compound'] > 0.05).sum(),
            'negative': (df['compound'] < -0.05).sum(),
            'neutral': ((df['compound'] >= -0.05) & (df['compound'] <= 0.05)).sum(),
            'compound': df['compound'].mean(),
            'count': len(sentiments),
            'std': df['compound'].std()
        }
    
    def generate_report(self, results: Dict[str, Dict]) -> str:
        """
        Generate a sentiment analysis report.
        
        Args:
            results: Analysis results from analyze()
            
        Returns:
            Formatted report string
        """
        logger.info("Generating report...")
        
        report = "=== Sentiment Analysis Report ===\n\n"
        
        for company, metrics in results.items():
            report += f"Company: {company}\n"
            report += f"  Total samples: {metrics.get('count', 0)}\n"
            report += f"  Positive: {metrics.get('positive', 0)}\n"
            report += f"  Negative: {metrics.get('negative', 0)}\n"
            report += f"  Neutral: {metrics.get('neutral', 0)}\n"
            report += f"  Average sentiment: {metrics.get('compound', 0):.3f}\n\n"
        
        return report
