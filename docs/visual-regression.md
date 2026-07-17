# Visual regression workflow

Summary: Browser viewport matrix, screenshot naming, comparison, and review rules for user-facing changes.
Use when: Changing layouts, typography, responsive behavior, product images, navigation, forms, reports, or exam workspaces.
Owner: Frontend quality reviewer.
Last verified: 16 July 2026.
Current state: Manual browser capture is required; automated Playwright baselines remain a queued task.
Storage: Put temporary captures outside source; commit approved baselines only when the harness lands.

Validate at 336×853, 390×844, 768×1024, 1280×800, and 1440×900. Cover landing, onboarding, practice, both paper workspaces, results, progress, and settings as applicable.

For each changed page, capture stable states with animations disabled and deterministic data. Compare overflow, clipping, text wrapping, touch target size, focus, keyboard navigation, loading/error/empty states, and fixed navigation. An image diff is evidence, not approval; a human or visual-review agent must inspect semantic/layout quality.

Never update baselines before understanding the difference. Record intentional changes and unexpected diffs in the worksheet.

