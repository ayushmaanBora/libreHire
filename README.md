# 🚀 LibreHire

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![GitHub API](https://img.shields.io/badge/GitHub_API-v3-181717?style=for-the-badge&logo=github)](https://docs.github.com/en/rest)

**LibreHire** is an elite, AI-powered recruitment engine designed to identify niche technical talent with surgical precision. By leveraging Large Language Models (LLMs) and deep semantic analysis of the global developer ecosystem, LibreHire moves beyond simple keyword matching to understand the *intent* and *impact* of a developer's work.

---

## ✨ Key Features

### 🧠 Deep Semantic Search
LibreHire doesn't just look for "React" in a bio. It performs a real-time semantic analysis of a developer's **actual repositories, project descriptions, and topics**. It understands the difference between a developer who built a todo app and one who built a high-performance blockchain indexing engine.

### ⚖️ The "Legend-Aware" Scoring Engine
Our proprietary scoring algorithm (100 pts max) is balanced to favor depth and impact over raw commit volume:
- **Semantic Match (30 pts)**: AI-driven evaluation of project alignment.
- **Impact Bonus (20 pts)**: A logarithmic "Follower Factor" that ensures legendary maintainers (like Linus Torvalds) achieve their deserved 95+ scores.
- **Activity Recency (20 pts)**: Recent pushes and contributions.
- **Code Quality (20 pts)**: Star counts and fork metrics across original repos.
- **Profile Signals (10 pts)**: Verified email, rich bios, and professional social presence.

### 📍 Deterministic Location Filtering
Strict, zero-noise location filtering. If you search for developers in Madagascar, you get developers in Madagascar. No random fallbacks, no "close enough" results.

### 📊 Real-time Enrichment
- **365-Day Heatmaps**: Instant fetch of full contribution calendars via GraphQL.
- **Automated AI Assessments**: Every candidate is evaluated by an LLM that writes a specific, 2-3 sentence technical review of their unique strengths.
- **Byte-Weighted Language Bars**: Precise breakdown of a developer's primary languages based on total bytes written across their top 15 repositories.

---

## 🛠️ Technology Stack

- **Frontend/Backend**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Models**: Gemini 2.0 Flash / Claude 3.5 Haiku / Llama 3.3
- **Data Source**: GitHub REST API & GraphQL API

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- A GitHub Personal Access Token (PAT)
- An API Key for Gemini, Claude, or an OpenAI-compatible provider.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ayushmaanBora/libreHire.git
   cd libreHire
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file (or use the in-app settings UI):
   ```env
   # No server-side envs required - all keys are managed in the secure client-side UI
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🔒 Security & Privacy

**Zero-Persistence API Keys**: LibreHire stores your GitHub PAT and LLM keys exclusively in your browser's `localStorage`. Your keys are never uploaded to our servers, never stored in a database, and never shared. The application is completely stateless and respects your technical sovereignty.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ by [Ayushmaan Bora](https://github.com/ayushmaanBora)
