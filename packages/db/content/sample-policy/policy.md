# AI Use Policy

**Version:** 1.2
**Effective date:** February 1, 2026
**Policy owner:** VP of Information Technology / AI Governance Committee
**Next scheduled review:** August 1, 2026

---

## Purpose

This policy exists because AI tools are genuinely useful — for drafting, research, analysis, code assistance, and a dozen other tasks we do every day — and we want everyone in the company to get that value without running into avoidable problems along the way.

The problems we are trying to prevent are real but specific: customer data leaking into public AI services, AI-generated content going to stakeholders without verification, and uneven access where some teams benefit and others are left wondering what is allowed. None of these require a defensive, legalese policy. They require shared clarity about how to use these tools well.

We wrote this policy the same way we would explain any other tool expectation: here is what we are trying to accomplish, here is the framework, here is what we ask of you. We trust you to make good judgments within that framework, and we want to make those judgments easy.

If something is unclear or a situation arises that this policy does not cover, the right move is to ask — not to avoid the tool entirely, and not to proceed and hope for the best.

---

## Scope

This policy applies to everyone who does work on behalf of the company: full-time employees, part-time employees, contractors, consultants, and temporary workers. It applies regardless of whether you are working on company equipment, a personal device, or a remote machine.

For the purposes of this policy, "AI tools" means any software that uses a large language model, image generation model, code generation model, or autonomous agent to generate, summarize, translate, classify, or otherwise process content. This includes:

- General-purpose chat assistants (ChatGPT, Claude, Gemini)
- Code assistants integrated into editors (GitHub Copilot, Cursor)
- AI features embedded in productivity software (Microsoft Copilot in M365, Notion AI, Gemini in Google Workspace)
- AI-powered search and knowledge tools (Glean, Perplexity)
- Autonomous agents or AI-driven workflow automation tools
- Internally built AI tools and the company's AI learning platform

This policy covers how you use these tools, what data you input, and what you do with the output. It does not cover how tools are built or procured — that is governed by the vendor management and security review processes.

---

## Approved tools

The current list of approved AI tools, organized by data tier, is maintained in `approved-tools.json` in this directory. A formatted version is available on the internal knowledge base at [AI Tools Approved List].

Tools are organized into three tiers:

- **Consumer tier:** Public tools with no data processing agreement. Approved for Public and Internal data only.
- **Enterprise tier:** Tools with a signed Data Processing Agreement (DPA) in place. Approved for Public, Internal, and Confidential data.
- **Internal tier:** Tools hosted entirely within company infrastructure. Approved for all data classes, including Restricted.

**Using an unapproved tool:** Do not input company data into any tool not on this list. You may explore it with public or synthetic data, then submit a review request to it-security@company.com. The AI Governance Committee updates the list quarterly, with off-cycle reviews for urgent cases.

The approved list is a living document. It is updated when new tools complete the security review, when vendor terms change in ways that affect data handling, or when a tool is found to be non-compliant. The `lastUpdated` field in the approved-tools file reflects the most recent change.

---

## Data classification

Before choosing which AI tool to use, you need to know what class of data you are working with. These classifications are consistent with our broader information security policy.

### Public

Information the company has already published or that contains no non-public information. Examples: marketing website content, published press releases, open-source code, job postings, product documentation intended for customers.

### Internal

Information created for internal use that would cause minor inconvenience if disclosed, but is not sensitive in the regulatory or competitive sense. Examples: internal meeting notes (non-strategic), internal process documentation, general team communications, draft documents that do not contain confidential business information.

### Confidential

Information whose unauthorized disclosure could harm the company, its customers, or its partners. Examples: customer names and account details (without regulated personal data), unreleased product plans, financial forecasts not yet reported publicly, partner agreements, pricing strategies, employee performance data (aggregated), internal strategy documents.

### Restricted

The most sensitive category. Unauthorized disclosure creates significant legal, regulatory, financial, or reputational harm. Examples: personally identifiable information (PII) subject to GDPR, CCPA, or similar regulation; protected health information (PHI); payment card data (PCI-scope); Social Security numbers or government IDs; individual salary and compensation records; legal communications protected by attorney-client privilege; source code containing credentials or secrets; merger and acquisition materials under NDA.

**When in doubt, treat data as one class higher** — it is easier to loosen than to reverse a disclosure.

