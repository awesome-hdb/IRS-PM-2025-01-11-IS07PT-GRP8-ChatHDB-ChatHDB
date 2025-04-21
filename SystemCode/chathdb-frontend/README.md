<p align="center">
  <img src="public/logo.png" alt="ChatHDB Logo" width="200"/>
</p>

<h1 align="center">ChatHDB</h1>
<h2 align="center">Singapore's Intelligent HDB Valuation & Analytics Engine</h2>
<h4 align="center">Beyond Simple Estimates: Deep Insights, Dynamic Valuations, Comprehensive Market Context.</h4>

<p align="center">
  <a href="#-why-chathdb">Why ChatHDB?</a> •
  <a href="#-features">Features</a> •
  <a href="#-valuation-methodology-the-chathdb-difference">Valuation Methodology</a> •
  <a href="#-technology-stack">Technology Stack</a> •
  <a href="#-screenshots">Screenshots</a> •
  <a href="#-getting-started">Getting Started</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-13.5.1-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18.2.0-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-3-cyan?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/ML-Random%20Forest-green" alt="Machine Learning" />
  <img src="https://img.shields.io/badge/AI-Google%20Generative%20AI-purple" alt="AI" />
  <img src="https://img.shields.io/badge/Data%20Viz-Nivo%20%26%20Recharts-orange" alt="Data Visualization" />
</p>

## 🏠 Introduction

Navigating the Singapore HDB resale market requires more than just basic price lookups. Traditional valuation tools often rely on outdated averages or simplistic models, failing to capture the dynamic nuances of the market.

**ChatHDB** revolutionizes HDB valuation by combining advanced **Machine Learning** (Random Forest) with **real-time market signals** – including Google Trends, news sentiment, and economic indicators. We provide not just a price estimate, but a comprehensive understanding of your property's value drivers, market position, and future potential, all delivered through an intuitive and modern interface.

## ⭐ Why ChatHDB? The Key Differentiators

ChatHDB isn't just another valuation tool. Here's what sets us apart:

1.  **🧠 Multi-Factor Dynamic Valuation Engine:**
    *   **Beyond Static Models:** We go beyond simple averages. Our core Random Forest model analyzes complex relationships between features (floor area, storey, lease).
    *   **Real-Time Pulse:** Crucially, our *base ML valuation* is dynamically **adjusted** using multipliers derived from:
        *   **Google Trends:** Gauging real-time search interest for your area.
        *   **News Sentiment Analysis:** Assessing market mood based on recent property news.
        *   **Economic Correlation:** Understanding how broader economic shifts (GDP, CPI, HDB Index, etc.) impact local prices.
    *   **Recency-Weighted:** We give significantly more weight to the most recent transactions (last 6 months) ensuring valuations reflect *current* market conditions.

2.  **📊 Deeper, Unique Analytics:**
    *   **Economic Context:** Visualize exactly how your street's price trends correlate with key Singapore economic indicators (HDB Resale Index, GDP, CPI, Unemployment, Rental Index) – an insight rarely found elsewhere.
    *   **Comparative Performance:** Our unique animated "race chart" dynamically compares your street's price performance against other popular streets in the same town over time.
    *   **Lease Decay Insights:** Understand the long-term value impact with clear visualizations of how remaining lease affects price per square meter.
    *   **P3M Moving Averages:** Smooth out short-term noise and understand underlying price movements with 3-month moving averages.

3.  **🤖 AI-Powered Context & Narrative:**
    *   **Generative Reports:** Leverage Google Generative AI to provide concise, readable analysis reports synthesizing property data, transactions, and amenities.
    *   **Integrated Sentiment:** News sentiment isn't just displayed; it's *quantified* and directly feeds into the valuation adjustment multiplier.

4.  **🔍 Transparency & Clarity:**
    *   **Feature Importance Breakdown:** Understand *exactly* which factors (Floor Area, Storey, Lease Year, etc.) are most influential in determining your property's valuation, according to the model.
    *   **Model Flow Visualization:** We provide insights into how our valuation model works, building trust and understanding.

5.  **✨ Modern & Intuitive Experience:**
    *   **Performance:** Built with Next.js 13 for a fast, responsive experience.
    *   **Rich Visualizations:** Utilizes Nivo and Recharts for interactive and insightful charts.
    *   **User-Friendly Design:** Employs Tailwind CSS and shadcn/ui for a clean, modern, and accessible interface across all devices.

## ✨ Features

