# FERMIUM SMP — Technical Minecraft Collective Portal

An engineered, high-performance web experience designed for **Fermium SMP**, a Minecraft Technical Survival Multiplayer community.

Built with **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS 3**, **GSAP**, **Lucide React**, and **React Router**.

---

## 📐 Design Philosophy & Technical Framework

The interface departs from generic gaming templates by adopting an authentic **engineered command center** aesthetic inspired by precision architectural blueprints and server telemetry:

- **Monochrome Foundation**: `#0B0D10` (Base) and `#101216` (Main) surfaces with `#181C23` elevation panels.
- **Surgical Orange Accents**: `#F08A36` reserved for critical telemetry, interactive highlights, and active states.
- **Role Border Hierarchy**:
  - **Server Owners** (`jenktland3`, `redpl4yer`, `poncher`, `drp1n`, `ohluck_`, `supercece9`): Light blue `#60A5FA` (`border-blue-400`).
  - **Members** (`lollo235_`): Light azure `#38BDF8` (`border-sky-300`).
  - **Trial** (`manolo006`): Yellow `#FACC15` (`border-yellow-400`).
- **Typography Matrix**:
  - Headings: `Space Grotesk`
  - Body: `Inter`
  - Technical Callouts & Telemetry: `JetBrains Mono`

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Compile production bundle for GitHub Pages
npm run build

# Preview production build locally
npm run preview
```

---

## 🚀 GitHub Pages Deployment

The build is configured with `base: './'` in `vite.config.ts` and `HashRouter` in `src/App.tsx` for zero-configuration static hosting on GitHub Pages.

---

## 📄 License & Disclaimer

&copy; Fermium SMP. All rights reserved.

*Fermium SMP is an independent technical Minecraft collective. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.*