---

## Allowed inputs by tool tier

| Data class   | Consumer tier | Enterprise tier | Internal tier |
| ------------ | :-----------: | :-------------: | :-----------: |
| Public       |      Yes      |       Yes       |      Yes      |
| Internal     |      Yes      |       Yes       |      Yes      |
| Confidential |      No       |       Yes       |      Yes      |
| Restricted   |      No       |       No        |      Yes      |

Consumer tier tools include free or personal plans for tools like ChatGPT, Claude, and Gemini accessed through a personal or non-enterprise account. Even if a consumer tool is high quality, the absence of a DPA means we have no contractual protection for what happens to your input data.

Enterprise tier tools have a DPA in place, meaning the vendor is contractually required to handle your data for service delivery only and not use it to train public models. Check the approved-tools list for the specific tool you are using — the DPA status is confirmed per tool, not per vendor.

Internal tier tools are the only appropriate channel for Restricted data. If your workflow involves Restricted data and there is no current internal-tier tool that supports it, contact the AI Governance Committee before proceeding.

---

## Prohibited uses

The following are not allowed regardless of the tool tier:

1. **Inputting customer PII into consumer-tier tools.** This includes names, email addresses, phone numbers, or any combination of fields that could identify a specific person.

2. **Inputting regulated data into any non-internal-tier tool.** This covers PHI, PCI-scope payment data, government-issued ID numbers, and any data subject to a regulatory framework that specifies data residency or processing restrictions.

3. **Inputting source code containing secrets, credentials, API keys, or tokens** into any tool not confirmed to handle Restricted data under a Restricted-tier arrangement.

4. **Inputting individual salary, compensation, or HR-record data** into consumer or enterprise tools. This data is Restricted.

5. **Inputting legal communications or attorney work product** into any tool without prior approval from the Legal team. Attorney-client privilege may not survive disclosure to a third-party AI service.

6. **Submitting AI-generated content to a regulator, auditor, or court** as if it were verified fact without a qualified person reviewing and signing off on accuracy.

7. **Using AI tools to generate content that impersonates a specific person** — customer, employee, executive, or otherwise — without that person's knowledge.

8. **Automating decisions with direct impact on employees** (hiring, termination, compensation, performance rating) using AI outputs without documented human review and sign-off.

9. **Using AI tools to circumvent access controls** — for example, asking a model to retrieve or reconstruct information you would not otherwise have access to.

10. **Creating, distributing, or using AI-generated deepfakes or synthetic media** that could mislead a recipient about the source of the communication.

This is not an exhaustive list. The principle underlying all of these is: if the AI use creates a risk that you would not accept if you were doing the same thing manually, do not automate it.

---

## Verification expectations

AI tools produce plausible-sounding output. Plausible is not the same as accurate. The following verification expectations apply based on where the output goes:

**Customer-facing output:** Any AI-generated or AI-assisted content sent to a customer — an email, a proposal, a report, a support reply — must be read and approved by the person whose name is on it or whose team is responsible for it. By sending the output, you are confirming that you have reviewed it for accuracy, tone, and completeness. There is no blanket exception for "quick" communications.

**Board, investor, or regulatory output:** AI-assisted content going to a board, an investor, or a regulator requires explicit sign-off by the executive or legal owner of that communication. The reviewer is accountable for the content, not the tool.

**Internal decisions:** For decisions based on AI-assisted analysis, document the AI's role in the analysis (which tool, what inputs, what the model produced) in the relevant decision record. This is a traceability requirement, not a permission barrier.

**General internal work:** Drafts, meeting summaries, research notes, and similar internal content do not require formal verification before use, but you remain responsible for the accuracy of anything you act on or share. A wrong meeting summary acted upon without a sanity check is still your responsibility.

The standard is not "AI checked it." The standard is "a qualified person checked it."

---

## Attribution

When AI tools contribute to a work product, we do not generally require external disclosure unless a contract or law requires it. Our current position:

- **Internal documents:** No attribution requirement. It is good practice to note when AI played a significant role in drafting a document (e.g., "first draft generated with Claude, reviewed and edited by [name]"), especially if the document will be referenced or built upon later.

