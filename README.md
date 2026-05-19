# LibreHire

A Free & Open Source ethical recruiter tool. LibreHire analyses GitHub profiles and provides you the best matches according to your requirements and helps you reach out to them. You can also search up particular GitHub profiles and have them scored.

![LibreHire Interface](https://librehire.getxeneva.com/preview.png) *(Note: add actual preview image path here if available)*

## Features

- **Open Search**: Use natural language to search for specific developers (e.g., "rust devs in bangalore", "CTO of Zerodha"). The engine parses your intent, extracts required languages and locations, and fetches the best matches.
- **Precision Hunt**: A strict, AI-free mode where you explicitly define the job profile, tech stack, and location. Ideal for deterministic filtering when you know exactly what you need.
- **Profile Search**: Directly input a GitHub username to get a deep-dive analysis and an exact quality score for that developer.
- **Ethical Discovery**: We only analyze and display data that developers have publicly shared on GitHub themselves. No data brokers, no scraped private info.

## Search & Scoring Algorithm

The core of LibreHire is its deterministic scoring engine, designed to rank engineers based strictly on the technical merit of their public body of work.

1. **Fetching**: We use the GitHub Search API (`sort=followers`) to pull a high-quality initial pool of candidates matching the location and language constraints.
2. **Enrichment**: We pull the full profile, their last 60 active repositories, and their commit calendar.
3. **Semantic AI Analysis (Gemini/OpenAI)**: An LLM analyzes the repos and commits to verify if their work actually aligns with your search intent (e.g., distinguishing a "Python ML Researcher" from a "Python Web Dev").
4. **Deterministic Scoring (Max 100)**:
   - **Code Impact (35 pts)**: Based on stars, forks, and a depth-bonus (stars-per-repo) to reward high-impact projects.
   - **Influence (25 pts)**: A logarithmic scale of their followers and total stars, acting as social proof.
   - **Activity (25 pts)**: Evaluates recency of pushes, commit intensity (proxy via stars-per-repo), and repository diversity.
   - **Profile Signal (15 pts)**: Points awarded for completeness and reachability (email, bio, blog, company, location).
5. **Ranking**: Results are strictly ranked by their total Quality Score. Match relevance (full vs. partial match on the required languages) is shown as a UI badge but does not artificially inflate a lower-quality developer over a higher-quality one.

## Setup & Local Development

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Environment Variables

Create a `.env.local` file in the root of the project with the following keys:

```env
# GitHub Personal Access Token (Required for fetching profiles and repos without hitting strict rate limits)
# Create one at: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# AI Provider API Keys (You only need the one you intend to use)
# Gemini is the default fallback.
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional: Supabase configuration (if you are utilizing the database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/ayushmaanBora/libreHire.git
   cd libreHire
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

### Using the Config UI

Once the application is running, you can click "Configure Engine" in the top right to temporarily inject your API keys or change the AI model directly from the browser without needing a `.env` file.

## License

Open Source. Use ethically.