*   **Valuation & Core Insights:**
    *   <kbd>📈</kbd> **Instant ML Valuation:** Accurate price estimation using Random Forest.
    *   <kbd>⚙️</kbd> **Dynamic Adjustments:** Valuation refined by Google Trends, News Sentiment, and Economic Multipliers.
    *   <kbd>🎯</kbd> **Feature Importance:** See what drives your property's value most.
    *   <kbd>📊</kbd> **Confidence Metrics:** Understand model accuracy (R²) and prediction intervals.
    *   <kbd>💲</kbd> **Price Per Square Meter:** Compare value density easily.
*   **Advanced Analytics:**
    *   <kbd>📉</kbd> **Historical Price Trends:** Visualize price movements for your street/flat type.
    *   <kbd>💹</kbd> **Economic Correlation Charts:** See links between property prices and macro indicators.
    *   <kbd>⏳</kbd> **P3M Moving Averages:** Understand short-term market momentum.
    *   <kbd>🏘️</kbd> **Animated Area Comparison:** Dynamic bar chart race comparing street performance.
    *   <kbd>📉</kbd> **Lease Decay Analysis:** Visualize the impact of remaining lease on value.
    *   <kbd>🔮</kbd> **AI Price Trend Forecasting:** Projections based on historical patterns.
*   **Market & Neighborhood Context:**
    *   <kbd>📰</kbd> **Top Stories & Sentiment:** Relevant property news with sentiment analysis.
    *   <kbd>📈</kbd> **Google Trends Integration:** See search interest correlation.
    *   <kbd>🗺️</kbd> **Nearby Amenities Mapping:** Interactive map showing schools, MRT, shops, parks with distances.
    *   <kbd>🔍</kbd> **Neighborhood Comparison:** Contextualize your property within its local market.
*   **User Experience:**
    *   <kbd>🎨</kbd> **Beautiful UI:** Modern, intuitive, responsive design (Tailwind CSS, shadcn/ui).
    *   <kbd>🗺️</kbd> **Interactive Maps:** Google Maps integration for spatial context.
    *   <kbd>📱</kbd> **Mobile Optimized:** Seamless experience on all devices.
    *   <kbd>💡</kbd> **Model Flow Explanation:** Understand the valuation process.

## 📈 Valuation Methodology: The ChatHDB Difference

Our valuation process is designed for accuracy and relevance in Singapore's dynamic HDB market:

1.  **Foundation: Random Forest Regression Model**
    *   **Training:** The model is trained on a vast dataset of historical HDB resale transactions.
    *   **Feature Engineering:** Key features are extracted and processed: Transaction Year/Month, Floor Area (sqm), Storey Range (categorized Low/Mid/High and averaged), Lease Commencement Year, and Calculated Remaining Lease.
    *   **Recency Weighting:** Recent transactions (last 6 months) are given significantly higher weight in the training data to ensure the model prioritizes current market dynamics.
    *   **Ensemble Prediction:** We run multiple prediction iterations with slight feature variations and use the median prediction for robustness against outliers.

2.  **Adjustment Layer: Incorporating Real-Time Signals**
    *   The **base valuation** from the Random Forest model is then refined using dynamically calculated multipliers:
        *   **Google Trends Multiplier (`M_trends`):** Analyzes the slope of recent (8 weeks) Google search trends for the area. A positive trend increases the multiplier (up to 1.03), a negative trend decreases it (down to 0.97).
        *   **News Sentiment Multiplier (`M_sentiment`):** Calculates the average sentiment score (-1 to +1) from the top 5 recent news articles related to the area. This average adjusts the multiplier (between 0.97 and 1.03).
        *   **Economic Trend Multiplier (`M_economic`):**
            *   Correlates the property's 3-month moving average price trend with key economic indices (HDB Resale, Rental, GDP, CPI, Unemployment).
            *   Identifies the index with the strongest correlation.
            *   Analyzes the recent trend direction of *that specific index*.
            *   Applies a multiplier (0.97 to 1.03) based on the correlation direction (positive/negative) and the index's trend.

3.  **Final Adjusted Valuation (`V_adjusted`)**
    *   The final valuation presented is calculated as:
        `V_adjusted = V_base × M_trends × M_sentiment × M_economic`
    *   This ensures the estimate reflects not only historical patterns but also current market interest, sentiment, and broader economic forces.

