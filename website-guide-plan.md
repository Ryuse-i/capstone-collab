# Website Guide Plan

## 1. Summary
The supplied code shows a settings area in a capstone project-collaboration app, not the full website, so this plan covers Settings only. It has three sections—Account, Appearance, and leader-only Project Settings—with mostly familiar, low-complexity controls. The main sources of avoidable confusion are that Project Settings is role-restricted, the email field is read-only, and save/reset behavior is not explained; actual usage frequency and user confidence are unknown. Start with a short, searchable checklist and clearer in-product guidance rather than a full-site tour or lengthy video.

## 2. Function inventory

Frequency and risk ratings are estimates from the visible interface, not analytics or user research. “Easier to show than explain” rates how suitable a quick visual demonstration is.

| Function | Complexity | Frequency | Importance | Risk | Easier to show than explain | Recommended guide | Reason |
|---|---|---|---|---|---|---|---|
| Open Settings and choose a section | Low | Medium | Medium | Low | High | Tooltip | The Settings entry and three labeled tabs are straightforward; a first-use cue can point users to the right section without interrupting them. |
| Update account name; view email | Low | Medium | Medium | Medium | High | Checklist | Users can edit first and last name, then save or reset. Email is displayed but read-only, so explicitly say it cannot be changed here. |
| Change dashboard theme | Low | Low | Low | Low | High | Tooltip | Light, Dark, and System are shown as visual previews and take effect on selection. A short label is more useful than a separate tutorial. |
| Edit project name and description (project leaders only) | Low | Low | High | Medium | High | Checklist | The form is simple, but changes project-identifying information and is only available to project leaders. Explain the audience, required name, save, and reset behavior. |
| Save or reset edits | Low | Medium | High | Medium | High | Tooltip | Save is enabled only when there are valid unsaved changes; Reset restores the loaded values. A brief explanation prevents uncertainty about whether edits were applied. |

## 3. First-visit tour
Keep this optional and limited to the Settings area; the available code does not establish a site-wide onboarding flow.

1. **Open Settings** from the app navigation.
2. **Choose Account** to update first and last name; point out that email is view-only.
3. **Choose Appearance** to select Light, Dark, or System; selection applies immediately.
4. **For project leaders, choose Project Settings** to edit the shared project name or description.
5. **Save changes or reset** to discard unsaved edits; show the success or error confirmation after saving.

## 4. Rollout plan
1. **First — Clarify the interface.** Add concise helper text next to the read-only email and the project form’s save/reset controls. Correct the Settings page intro: the current text mentions email preferences, but the inspected sections provide profile, project details, and theme settings.
2. **Second — Publish a compact checklist.** Add a short Settings help article or checklist covering Account, Appearance, Project Settings access, and save/reset behavior. Link it from the Settings page or help menu.
3. **Third — Validate and refine.** Ask a few students and project leaders to complete the relevant tasks, note confusion and completion, then decide whether a dismissible first-use tooltip is needed. Avoid building a full tour unless testing shows users still cannot find these controls.

## 5. Simplify or hide
- **Clarify rather than hide Project Settings.** Keep it visible to project leaders and hidden from other roles as it is now; explain the role restriction in the guide so users do not mistake it for a missing feature.
- **Label email as read-only.** Keep the field disabled if editing email is not supported here, but add “Email address (read-only)” or nearby helper copy.
- **Replace the misleading Settings introduction.** Suggested copy: “Manage your account, project details, and dashboard appearance.”
- **Do not add another guide for basic theme selection.** The visual previews already make the choice easy to understand; an inline hint is sufficient.

## 6. Draft content
**Top-priority guide: Project Settings checklist** (shown only to project leaders, alongside the form).

**Title:** Update your project details

**Intro:** “These details help identify your project.”

**Checklist and exact on-screen wording:**

1. “Enter a project name. A project name is required before you can save.”
2. “Add or update the description so members know what the project is about. This field is optional.”
3. “Select **Save changes** to apply your edits. You’ll see a confirmation when they’re saved.”
4. “Select **Reset** to discard your unsaved edits and restore the saved project details.”

**Completion message:** “Project settings saved.”

Use the existing success and error notifications as the source of truth for save results; do not show the completion message after a failed save.

## 7. Questions for me
- Is this Settings-only scope what you intended, or should the plan cover the entire website? Only the supplied Settings component and its surrounding settings sections were available for review.
- Who are the primary users, and how comfortable are they with web apps?
- Do you have analytics or user feedback to confirm which settings are used most and where users get stuck?
- Can users change their email elsewhere, or should the guide direct them to a specific support/contact path?
- Are project name and description changes immediately visible to all project members? The supplied component does not establish how broadly those changes are displayed.
