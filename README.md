# LibreHire

**LibreHire** is an open-source tool designed to help technical recruiters and engineering managers discover skilled developers on GitHub. It replaces expensive, closed-source recruitment platforms by providing a transparent, self-hosted alternative that puts the user in control of their own data and API keys.

---

## 🔍 Why LibreHire?

The technical recruitment industry is often dominated by tools that charge upwards of $200/month per seat and rely on opaque, "black-box" databases of developer data. 

LibreHire takes a different approach:
- **Ethical Data Sourcing**: We do not scrape, buy, or sell private developer data. Everything you see is fetched in real-time from the public GitHub API (v3/GraphQL) using your own credentials.
- **Cost-Efficient**: LibreHire is free to use. You only pay for what you use via your own LLM API keys (Gemini, OpenAI, or Anthropic).
- **Privacy-First**: No data is stored on our servers. Your API keys and GitHub PAT tokens stay in your browser's local storage.
- **Semantic Analysis**: Instead of simple keyword matching, we use Large Language Models (LLMs) to analyze a developer's actual contributions and technical depth.

---

## ✨ Core Features

### Semantic Talent Discovery
LibreHire uses AI to understand the technical intent behind a developer's work. It analyzes repository descriptions, project topics, and bios to identify specific expertise (e.g., finding a "Rust developer who builds networking protocols" rather than just a "Rust developer").

### Transparent Scoring Algorithm
Our ranking system is open and objective, weighting different signals to find high-impact engineers:
- **Semantic Match (30%)**: How well their projects align with your search query.
- **Code Impact (20%)**: Stars and forks on original (non-forked) repositories.
- **Impact Factor (20%)**: A logarithmic follower-based bonus to recognize established community maintainers.
- **Activity (20%)**: Recent commit frequency and repository updates.
- **Profile Signals (10%)**: Availability of contact info, bios, and technical social presence.

### Precise Location & Stack Filtering
We enforce strict location filtering and exact tech-stack alignment (e.g., distinguishing between C and C++) to ensure you find exactly who you are looking for.

---

## 🚀 Getting Started

LibreHire is a Next.js application that runs entirely on your machine.

### Prerequisites
- **Node.js**: Version 18 or higher.
- **GitHub PAT**: A Personal Access Token (no special scopes needed for public data).
- **AI API Key**: A key from Google (Gemini), Anthropic (Claude), or OpenAI.

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/ayushmaanBora/libreHire.git
   cd libreHire
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Configuration:**
   Open [http://localhost:3000](http://localhost:3000) and click the **Settings** icon to enter your API keys. These are saved locally in your browser.

---

## 🤝 Contributing

As a FOSS project, we welcome all contributions! Whether it's fixing a bug, adding a feature, or improving documentation, please feel free to open an issue or submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
