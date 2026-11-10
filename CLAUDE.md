# Wysa Chat Revamp – Working Prototype

Full requirements: [docs/PRD.md](docs/PRD.md).

## UI source of truth: Figma (do not deviate)

- Main flow: https://www.figma.com/design/lIFjMFYtHlL9B7fmEhDJWd/Chat-Revamp?node-id=523-6574
  (Home, Chat thread, Voice-note recorder, Voice mode: Idle / Wysa Speaking / Listening / Reconnecting, Choose a Voice)
  Offline snapshot: [docs/figma/main-flow-523-6574.png](docs/figma/main-flow-523-6574.png). Always re-pull live from Figma before building; the snapshot is only a quick reference.
- Loader → Home transition (code layer, reuse its source): node `269-1307`
- Choose a Voice: node `526-8562`

Rules:
- Every screen must match the Figma frames exactly: layout, spacing, colors, typography, icons, corner radii, glow/gradient effects and copy. Do not invent, restyle or "improve" UI.
- Before building or changing any screen, pull its design context and a screenshot through the Figma MCP, and compare the result against the screenshot afterwards.
- Use the design's own tokens/values; don't substitute approximations.
- Download all assets locally; no Figma asset URLs in code.
- Frame size is 412 × 917.
- Where the PRD describes a state that has no Figma frame (e.g. Thinking, Paused, Reconnecting), build it from existing Figma components and styles only, and flag it for design review.
- If the PRD and Figma conflict on visuals, Figma wins; raise the conflict rather than guessing.
