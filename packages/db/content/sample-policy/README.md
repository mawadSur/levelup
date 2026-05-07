# Sample AI Use Policy

This directory contains a ready-to-fork AI use policy for a ~200-person company. It is customer-facing: organizations that onboard to LevelUp AI Academy receive this as their starting point and are expected to adapt it before adoption.

## What is in this directory

| File                  | Purpose                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `policy.md`           | The full AI use policy document (1,500–2,500 words). Covers all 12 required sections. |
| `approved-tools.json` | Machine-readable list of approved tools across three tiers. Referenced by the policy. |
| `README.md`           | This file.                                                                            |

---

## How to use this sample

1. Read `policy.md` in full before distributing it. It contains placeholders (marked with `[brackets]`) for a few items that are company-specific.
2. Work through the common edits list below. Most organizations need to make five to eight changes.
3. Have your Legal team and an HR leader review the final version before publishing it internally. The policy is written to be legally reasonable but is not legal advice.
4. Publish to your internal knowledge base. Link to it from your employee handbook, your onboarding materials, and the #ai-tools Slack channel or equivalent.
5. Update `approved-tools.json` to reflect your actual approved tools and any vendor agreements you have in place.
6. Set a calendar reminder to review both files every six months or whenever a significant tool change occurs.

---

## Most common edits customers make

These are the sections and fields that almost every organization adjusts:

### 1. Incident reporting contact

`policy.md`, section "Incident Reporting": Replace `security@company.com` with your actual security team address. If you use a ticketing system (Jira, ServiceNow, etc.) for security incidents, replace the email with a link to your intake form.

### 2. Tool exception request contact

Same section and the "Governance" section: Replace `it-security@company.com` with the right address or form for your organization.

### 3. Internal channel reference

The policy references a `#ai-tools` internal channel. Replace with whatever you actually use, or remove the reference if you do not have a dedicated channel.

### 4. Approved tools list

`approved-tools.json`: Add or remove tools to match your actual vendor agreements. Update the `approvedFor` arrays for any tool where your DPA scope differs from the sample. Update the `lastUpdated` date. Remove any vendor names that do not apply to your company.

### 5. Training paths and role mapping

`policy.md`, section "Training Requirements": The role-to-path table assumes the LevelUp AI Academy path names. If you are not using all paths, remove the rows that do not apply. If your roles map differently (e.g., you call it "Account Executive" not "Sales"), update the table.

### 6. Governance committee composition

The policy describes a committee with IT Security, Legal, HR, Engineering, and a rotating business unit rep. Adjust to match your actual governance structure. Small companies may replace the committee with a single named decision-maker and a review cadence.

### 7. Restricted data examples

`policy.md`, section "Data Classification": The examples of Restricted data reference GDPR, CCPA, PCI, and PHI. Remove any regulatory frameworks that do not apply to your business. If you operate in additional regulated jurisdictions (e.g., PIPEDA, LGPD, HIPAA), add them explicitly.

### 8. Effective date and version

Update the version number and effective date at the top of `policy.md` each time you publish a revision. Maintain a version history comment at the bottom of the file so employees can see what changed.

---

## What to leave alone

The following sections are intentionally written to be broadly applicable and should not be significantly weakened without legal review:

- The data classification definitions in "Data Classification"
- The prohibited uses list in "Prohibited Uses"
- The verification expectations in "Verification Expectations"
- The incident reporting obligations in "Incident Reporting"

If a section feels too strict for your culture, the right response is usually to improve training and tooling (so the compliant path is easy) rather than to remove the protection.

---

## Seeding behavior

The content in this directory is delivered to new organizations as part of their onboarding flow. The platform:

- Creates a copy of `policy.md` in the organization's document space, marked as "Sample — not yet adopted"
- Creates a copy of `approved-tools.json` in the organization's settings, pre-populated with the sample tiers
- Sends a task to the organization admin to review and adopt the policy, with a 30-day prompt

These are copies, not live links to this directory. Changes to the seed content here will only affect newly onboarded organizations.
