#!/usr/bin/env python3
"""Aesthetic architecture + flowchart diagrams for the FleetOps report.
Light, modern, hand-designed look — soft fills, rounded cards, clear color language.
"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import matplotlib.patheffects as pe

OUT = "/home/user/zoho-linux-fleet-manager/fleetops.report/img"

# ---- modern, slightly muted palette (not neon, looks designed) ----
INK    = "#1f2937"   # near-black slate for text
SUBINK = "#6b7280"   # muted grey
PAPER  = "#ffffff"
PANEL  = "#f8fafc"   # light panel bg

# accent families: (border, fill, text)
BLUE   = ("#3b6fd4", "#e8f0fc", "#1e3a8a")
GREEN  = ("#2f9e6f", "#e6f6ee", "#155e44")
AMBER  = ("#d08a1e", "#fdf3e3", "#7a4d09")
RED    = ("#d35454", "#fdecec", "#8a2b2b")
PURPLE = ("#7c5cc4", "#f1ecfb", "#4c2f8a")
SLATE  = ("#64748b", "#eef1f5", "#334155")

plt.rcParams["font.family"] = "DejaVu Sans"

soft_shadow = [pe.withSimplePatchShadow(offset=(1.4, -1.4), shadow_rgbFace="#c9d2de", alpha=0.5)]


def card(ax, x, y, w, h, title, sub=None, accent=BLUE, title_size=11, sub_size=8.4,
         radius=0.10, shadow=True):
    border, fill, txt = accent
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad=0.015,rounding_size={radius}",
                         linewidth=1.6, edgecolor=border, facecolor=fill, zorder=3)
    if shadow:
        box.set_path_effects(soft_shadow)
    ax.add_patch(box)
    # left accent tab
    tab = FancyBboxPatch((x, y), 0.10, h,
                         boxstyle=f"round,pad=0.0,rounding_size={radius}",
                         linewidth=0, facecolor=border, zorder=4)
    ax.add_patch(tab)
    cy = y + h / 2
    if sub:
        ax.text(x + w / 2 + 0.04, cy + h * 0.16, title, ha="center", va="center",
                fontsize=title_size, color=txt, weight="bold", zorder=5)
        ax.text(x + w / 2 + 0.04, cy - h * 0.22, sub, ha="center", va="center",
                fontsize=sub_size, color=SUBINK, zorder=5)
    else:
        ax.text(x + w / 2 + 0.04, cy, title, ha="center", va="center",
                fontsize=title_size, color=txt, weight="bold", zorder=5)


def pill(ax, x, y, text, accent):
    border, fill, txt = accent
    p = FancyBboxPatch((x, y), 0.02, 0.02, boxstyle="round,pad=0.16,rounding_size=0.16",
                       linewidth=1.2, edgecolor=border, facecolor=fill, zorder=6)
    ax.add_patch(p)
    ax.text(x, y, text, ha="center", va="center", fontsize=8, color=txt,
            weight="bold", zorder=7)


def arrow(ax, x1, y1, x2, y2, color=SUBINK, label=None, lw=1.8, ls="-", rad=0.0, loff=(0, 0)):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=14,
                        color=color, lw=lw, linestyle=ls, zorder=2,
                        connectionstyle=f"arc3,rad={rad}")
    ax.add_patch(a)
    if label:
        mx, my = (x1 + x2) / 2 + loff[0], (y1 + y2) / 2 + loff[1]
        ax.text(mx, my, label, ha="center", va="center", fontsize=7.8,
                color=color, style="italic", zorder=8,
                bbox=dict(boxstyle="round,pad=0.25", fc=PAPER, ec="none", alpha=0.95))


# ════════════════════════ DIAGRAM 1: ARCHITECTURE ════════════════════════
fig, ax = plt.subplots(figsize=(11, 6.6))
fig.patch.set_facecolor(PAPER)
ax.set_facecolor(PAPER)
ax.set_xlim(0, 12)
ax.set_ylim(0, 7.4)
ax.axis("off")

ax.text(6, 7.0, "FleetOps — System Architecture", ha="center", fontsize=15.5,
        color=INK, weight="bold")
ax.text(6, 6.55, "push-based agents  ·  central control plane  ·  standard observability",
        ha="center", fontsize=9.5, color=SUBINK, style="italic")

# --- zone backgrounds (very light) ---
for zx, zw, zc, zlabel in [(0.3, 3.0, "#f4f8f4", "LINUX FLEET"),
                           (3.9, 3.6, "#eef2fb", "CONTROL PLANE"),
                           (8.0, 3.7, "#f7f4fb", "OBSERVABILITY & UI")]:
    z = FancyBboxPatch((zx, 0.5), zw, 5.4, boxstyle="round,pad=0.02,rounding_size=0.12",
                       linewidth=0, facecolor=zc, zorder=0)
    ax.add_patch(z)
    ax.text(zx + zw / 2, 5.55, zlabel, ha="center", fontsize=8.5, color=SUBINK,
            weight="bold", zorder=1)

# fleet nodes
for ny, name in [(4.35, "node-01"), (3.25, "node-02"), (2.15, "node-03")]:
    card(ax, 0.55, ny, 2.5, 0.82, name, sub="agent.sh", accent=GREEN, title_size=10)
ax.text(1.8, 1.35, "pure bash · reads /proc\nno inbound ports (NAT-safe)",
        ha="center", fontsize=7.6, color=SUBINK, style="italic")

# control plane internals
card(ax, 4.15, 4.45, 3.1, 0.72, "Hono REST API", sub="Bun runtime", accent=BLUE, title_size=10)
card(ax, 4.15, 3.55, 3.1, 0.72, "Alert + Health Engine", sub="thresholds · heartbeat", accent=AMBER, title_size=10)
card(ax, 4.15, 2.65, 3.1, 0.72, "Prometheus Exporter", sub="/api/metrics/prometheus", accent=RED, title_size=10)
card(ax, 4.15, 1.45, 3.1, 0.78, "SQLite / Turso", sub="time-series store", accent=SLATE, title_size=10)

# presentation / observability
card(ax, 8.25, 4.45, 3.2, 0.85, "Web Dashboard", sub="React + Tailwind", accent=GREEN, title_size=10.5)
card(ax, 8.25, 3.25, 3.2, 0.85, "Prometheus", sub="scrape · store TSDB", accent=RED, title_size=10.5)
card(ax, 8.25, 2.05, 3.2, 0.85, "Grafana", sub="dashboards", accent=AMBER, title_size=10.5)

# arrows
arrow(ax, 3.05, 3.7, 4.15, 4.6, color=GREEN[0], label="report 15s", loff=(0, 0.22))
arrow(ax, 4.15, 3.5, 3.05, 2.6, color=BLUE[0], label="commands", loff=(0, -0.22))
arrow(ax, 5.7, 2.65, 5.7, 2.23, color=SLATE[0])
arrow(ax, 7.25, 4.85, 8.25, 4.9, color=GREEN[0], label="REST", loff=(0, 0.22))
arrow(ax, 7.25, 2.95, 8.25, 3.55, color=RED[0], label="scrape 15s", loff=(0, 0.22))
arrow(ax, 9.85, 3.25, 9.85, 2.9, color=AMBER[0], label="query", loff=(0.55, 0))
arrow(ax, 8.6, 2.9, 8.6, 4.45, color=AMBER[0], ls=(0, (3, 2)), label="embed", loff=(-0.55, 0), rad=-0.0)

fig.savefig(f"{OUT}/diagram-architecture.png", dpi=160, bbox_inches="tight", facecolor=PAPER)
plt.close(fig)


# ════════════════════════ DIAGRAM 2: LIFECYCLE FLOWCHART ════════════════════════
fig, ax = plt.subplots(figsize=(8.6, 10.2))
fig.patch.set_facecolor(PAPER)
ax.set_facecolor(PAPER)
ax.set_xlim(0, 8.6)
ax.set_ylim(0, 11.6)
ax.axis("off")

ax.text(4.3, 11.15, "Node Lifecycle", ha="center", fontsize=16, color=INK, weight="bold")
ax.text(4.3, 10.7, "Onboard  →  Report  →  Control", ha="center", fontsize=11,
        color=SUBINK, style="italic")

steps = [
    ("1", "Generate one-time token", "dashboard → Onboarding", BLUE),
    ("2", "Run agent on the node", "curl … | bash  --token flt_xxx", GREEN),
    ("3", "Agent registers", "POST /agent/register  · sends host facts", GREEN),
    ("4", "Control plane validates token", "creates node record", BLUE),
    ("5", "Agent reports every 15s", "CPU · mem · disk · load · uptime", GREEN),
    ("6", "Engine stores & evaluates", "thresholds + heartbeat freshness", AMBER),
    ("7", "Queued commands returned", "agent runs allow-listed action", RED),
    ("8", "Dashboard & Grafana visualise", "live state · charts · alerts", PURPLE),
]

x = 1.55
w = 5.5
h = 0.92
top = 9.55
gap = 1.18

for i, (num, title, sub, accent) in enumerate(steps):
    y = top - i * gap
    card(ax, x, y, w, h, title, sub=sub, accent=accent, title_size=11, sub_size=8.2)
    # number badge
    border, fill, txt = accent
    c = Circle((x - 0.0, y + h / 2), 0.30, facecolor=border, edgecolor=PAPER,
               linewidth=2, zorder=6)
    ax.add_patch(c)
    ax.text(x - 0.0, y + h / 2, num, ha="center", va="center", fontsize=11,
            color="white", weight="bold", zorder=7)
    if i < len(steps) - 1:
        arrow(ax, x + w / 2, y, x + w / 2, y - 0.26, color="#9aa6b5", lw=2.0)

# alert side-note on step 6
y6 = top - 5 * gap
ax.annotate("breach → raise alert", xy=(x + w, y6 + h / 2), xytext=(x + w + 0.15, y6 + h / 2),
            ha="left", va="center", fontsize=8.2, color=RED[0], style="italic",
            arrowprops=dict(arrowstyle="-|>", color=RED[0], lw=1.4))

# loop-back hint on step 5 (continuous reporting)
y5 = top - 4 * gap
ax.annotate("", xy=(x, y5 + 0.18), xytext=(x - 0.55, y5 + 0.18),
            arrowprops=dict(arrowstyle="-|>", color=GREEN[0], lw=1.4,
                            connectionstyle="arc3,rad=0.0"))
ax.text(x - 0.62, y5 + 0.18, "loop", ha="right", va="center", fontsize=7.8,
        color=GREEN[0], style="italic")

fig.savefig(f"{OUT}/diagram-flow.png", dpi=160, bbox_inches="tight", facecolor=PAPER)
plt.close(fig)

print("aesthetic diagrams generated")