4.  **Supporting Metrics:**
    *   **Prediction Interval:** Provides a statistically derived range (e.g., 85%-120% of the estimate) where the actual transaction price is likely to fall.
    *   **Model Metrics:** R² score, Mean Absolute Error (MAE), and Mean Squared Error (MSE) are calculated to provide transparency on model performance.
    *   **Feature Importance:** Calculated using permutation and direct methods to show the relative influence of each input feature on the final price.

*(Note: While the README initially mentioned ARIMAX, the core implementation appears heavily focused on the Random Forest model with dynamic adjustments.)*

## 🛠️ Technology Stack

We use a modern, robust technology stack chosen for performance, developer experience, and analytical power:

*   **Frontend:**
    *   **Next.js 13.5+:** For performance (SSR/ISR), routing, and a great React framework experience.
    *   **React 18:** For building interactive user interfaces efficiently.
    *   **Tailwind CSS:** Utility-first CSS framework for rapid, consistent styling.
    *   **shadcn/ui:** Beautifully designed, accessible UI components built on Radix UI and Tailwind.
    *   **Framer Motion:** For smooth animations and transitions.
*   **Data Visualization:**
    *   **Nivo:** Rich, declarative charting library for React (used for Line, Bar, Pie charts).
    *   **Recharts:** Alternative powerful charting library.
*   **Mapping:**
    *   **Google Maps API (JS API Loader):** For interactive maps, geocoding (via OneMap), and amenity finding.
*   **Data Processing & ML:**
    *   **Papa Parse:** For efficient client-side CSV parsing of HDB data.
    *   **ml-random-forest:** JavaScript library for implementing the Random Forest Regression model.
*   **AI Integration:**
    *   **Google Generative AI / OpenAI:** For generating property analysis reports and potentially other AI-driven insights.
*   **State Management:** React Hooks (useState, useEffect, useMemo, useCallback).
*   **Utilities:** Lucide React (icons), Sonner (toast notifications).

## 📸 Screenshots

<div align="center">
  <img src="https://via.placeholder.com/800x450?text=ChatHDB+Homepage+Search" alt="Homepage" width="800"/>
  <p><em>Homepage with intuitive search functionality</em></p>

  <img src="https://via.placeholder.com/800x450?text=Dynamic+Valuation+Page" alt="Valuation Page" width="800"/>
  <p><em>Detailed Valuation with Dynamic Multipliers & Feature Importance</em></p>

  <img src="https://via.placeholder.com/800x450?text=Economic+Correlation+Chart" alt="Economic Correlation" width="800"/>
  <p><em>Unique Economic Performance Correlation Analysis</em></p>

  <img src="https://via.placeholder.com/800x450?text=Animated+Area+Comparison" alt="Area Comparison" width="800"/>
  <p><em>Animated Bar Chart Race comparing street performance</em></p>

  <img src="https://via.placeholder.com/800x450?text=Amenities+Map+View" alt="Amenities Map" width="800"/>
  <p><em>Interactive map showing property and nearby amenities</em></p>
</div>
*Note: Replace placeholder images with actual screenshots.*

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16.8.0 or higher recommended)
*   npm or Yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/chathdb.git
    cd chathdb
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env.local
        ```
    *   **Edit `.env.local`** and add your API keys.

4.  **Required API Keys:**
    *   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: For Google Maps features (Maps, Places). Ensure it's enabled for Maps JavaScript API, Places API, Geocoding API. **Crucially, restrict its usage to your domain(s) in the Google Cloud Console for security.**
    *   `GOOGLE_GENERATIVE_AI_API_KEY`: For Google's Generative AI features (e.g., property reports via Vertex AI or Gemini).
    *   `OPENAI_API_KEY`: (Optional, if using OpenAI for additional AI features).
    *   `SERPAPI_KEY`: Required for fetching Google Trends and Top Stories data via the backend API routes.

5.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

6.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## 🙏 Acknowledgements

*   **Data Sources:**
    *   Housing & Development Board (HDB): For providing essential public resale transaction data.
    *   OneMap Singapore: For address geocoding and base map information.
    *   SerpApi: For enabling access to Google Trends and News results.
    *   Economic data sourced from relevant Singapore government statistics portals (implicitly).
*   **Libraries & Tools:** Countless open-source libraries that make this project possible (Next.js, React, Nivo, Tailwind CSS, etc.).
*   **Inspiration:** Platforms like 99.co and PropertyGuru for setting the stage in Singapore's proptech scene.
*   **Contributors:** Anyone who helps improve ChatHDB!