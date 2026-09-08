# Strategy Document Templates

Use these templates when writing the files into `<docs_dir>/strategy/`. Ensure cross-links between the files are preserved.

---

## 1. `README.md` (Strategy Overview)

```markdown
# Strategy Overview

> **Summary**: Connects the 10,000-foot mission and vision down to measurable goals and executable roadmap initiatives.

| Tier | Core Question | Definition / Summary | Document |
| :--- | :--- | :--- | :--- |
| **Mission** | *What are we trying to achieve?* | <1-2 sentence core purpose> | [mission.md](./mission.md) |
| **Vision** | *What does the world look like when we win?* | <1-2 sentence future state> | [vision.md](./vision.md) |
| **Strategy** | *What is our plan to win?* | <3-5 strategic pillars/bets> | [strategy.md](./strategy.md) |
| **Goals** | *How will we measure progress?* | **North Star**: <Metric><br>**Key Milestones**: <Targets> | [goals.md](./goals.md) |
| **Roadmap** | *What do we need to build to get there?* | <Summary of Now / Next / Later themes> | [roadmap.md](./roadmap.md) |

## Alignment Flow

```
Mission (Why we exist)
  └── Vision (Where we want to be)
        └── Strategy (3–5 concrete bets to win)
              └── Goals (How we measure progress & North Star)
                    └── Roadmap (What we build, prioritized by ROI)
                          └── Tasks (Atomic units of work)
```

## Strategic Pillars at a Glance

1. **<Pillar 1>**: <One-line summary>
2. **<Pillar 2>**: <One-line summary>
3. **<Pillar 3>**: <One-line summary>
```

---

## 2. `mission.md`

```markdown
# Mission

## Statement

> "<Concise, memorable mission statement>"

## Why We Exist

- **Core Problem**: <The fundamental pain point or opportunity we exist to solve>
- **Target Audience / Beneficiaries**: <Who specifically benefits from our work>
- **Core Value Delivered**: <What unique value or change we create for them>

## Principles & Core Values

- **<Principle 1>**: <Explanation of how this guides decision making>
- **<Principle 2>**: <Explanation>
- **<Principle 3>**: <Explanation>

## Durable Boundaries

- What this mission **is**: <In-scope essence>
- What this mission **is not**: <Explicit out-of-scope distractions>
```

---

## 3. `vision.md`

```markdown
# Vision

## Statement

> "<Inspirational picture of the desired end state>"

## The Future State

When our mission is achieved, the world and our users' experience look fundamentally different:

### Before vs. After

| Dimension | Today (Before) | Future State (After) |
| :--- | :--- | :--- |
| **User Experience** | <Current state friction/pain> | <Transformed future state> |
| **Workflow / Capability** | <Current limitation> | <New superpower or ease> |
| **Market / System Impact** | <Current industry/system baseline> | <Transformed standard> |

## Long-Term Horizon

- **Horizon (3–5 Years)**: <What success looks like at scale>
- **Signature Experience**: <A concrete story or snapshot of a user interacting in the envisioned future>
```

---

## 4. `strategy.md`

```markdown
# Strategy

## Plan to Win

<Concise narrative explaining how we achieve our vision through distinct leverage points and sequencing.>

## Strategic Pillars (3–5 Core Bets)

### 1. <Pillar Title>
- **Thesis**: If we <action/investment>, then <expected customer/business outcome>.
- **Why this bet**: <Evidence, leverage, or unfair advantage>.
- **Key Initiatives**: <High-level capabilities needed>.

### 2. <Pillar Title>
- **Thesis**: If we <action/investment>, then <expected outcome>.
- **Why this bet**: <Rationale>.
- **Key Initiatives**: <High-level capabilities needed>.

### 3. <Pillar Title>
- **Thesis**: If we <action/investment>, then <expected outcome>.
- **Why this bet**: <Rationale>.
- **Key Initiatives**: <High-level capabilities needed>.

## Trade-offs & Non-Goals

Strategy is defined by what we choose *not* to do:

- ❌ **Non-Goal 1**: <What we are deliberately not doing, and why>
- ❌ **Non-Goal 2**: <What we are deliberately not doing, and why>
- ⚖️ **Key Trade-off**: <E.g. We prioritize speed and simplicity over customization for power users.>
```

---

## 5. `goals.md`

```markdown
# Goals & Metrics

## North Star Metric

- **Metric**: `<Primary Metric Name>`
- **Definition**: <Exact calculation or event definition>
- **Why it matters**: <Why this best reflects sustainable value delivered to the user>
- **Current Baseline**: `<Current value if known or TBD>`
- **Target**: `<Target value & timeframe>`

## Supporting Metrics by Strategic Pillar

### Pillar 1: <Pillar Name>
- **Primary Metric**: <Metric name and target>
- **Leading Indicator**: <Early signal metric>
- **Guardrail Metric**: <Metric that must not degrade (e.g. latency, error rate, satisfaction)>

### Pillar 2: <Pillar Name>
- **Primary Metric**: <Metric name and target>
- **Leading Indicator**: <Early signal metric>
- **Guardrail Metric**: <Metric that must not degrade>

### Pillar 3: <Pillar Name>
- **Primary Metric**: <Metric name and target>
- **Leading Indicator**: <Early signal metric>
- **Guardrail Metric**: <Metric that must not degrade>

## Milestone Targets

| Timeframe | Key Milestone | Target Outcome |
| :--- | :--- | :--- |
| **Phase 1 (Now)** | <Milestone 1> | <Measurable target> |
| **Phase 2 (Next)** | <Milestone 2> | <Measurable target> |
| **Phase 3 (Later)** | <Milestone 3> | <Measurable target> |
```

---

## 6. `roadmap.md`

```markdown
# Roadmap

> Prioritized by ROI: expected impact on **[Goals](./goals.md)** vs. implementation effort.

## Overview & Horizon View

### 🟢 Now (Current Focus / Phase 1)
- **<Initiative 1>**: <Description>
  - *Strategic Pillar*: [Pillar 1](./strategy.md#1-pillar-title)
  - *Target Goal Impact*: <Specific metric moved>
  - *Effort vs Impact*: <Low/Med/High effort → High impact>
- **<Initiative 2>**: <Description>
  - *Strategic Pillar*: [Pillar 2](./strategy.md#2-pillar-title)
  - *Target Goal Impact*: <Specific metric moved>

### 🟡 Next (Phase 2)
- **<Initiative 3>**: <Description>
  - *Strategic Pillar*: [Pillar 1 or 3](./strategy.md)
  - *Dependencies*: Requires <Initiative 1>
- **<Initiative 4>**: <Description>
  - *Strategic Pillar*: [Pillar 2](./strategy.md)

### ⚪ Later (Phase 3 / Horizon Vision)
- **<Initiative 5>**: <Description>
- **<Initiative 6>**: <Description>

## Prioritization Rationale

| Initiative | Strategic Value | Goal Impact | Estimated Complexity | Priority Score |
| :--- | :--- | :--- | :--- | :--- |
| <Initiative 1> | High | North Star | Medium | **P0** |
| <Initiative 2> | High | Pillar 2 Metric | Low | **P0** |
| <Initiative 3> | Med | Pillar 1 Metric | High | **P1** |
```
