# LibreHire

A Free & Open Source ethical recruiter tool. LibreHire analyses GitHub profiles and provides you the best matches according to your requirements and helps you reach out to them. You can also search up particular GitHub profiles and have them scored.

![LibreHire Interface](./preview.png)
*(To add an image here, simply place an image named `preview.png` in the root of the repository, and it will be rendered above.)*

## Overview

LibreHire is a search engine and scoring tool designed to find the world's best developers based on what they've actually built. Traditional recruitment platforms rely on data brokers and scraped keyword-stuffed resumes. LibreHire takes a different approach: it strictly analyzes **real commit data**, **byte-weighted language proficiency**, and **verified public contributions** directly from GitHub.

It is entirely open-source, does not rely on opaque proprietary databases, and respects developer privacy by only showing what developers have chosen to make public.

## Features

- **Open Search**: Use natural language to search for specific developers (e.g., "rust devs in bangalore", "CTO of Zerodha"). The AI engine parses your intent, extracts the required languages and locations, and fetches the best matches.
- **Precision Hunt**: A strict, AI-free search mode where you explicitly define the job profile, tech stack, and location. Ideal for deterministic, high-volume filtering when you know exactly what you need.
- **Profile Search**: Directly input a GitHub username to get a deep-dive analysis and an exact quality score for a specific developer.
- **Ethical Discovery**: We only analyze and display data that developers have publicly shared on GitHub themselves. No data brokers, no scraped private info.

## Search & Scoring Algorithm

The core of LibreHire is its deterministic scoring engine. It is designed to rank engineers based strictly on the technical merit of their public body of work, on a scale of 0 to 100.

1. **Fetching Candidates**: We use the GitHub Search API (`sort=followers`) to pull a high-quality initial pool of candidates matching the required location and language constraints.
2. **Deep Enrichment**: For the top candidates, we pull their full profile, their last 60 active repositories, and their commit calendar.
3. **Semantic AI Analysis**: An LLM (Gemini/OpenAI) analyzes the candidates' repositories and commit history to verify if their work actually aligns with your search intent. It also filters out false positives (e.g., when searching for a specific person, it verifies the identity).
4. **Deterministic Scoring (Max 100)**:
   - **Code Impact (35 pts)**: Based on stars, forks, and a depth-bonus (stars-per-repo) to reward high-impact projects instead of just volume.
   - **Influence (25 pts)**: A logarithmic scale of their followers and total stars, acting as social proof of their contributions.
   - **Activity (25 pts)**: Evaluates recency of pushes, commit intensity, and repository diversity.
   - **Profile Signal (15 pts)**: Points awarded for completeness and reachability (email, bio, blog, company, location).
5. **Ranking**: Results are strictly ranked by their total Quality Score. This ensures that a genuinely high-impact developer will always rank above a weaker developer, regardless of AI grouping.

## Security & Privacy

**LibreHire is 100% safe to use.** 
Your API keys (GitHub PAT, Gemini, OpenAI) are strictly used to make requests directly to the respective APIs. 
- Keys entered via the UI are stored locally in your browser (`localStorage`) and sent to the local server purely in memory for the duration of the request.
- The application does not contain a database that stores your keys.
- Keys are never logged, leaked to the client response, or shared with third-party tracking services.

## Setup & Local Development

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### 1. Configuration (The Easy Way)

You do not need to create `.env` files if you are just running the application for yourself. 

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/ayushmaanBora/libreHire.git
   cd libreHire
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser to `http://localhost:3000`.
4. Click **Configure Engine** in the top right corner of the UI.
5. Paste your GitHub Personal Access Token and your preferred AI API key directly into the settings. These are saved locally to your browser and you can start searching immediately!

### 2. Configuration (For Hosting / Setting Defaults)

If you intend to host LibreHire publicly or want to set default API keys so users don't have to enter their own, you can use environment variables.

Create a `.env.local` file in the root of the project:

```env
# GitHub Personal Access Token (Required for fetching profiles and repos)
# Create one at: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# AI Provider API Keys
# Gemini is the default. You only need the key for the provider you want to use.
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional: Supabase configuration (if you are utilizing the database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## License

Open Source. Use ethically.