- **Customer-facing documents:** No required external disclaimer unless the customer contract requires disclosure of AI use, the applicable law requires it, or the document type is in a regulated category where authorship has legal implications (legal opinions, medical advice, financial advice requiring a licensed professional).

- **Public communications:** Follow the guidelines issued by the Marketing and Legal teams, which are updated as industry norms and regulations evolve.

If you are uncertain whether a specific deliverable requires disclosure, ask Legal before it goes out.

---

## Incident reporting

If you believe that Confidential or Restricted information was entered into a tool it should not have been — whether by mistake, by a misunderstanding of the tool's tier, or because a tool's behavior was different from what you expected — report it promptly.

**How to report:**
Send an email to security@company.com with the subject line "AI Data Incident" and include:

- Which tool was used
- What type of data was entered (you do not need to reproduce the data itself)
- When it happened (approximate date and time)
- Your best assessment of whether the data reached a public model or was processed externally

**What happens next:**
Security will acknowledge the report within one business day and will assess whether the incident requires further action (vendor notification, data subject notification, regulatory notification). Most incidents where data was entered into an enterprise-tier tool will not require escalation beyond internal documentation — the DPA provides protection. Incidents involving consumer-tier tools or Restricted data are treated with higher urgency.

Prompt reporting is always better than delayed reporting. We do not penalize good-faith incidents that are reported promptly. We do take seriously situations where someone knew a problem occurred and did not report it.

---

## Governance

**Policy owner:** The VP of Information Technology is the named owner of this policy and is responsible for ensuring it is current, accessible, and enforced.

**AI Governance Committee:** A cross-functional group consisting of representatives from IT Security, Legal, HR, Engineering, and a rotating business unit representative. The committee meets quarterly to:

- Review the approved-tools list and make updates
- Review any incidents from the prior period
- Assess whether the policy requires revision based on new tools, regulations, or company changes
- Approve exceptions to this policy

**Policy updates:** Substantive changes to this policy require AI Governance Committee approval and a two-week notice period before taking effect (except for emergency security updates, which take effect immediately). All employees will be notified of substantive changes through the standard company communications channel.

**Exception process:** If your work requires a use case not covered by this policy or requires use of a tool or data combination not currently approved, submit an exception request to it-security@company.com with a description of the use case, the business justification, and the proposed risk mitigations. The AI Governance Committee will respond within five business days.

**Questions:** For questions about how this policy applies to a specific situation, contact it-security@company.com or post in the #ai-tools internal channel.

---

## Training requirements

We want everyone to use AI tools effectively and responsibly. Training is how we get there.

**Required for all employees:**
Complete the **AI Basics** learning path on LevelUp AI Academy within 60 days of hire and whenever a major policy update is issued. This path covers: how large language models work, what the data tiers mean in practice, the verification expectations, and how to report an incident.

**Required by role:**
The following role-based paths are required within 90 days of starting in the role. They provide depth beyond the basics and are calibrated to the AI use cases most relevant to each function.

| Role / Function  | Required path             |
| ---------------- | ------------------------- |
| Sales            | AI for Sales              |
| Customer Support | AI for Support            |
| HR               | AI for HR Professionals   |
| People Managers  | AI for Managers           |
| Engineering      | AI for Engineers          |
| Marketing        | AI for Marketing          |
| Finance          | AI for Finance            |
| Legal            | AI Basics + Legal consult |
| Executive / VP+  | AI for Leaders            |

**Recommended:**
Role-specific advanced paths, prompt workshops, and live Q&A sessions are available but not required. Managers are encouraged to discuss AI skill development in regular growth conversations.

Training records are tracked in LevelUp AI Academy and accessible to managers and HR. Completion is reviewed at the annual policy refresh.

---

## Disciplinary

Violations of this policy are handled through the company's standard performance management process. The severity of the response is proportional to the severity of the violation, whether it was intentional, and whether similar guidance had been given before.

A one-time mistake that was promptly reported and caused limited harm is handled very differently from a repeated pattern of ignoring clear guidance. We will always discuss a concern before taking formal action, and you will have an opportunity to share your perspective.

If a violation involves a data breach that triggers regulatory notification requirements, we will follow the applicable legal process, which may involve HR, Legal, and external parties regardless of intent.

We are not trying to create a culture of fear around these tools. We are asking for the same good judgment we trust you to apply everywhere else in your work.
