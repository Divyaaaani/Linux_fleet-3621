# Design — Linux Fleet Manager

NOC / observability console aesthetic. Dark, dense, technical. Looks like real infra tooling, not a SaaS landing page.

## Color
- Base: `#0a0e14` (near-black blue), surface `#111722`, border `#1e2733`
- Text: `#e6edf3` primary, `#8b98a9` muted
- Accent (primary): `#3fb950` green = healthy / online
- Status: green `#3fb950` healthy, amber `#d29922` degraded, red `#f85149` down/critical, blue `#388bfd` info
- Mono accent: `#58a6ff` for IDs, IPs, code

## Typography
- Display/body: `Inter` via system stack fallback... use **Geist** is overused — use `IBM Plex Sans`
- Mono: `JetBrains Mono` for IPs, hostnames, metrics, tokens, commands
- Hierarchy through weight + mono contrast

## Layout
- Left sidebar nav (fixed), main content area
- Dense data tables, status pills, sparkline metric cards
- Grid of stat cards on overview
- Terminal-style command output blocks

## Motion
- Subtle: status pulse on online nodes, fade-in on load
- Live updating metrics (polling every few seconds)

## Vibe
Grafana + Vercel dashboard + Linux terminal. Serious, correct, observable.
