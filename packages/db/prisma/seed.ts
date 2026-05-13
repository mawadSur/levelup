import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient, Role, AiLevel, Plan } from '@prisma/client';
import { seedScenarios } from './seed-scenarios';
import { seedLessonImages } from './seed-lesson-images';

const prisma = new PrismaClient();

type SeedQuestion = {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
};

type SeedLesson = {
  title: string;
  slug: string;
  body: string;
  estimatedMinutes: number;
  questions: SeedQuestion[];
};

type SeedPath = {
  title: string;
  slug: string;
  description: string;
  targetRole: Role | null;
  targetLevel: AiLevel;
  tier: AiLevel;
  isCore: boolean;
  prerequisiteSlugs: string[];
  orderIndex: number;
  lessons: SeedLesson[];
};

// File-driven paths under packages/db/content/<slug>/ — for paths authored as
// markdown lessons + JSON quizzes (the Kapitus academy curriculum). Added in
// order they should appear in the catalog.
const FILE_PATH_SLUGS = [
  'kapitus-foundations',
  'ai-customer-comms',
  'ai-lending',
  'ai-underwriting',
  'ai-compliance',
  'prompt-engineering',
] as const;

interface MarkdownLessonFrontmatter {
  slug: string;
  title: string;
  estimatedMinutes: number;
  orderIndex: number;
}

function parseFrontmatter(raw: string): { frontmatter: MarkdownLessonFrontmatter; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Lesson markdown is missing YAML frontmatter');
  }
  const yaml = match[1] ?? '';
  const body = (match[2] ?? '').trim();
  const fields: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    fields[key] = value;
  }
  const slug = fields.slug;
  const title = fields.title;
  if (!slug || !title) {
    throw new Error('Lesson frontmatter must include `slug` and `title`');
  }
  return {
    frontmatter: {
      slug,
      title,
      estimatedMinutes: parseInt(fields.estimatedMinutes ?? '8', 10) || 8,
      orderIndex: parseInt(fields.orderIndex ?? '0', 10) || 0,
    },
    body,
  };
}

function loadPathFromContent(slug: string): SeedPath {
  const dir = path.join(__dirname, '..', 'content', slug);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'path.json'), 'utf8')) as {
    title: string;
    slug: string;
    description: string;
    targetRole: string | null;
    targetLevel: string;
    tier?: string;
    isCore?: boolean;
    prerequisiteSlugs?: string[];
    orderIndex?: number;
  };

  const lessonFiles = fs
    .readdirSync(path.join(dir, 'lessons'))
    .filter((f) => f.endsWith('.md') && !f.endsWith('.scenario.md'))
    .sort();

  const lessons: SeedLesson[] = lessonFiles.map((file) => {
    const raw = fs.readFileSync(path.join(dir, 'lessons', file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);

    // Quiz lives at quizzes/<same-stem>.json
    const stem = file.replace(/\.md$/, '');
    const quizFile = path.join(dir, 'quizzes', `${stem}.json`);
    const quizRaw = JSON.parse(fs.readFileSync(quizFile, 'utf8')) as {
      questions: Array<{
        prompt: string;
        choices: string[];
        correctIndex: number;
        explanation?: string;
      }>;
    };

    return {
      title: frontmatter.title,
      slug: frontmatter.slug,
      body,
      estimatedMinutes: frontmatter.estimatedMinutes,
      questions: quizRaw.questions.map((q) => ({
        prompt: q.prompt,
        choices: q.choices,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
    };
  });

  return {
    title: meta.title,
    slug: meta.slug,
    description: meta.description,
    targetRole: meta.targetRole as Role | null,
    targetLevel: meta.targetLevel as AiLevel,
    tier: (meta.tier ?? meta.targetLevel) as AiLevel,
    isCore: meta.isCore ?? false,
    prerequisiteSlugs: meta.prerequisiteSlugs ?? [],
    orderIndex: meta.orderIndex ?? 99,
    lessons,
  };
}

const PATHS: SeedPath[] = [
  {
    title: 'AI Basics for Every Employee',
    slug: 'ai-basics',
    description: 'Foundations every employee needs to use AI safely and effectively.',
    targetRole: null,
    targetLevel: AiLevel.BEGINNER,
    tier: AiLevel.BEGINNER,
    isCore: true,
    prerequisiteSlugs: [],
    orderIndex: 0,
    lessons: [
      {
        title: 'What AI actually is (and isn’t)',
        slug: 'what-ai-actually-is',
        body: `[image] A new employee at a clean desk on her first morning, laptop open to a chatbot welcome screen, a coffee mug and a notebook beside it, warm window light from the left
[image] A simple side-by-side illustration: a search engine returning a list of real links on the left, an AI chat producing a flowing paragraph on the right, both labelled in plain handwritten text

# Sara’s first morning

Sara’s first morning at the new job goes about how you’d expect. Welcome email, laptop setup, a Slack channel called #general that already has 412 unread messages. Around 10am her manager pings her: "Use the AI to draft a one-pager on yourself — background, role, what you’re excited about. By noon."

Sara opens the chatbot. She types: "Write a one-pager about me." Four seconds later, four paragraphs come back. They’re grammatical. They’re flowing. They’re also about no one in particular — a generic professional who is excited about leveraging synergies in today’s landscape.

She sits with that for a second. The tool produced something. It was fast. It was also, on inspection, completely empty.

# What the tool actually did

Dev, the intern she’s sharing a desk with, leans over. "First time?"

"It just made stuff up."

"It always makes stuff up. That’s the whole mechanism. The trick is knowing that going in."

Dev explains it the way someone explained it to him. A large language model isn’t a search engine. It doesn’t look anything up. During training, it read a vast amount of text — books, websites, articles, code — and learned which words tend to follow which other words in which contexts. When you type a prompt, it generates a response one token at a time, each time predicting the most plausible next piece of text.

It’s a very, very sophisticated autocomplete. One that has absorbed an enormous fraction of written language and can hold a coherent conversation, summarize a document, or draft a memo. It is not a database of facts. It is a pattern-matching machine.

That’s why Sara’s one-pager was so generic. The model had nothing about Sara specifically, so it generated the kind of text that fits the pattern of "a one-pager about a professional." Polished, plausible, empty.

# Fluent doesn’t mean accurate

The single most important thing Sara takes from the morning is this: **how good the output sounds is not evidence of whether it’s right.**

The model is optimized to produce fluent prose. Fluency and accuracy are different things. A completely fabricated statistic gets formatted just as cleanly, in the same professional tone, as a real one. There’s no internal fact-check happening. The model isn’t aware of whether a statement is true — it’s aware of whether a statement fits the pattern of things that get said in that kind of context.

Dev puts it bluntly: "Treat it like a smart colleague who’s read everything but never remembers exactly where. Useful. Wrong sometimes. Always confident."

# Why this matters for the rest of the path

Understanding the mechanism changes what you do with the output:

- Treat AI replies as a **first draft**, not a final answer.
- Expect the most risk on factual claims — names, dates, numbers, citations, recent events.
- Expect more reliability on **structure, tone, and synthesis** — reorganizing, rewriting, brainstorming, explaining.
- Remember the model doesn’t know you, your company, or anything that happened after its training cutoff.

That’s the whole frame. Everything in this path — better prompts, spotting bad outputs, protecting your data, knowing when not to use it at all — follows from that.

# Try it

Open a chatbot. Pick a topic you actually know well — a process from a previous job, a hobby, a place you’ve lived for years. Ask the AI to explain it. Read the response carefully.

Try these three prompts in a row:

1. "Explain [your topic] to me."
2. "What are three common misconceptions about [your topic]?"
3. "Cite a specific 2024 study about [your topic]."

You are looking for two things: places where it gets things right (and how it phrases them) and at least one place where it’s wrong, vague, or subtly off. Write that one thing down. That habit — reading AI output with a calibrated, slightly skeptical eye — is the most valuable skill in this entire course.

# Takeaway

AI sounds confident whether it’s right or wrong; treat every reply as a draft you own, not an answer you trust.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'Which best describes how a large language model produces a response?',
            choices: [
              'It queries a database of verified facts and returns matching records',
              'It searches the web in real time and summarizes the results',
              'It predicts likely next words based on patterns learned from training text',
              'It retrieves documents written by human experts and paraphrases them',
            ],
            correctIndex: 2,
            explanation:
              'LLMs generate text by predicting what comes next based on patterns in training data. They do not query databases, search the web in real time, or retrieve pre-written documents.',
          },
          {
            prompt:
              'A colleague says an AI reply must be accurate because it is grammatical and well-formatted. What is wrong with that reasoning?',
            choices: [
              'Nothing — well-formatted output is a reliable indicator of accuracy',
              'Fluency and accuracy are independent; a model can produce polished prose that is factually wrong',
              'The colleague is right for short replies but wrong for long ones',
              'Grammar errors are actually a sign of higher accuracy',
            ],
            correctIndex: 1,
            explanation:
              'The model is optimized for fluent, plausible-sounding text. A confident, polished response can still be entirely wrong.',
          },
          {
            prompt: 'Which kind of task is AI MOST reliable on, out of the box?',
            choices: [
              'Citing a specific recent academic paper',
              'Reorganizing or rewriting text you provide',
              'Quoting current market prices',
              'Reporting last week’s news',
            ],
            correctIndex: 1,
            explanation:
              'Structural and synthesis tasks (reorganizing, rewriting, explaining) lean on patterns the model knows well. Recent facts, current data, and specific citations are higher-risk.',
          },
        ],
      },
      {
        title: 'How to write a prompt that actually works',
        slug: 'how-to-write-a-prompt',
        body: `[image] Two coworkers at a laptop, one typing a long structured prompt visible on screen with four labelled sections — Role, Task, Format, Constraints — the other pointing at the screen with a marker
[image] A split-screen comparison: on the left a one-line prompt "write me an email" producing a bland generic paragraph; on the right a detailed prompt producing a tight, specific draft, with both screens labelled VAGUE IN and SPECIFIC IN

# Tuesday, 11:43am

Sara has a draft email she needs to send by lunch. Quarterly update to the team. She types into the chatbot: "Write me an email to my team about Q3."

Four seconds later: four paragraphs of perfectly grammatical, perfectly empty corporate prose. "As we move forward into Q4, we remain committed to leveraging our key strategic priorities..."

She reads it aloud. It says nothing. It is, however, beautifully punctuated.

Dev looks over. "Vague in, vague out. What did you actually want it to say?"

# The four things every prompt needs

Dev grabs a sticky note and writes four words on it: **Role. Task. Format. Constraints.**

"You missed all four. The model had to guess every one of them, and its guess is the most generic possible answer."

They work through it together, out loud:

- **Role.** Who is the AI writing as? "You are the head of a 12-person operations team writing to your direct reports."
- **Task.** What’s the actual job? "Summarize what shipped in Q3, flag two risks for Q4, and call out two people by name."
- **Format.** What shape should the output take? "Email. Three short sections with bold headers. Under 200 words."
- **Constraints.** What should it avoid or include? "Plain language. No filler phrases like 'leverage' or 'in today’s landscape.' Numbers only where I supply them — don’t invent any."

Sara types all of that. The next reply is three short sections, clean, specific, and — critically — it doesn’t invent statistics. The places where Sara hasn’t given numbers, the model leaves a placeholder like \`[insert Q3 shipped feature count]\` instead of guessing.

"That last bit is the trick most people miss," Dev says. "If you don’t give it the numbers, it will make them up. Tell it not to."

# Give an example when you can

The other thing that turns mediocre prompts into great ones is examples. If Sara already has one email she liked the tone of, she can paste it in: "Match this style." The model can pattern-match on her example rather than guessing what "good" looks like.

This is called few-shot prompting and it works for almost everything: meeting notes in a specific format, subject lines in a particular voice, code in a house style. Show, don’t describe.

# Iterate — the first reply is rarely the best

Sara’s first specific prompt produced a much better draft, but it wasn’t finished. She wanted the second risk reframed; the closing was too stiff. So she said so:

- "That’s good but the second risk reads as alarmist. Rewrite it as a watch-item, not a fire."
- "Closing is too formal. Make it sound like I actually talk."
- "Cut it by 20%."

Three turns. Final draft is ready in under five minutes. Compare that to the half-hour of staring at the blinking cursor she’d been doing before.

The mental shift is from "prompt as one-shot transaction" to "prompt as a conversation that converges." Most people who say AI tools are useless tried once, didn’t like the output, and gave up. Most people who get value try once, react to what came back, and iterate.

# Try it

Pick a draft you actually need to write today — an email, a one-pager, a Slack post, anything. Write three versions of the prompt:

1. The lazy version: one line, no context. "Write me X."
2. The structured version: spell out role, task, format, and constraints in four labelled lines.
3. The structured version plus one example of the tone you want.

Run all three. Read the outputs side by side. The differences will teach you more in five minutes than another lesson would.

One specific rule worth burning in: **if you don’t supply the numbers, the model will invent them.** Always say "use only numbers I provide; otherwise leave a placeholder." That single line catches most of the embarrassing factual errors before they happen.

# Takeaway

Spend a minute up front spelling out role, task, format, and constraints — and you’ll spend ten fewer minutes editing the reply later.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'Which is the strongest structure for an everyday work prompt?',
            choices: [
              'Just the task as a single sentence',
              'Role, task, format, and constraints — all specified up front',
              'A long backstory followed by a vague question',
              'A polite greeting and then the task',
            ],
            correctIndex: 1,
            explanation:
              'Role + task + format + constraints eliminates the assumptions the model would otherwise guess, which is what produces generic output.',
          },
          {
            prompt:
              'You ask the AI to draft a quarterly update but don’t supply any metrics. The draft includes a confident-sounding "12.3% improvement." What most likely happened?',
            choices: [
              'The AI looked up your company’s real metrics',
              'The AI invented a plausible-looking number to fit the pattern of the sentence',
              'The AI defaulted to industry averages',
              'The AI extracted the number from your clipboard',
            ],
            correctIndex: 1,
            explanation:
              'If you don’t supply numbers, the model generates ones that look like the kind of number that fits the sentence. Always supply real numbers, or tell the model to leave a placeholder.',
          },
          {
            prompt:
              'You don’t love the first draft the AI returns. What’s the most effective next step?',
            choices: [
              'Conclude the AI is useless and write the whole thing yourself',
              'Ask again with the exact same prompt and hope for better',
              'Tell it specifically what to change — tone, length, framing, one section at a time',
              'Increase the prompt length by 5x and resend',
            ],
            correctIndex: 2,
            explanation:
              'Prompting is iterative. Treat the first reply as a draft and refine with specific, targeted edits. The second or third version is usually significantly better.',
          },
        ],
      },
      {
        title: 'Spotting when AI is confidently wrong',
        slug: 'spotting-confidently-wrong',
        body: `[image] A professional at a desk reading a printed AI-generated brief, a highlighter in hand and a small stack of marked-up pages, three sticky notes labelled SUSPICIOUS NUMBER, CHECK CITATION, CONFIRM DATE
[image] A laptop screen showing an AI reply with a citation reading "Smith et al., 2023, Journal of Operations Management" highlighted in red, and a second tab labelled SEARCH RESULTS: NO RESULTS FOUND

# The brief that almost went out

Pat the CISO walks past Dev’s desk on a Wednesday afternoon. Dev has an AI-drafted briefing open on his laptop. Three paragraphs in: "According to a 2024 Stanford study, 67% of mid-market firms reported a measurable productivity gain from generative AI."

"Where’d that number come from?" Pat asks.

Dev shrugs. "The AI cited a Stanford study."

"Can you click the citation?"

There isn’t one. Just the author name and year. Dev searches the title — nothing. He searches the author name — a real researcher, but one who has never published a paper on AI productivity. The "Stanford study" doesn’t exist. The number was invented to fit the sentence.

"This was about to go to the leadership team with my name on it," Dev says, very quietly.

Pat nods. "And once it’s out, it’s yours. The model has no stake in the outcome. You do."

# Why this keeps happening

You read about this in the first lesson: the model produces text that fits a pattern. Citations follow a pattern — author, year, title, journal. The model can generate text that fits that pattern without any memory of a real paper behind it. Statistics follow a pattern: round-ish percent, vague attribution. The model can generate one that sounds research-backed without there being any research.

This is **hallucination**, and it is the single most dangerous AI failure mode at work because the fabricated content looks exactly like real content. If nobody checks, it gets treated as real.

# The two-source rule

For any factual claim that matters — a number, a legal standard, a competitor’s position, an industry statistic — don’t act on it until you have confirmed it from at least one source that isn’t the AI.

You don’t have to verify every sentence. You need to identify which sentences carry factual weight and check those.

- "Here are three ways to approach this" → evaluate yourself; lower-risk.
- "67% of firms reported X in a 2024 study" → verify or cut.

The mental move is to look at each AI-produced sentence and ask: **is this a claim about the world, or a framework I can evaluate myself?** Claims about the world get checked.

# Patterns that signal "verify this first"

Dev learns to spot a few recurring tells:

- **Suspiciously clean numbers.** "Studies show that 70% of workers..." Real research produces messier numbers — 68.4%, not 70%. Round multiples of five and ten deserve extra scrutiny.
- **Vague specificity.** "Research from leading universities" — which universities? "A 2024 industry report" — which one? Vague attribution that sounds specific is a flag.
- **Confident statements about anything recent.** Models have a training cutoff. Anything about events in the last few months may be outright invented or extrapolated.
- **Citations that you can’t click.** If there’s no URL or the URL 404s, the citation is unverified until proven otherwise.

# The "would I sign this?" test

Before sending or acting on AI-generated content, read it as if you wrote it yourself. Ask: if my name is on this and someone challenges any specific claim in it, can I defend it?

If you reach a sentence and think "I’m not sure that’s right," that sentence needs a check. If a single fact in the document would embarrass you professionally if it turned out wrong, the whole document needs a check.

This shifts the question from "did the AI get this right?" — which you can’t know in advance — to "would I personally stand behind this?" — which you can answer.

# What does NOT need heavy verification

Verification is not paranoia. Some things carry low factual risk and don’t need cross-checking:

- Reorganized or reformatted text where you already supplied the facts.
- Tone and clarity edits.
- Brainstorming lists — you’ll evaluate the options yourself.
- Explanations of concepts you can fact-check quickly against your own knowledge.

Save your verification energy for the output where being wrong has consequences.

# Try it

Open a chatbot. Ask it for three statistics on a topic in your field, each one with a specific source. Then take five minutes to verify each. Try these prompts:

1. "Give me three statistics about [your industry] in 2024, each with the source."
2. For each statistic, click the URL or search the title in a separate tab.
3. Count: how many of the three are real, accurately quoted, and actually say what the AI claims they say?

The result is usually instructive. Whatever number you get — zero, one, two, three — it will calibrate how you read AI-cited statistics for the rest of your career.

# Takeaway

The model has no stake in being right; you do. Every fact, number, or citation that matters needs at least one human-eyeballed check before your name goes near it.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt:
              'You ask an AI for sources and get three citations. What is the right next step?',
            choices: [
              'Trust them — the AI cited specific authors and years',
              'Trust them only if there are three (matches research patterns)',
              'Verify each one independently — a meaningful fraction will be fabricated',
              'Only verify the first one and assume the rest are fine',
            ],
            correctIndex: 2,
            explanation:
              'AI hallucinates citations that look real because the model has learned the *shape* of a citation, not the underlying paper. Verify each one independently.',
          },
          {
            prompt: 'Which sentence in an AI reply is the LOWEST verification priority?',
            choices: [
              '"According to a 2024 study, 67% of firms..."',
              '"The CEO of competitor X announced last month..."',
              '"Here are three ways you could approach this problem"',
              '"The new regulation requires reporting within 30 days"',
            ],
            correctIndex: 2,
            explanation:
              'Frameworks and option lists are things you evaluate yourself — lower factual risk. Specific numbers, recent events, and regulatory claims all need verification.',
          },
          {
            prompt: 'Why is "would I sign this?" a useful test?',
            choices: [
              'It shifts the question to one you can actually answer — whether you can defend every claim yourself',
              'It legally protects you from liability',
              'It tricks the AI into giving more accurate responses',
              'It satisfies most compliance frameworks',
            ],
            correctIndex: 0,
            explanation:
              'You can’t know in advance whether the AI got something right, but you can decide whether you’d personally stand behind every sentence. That’s the test that catches the errors before they go out.',
          },
        ],
      },
      {
        title: 'Data you should never paste into a public AI tool',
        slug: 'data-you-should-never-paste',
        body: `[image] A laptop on a desk with a chat window open, a hand frozen mid-paste with the keyboard shortcut overlay visible, a small red warning triangle on the browser tab, soft late-afternoon office light
[image] Two side-by-side document panels: on the left a raw customer record showing a name, email, SSN and phone number; on the right the same record sanitized with placeholders [CUSTOMER_NAME], [EMAIL], [SSN_REDACTED]

# Friday, 4:50pm

The office is mostly empty. Dev has a customer churn report due Monday and the spreadsheet is enormous — ten thousand rows of names, emails, plan tiers, monthly spend, last-login timestamps. He has the public chatbot open.

"Sara — can I just paste the customer export into the AI and have it summarize? I’ll never finish this otherwise."

Sara looks at the screen. "What’s in the export?"

"Names. Emails. Plan tier. Monthly spend. Last login."

"That data leaves our boundary the moment you hit send. The personal-tier chatbot is a third-party processor with no data-processing agreement on file. Names plus emails plus spend tier is enough to identify customers."

Dev sighs. "So what do I do? I have a deadline."

"Ten minutes of sanitization. Replace names with Customer A, B, C. Round the spend numbers. Drop the emails entirely — the model doesn’t need them to spot patterns. Then ask the same question."

Forty minutes later Dev has a usable summary. The summary is no worse for the sanitization. He has a sanitized template he’ll reuse next quarter. And the customer data never left the building.

# The single most useful test

Before pasting anything into a public AI tool, ask yourself one question:

> **If this text appeared in a news story tomorrow, would my company have a serious problem?**

If yes: don’t paste it. Sanitize, or use an approved enterprise tool.

If you’re uncertain: the answer is no. Caution has low cost. A data breach has high cost.

That single question covers most of the rule.

# What "sensitive" actually means

Pat has a list pinned in the team wiki. None of it is exotic; it’s the same handful of categories every regulated industry recognizes:

**Customer and client data.** Names, emails, phone numbers, account numbers, support tickets, purchase histories — anything that identifies a real person you serve. This is **personally identifiable information (PII)**. Moving it to a third-party processor without an agreement is often a legal violation, not just a policy one.

**Health information.** Medical records, insurance details, employee health conditions — anything covered by healthcare privacy law. Applies whether the subject is a customer, a patient, or a colleague.

**Financial records.** Quarterly earnings before they’re public, detailed budgets, individual compensation, client financials under NDA.

**Legal and contractual material.** Privileged attorney communications, contract terms under NDA, litigation strategy, settlement terms. Pasting these into a public tool can destroy attorney-client privilege.

**Source code with secrets.** Anything containing API keys, database credentials, auth tokens, or internal endpoints. Even if you redact the secrets first, proprietary code may itself be restricted.

**HR records.** Performance reviews, disciplinary actions, comp details, hiring decisions, anything about a specific employee.

# Approved enterprise tools are different

Most companies have at least one AI tool configured to keep data within the corporate boundary — an enterprise Copilot tenant, a private model deployment, a vendor with a data-processing agreement on file. Those are the tools where customer data is permitted. The difference between "approved enterprise tool" and "free public chatbot" is significant and you should always know which one you’re looking at.

If you don’t know whether a tool is approved at your company, ask before you use it on anything sensitive. Five minutes of asking is cheaper than the alternative.

# Sanitization is usually all you need

Most AI use cases at work can be handled with general descriptions and placeholders. The AI doesn’t need the real client name to help you draft a difficult email — it just needs to know it’s a difficult email to an unhappy client. It doesn’t need real financial figures to help you think through a tradeoff — a structural description with rounded numbers is plenty.

Useful placeholders to know by hand:

- \`[CUSTOMER_NAME]\`, \`[EMAIL]\`, \`[PHONE_REDACTED]\`, \`[SSN_REDACTED]\`
- \`[INTERNAL_PROJECT]\`, \`[DOLLAR_AMOUNT]\`
- Customer A, B, C for lists
- Rounded numbers for figures: "around $200k" instead of $187,432.18

The summary, the analysis, the draft — it all still works. The data stays inside the boundary where it belongs.

# Try it

Take any work document you’ve recently used AI on, or one you were about to. Read it before pasting anything. Identify:

1. Any specific person’s name, email, or phone number.
2. Any internal project name or unreleased product.
3. Any specific financial figure or client contract term.

Practice the sanitized version. Rewrite the prompt with placeholders and rounded values. Run both prompts and compare what comes back — you’ll usually find the sanitized version produces output that’s just as useful, and you’ll have a reusable template for next time.

The habit to build now, before a deadline forces it, is the three-second scan: **names, numbers, internals.** Three seconds. Every time.

# Takeaway

If a tomorrow-it’s-in-the-news version of the text would be a problem, it doesn’t belong in a public AI tool — sanitize it first or use the approved enterprise version.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt:
              'A teammate wants to paste a customer support ticket containing the customer’s name and account number into ChatGPT to draft a reply. What’s the right response?',
            choices: [
              'Go ahead — a single ticket is too small to matter',
              'Sanitize the PII first or use an approved enterprise tool',
              'Use a different public chatbot to spread the risk',
              'Paste it but tell the AI to forget the details after',
            ],
            correctIndex: 1,
            explanation:
              'Customer PII never goes into a public AI tool. Either redact the identifying details or use a company-approved enterprise tool where the data-processing agreement is in place.',
          },
          {
            prompt:
              'You’re drafting an internal email and want help with the tone. The email mentions a specific client by name and the dollar value of their contract. What should you paste?',
            choices: [
              'The whole email — it’s only going internally',
              'A version with the client name replaced by [CLIENT] and the dollar amount rounded or generalized',
              'The email with the dollar amount removed but the name kept',
              'Just the subject line',
            ],
            correctIndex: 1,
            explanation:
              'The AI doesn’t need real names or exact figures to help with tone. Replace identifying details with placeholders before pasting.',
          },
          {
            prompt:
              'Which of these is the BEST quick test for whether something is safe to paste into a public AI tool?',
            choices: [
              '"Does it have personal information in it?"',
              '"Is this email longer than 500 words?"',
              '"If this appeared in a news story tomorrow, would my company have a problem?"',
              '"Did I write it myself?"',
            ],
            correctIndex: 2,
            explanation:
              'The "if it leaked tomorrow" test covers most categories of sensitive data without needing to memorize a long list, and biases you toward caution when uncertain.',
          },
        ],
      },
      {
        title: 'When NOT to use AI',
        slug: 'when-not-to-use-ai',
        body: `[image] A meeting room with two people in a difficult conversation, a closed laptop visible on the table between them, the screen off, soft natural light through a window
[image] A hand putting down a phone after a real conversation, a notepad with handwritten notes visible beside it, the laptop closed and pushed aside

# The reply that shouldn’t be drafted

Pat is reviewing draft messages with Sara on a Thursday afternoon. Sara has a difficult one queued up — a report-out to a colleague whose project just got cut. She’d used the AI to soften it.

Pat reads the draft. "It’s technically fine. It’s also obviously not written by you."

"That’s why I used the tool. I wasn’t sure how to say it."

"The problem is exactly that. This person is going to read it twice. They’ll feel the difference between you and a chatbot, even if they can’t name it. That gap is the message they’ll actually take away."

Sara closes the laptop. The conversation that actually has to happen is a phone call, made by her, with no draft.

# The skill is knowing when not to reach for it

Most of this path has been about using AI well. This lesson is the inverse: knowing the situations where AI is the wrong tool, even when it’s the easy tool.

There are a few categories where reaching for the AI causes more harm than the time it saves.

# Real human moments

Difficult feedback. Condolences. Apologies. A message to a colleague who just lost a parent or a project. These read differently when they come from a machine — not because the words are wrong, but because the *effort* is part of the message. Taking the time to write something imperfect but personal communicates something a polished AI draft never can.

The rule isn’t "AI can’t help with anything emotional." It’s "if the recipient would feel betrayed knowing you used AI for this, don’t."

# Decisions that need your judgment

AI can produce options, structure tradeoffs, surface considerations you missed. It cannot:

- Weigh competing priorities the way *you* understand them.
- Know your manager’s preferences, your team’s history, the unstated constraints on a project.
- Take responsibility for a decision.

When AI output informs a decision, a human owns the decision. That means actually reading and evaluating the output, not rubber-stamping. If you wouldn’t personally defend a choice, don’t make it on the AI’s recommendation.

# Things you don’t understand

This one trips up smart people. If you ship a document that uses terminology you can’t define, makes arguments you can’t defend, or contains code you couldn’t debug — you’re exposed.

A useful rule from the team wiki: **don’t use AI to produce output you couldn’t, given a little more time, produce yourself.** Use it to do faster what you already know how to do. That keeps you in a position to evaluate, edit, and own the result. The day someone asks "can you walk me through this?" and your honest answer is "the AI wrote it" is the day the document becomes a problem.

# Anything time-sensitive about current events

Models have a training cutoff. Ask about a regulation passed last quarter, a competitor’s recent announcement, or current pricing, and one of two things will happen: the model will say it doesn’t know (good), or it will generate something plausible based on data from before the cutoff (dangerous, because it sounds current).

For legal requirements, pricing, recent news, personnel changes — go to a primary source. The AI is not the right tool for current information.

# Math that matters

LLMs are not calculators. Simple arithmetic (two plus two, ten percent of a hundred) usually works because those patterns are common. Multi-step calculations, percentage changes, unit conversions, and anything involving large numbers are genuinely unreliable. The model will present a wrong answer with the same confidence as a right one.

If the number matters, use a calculator or a spreadsheet. If an AI returns numbers to you, treat them as draft and verify independently.

# A small flowchart Dev keeps pinned

When tempted to reach for the AI, Dev runs through five quick questions:

1. **Is this a relationship moment?** If yes — write it yourself.
2. **Would I sign my name to every claim without checking?** If no — don’t send AI output unedited.
3. **Could the AI invent a fact that would embarrass me?** If yes — verify or strip it.
4. **Does this involve recent events or specific numbers I haven’t supplied?** If yes — the AI is the wrong source.
5. **Could I produce a version of this myself, given a little more time?** If no — stop. Get help from a human first.

Pass all five, the AI is a good fit. Fail any one, slow down.

# Try it

Open a list of the last ten things you’ve used (or considered using) AI for. For each, run Dev’s five-question flowchart. Try this:

1. "What would happen if I sent the AI’s output without editing?"
2. "Could I defend every claim in it if someone asked?"
3. "Was there a human conversation this should have been instead?"

You will probably find one or two that were a misfit — a tough message that should have been a call, a numeric claim that should have been verified, a piece of writing where the polish actually undermined the point. Noticing those is the skill that turns "AI user" into "AI fluent."

# Takeaway

AI is the right tool more often than not — but the skill is knowing when to close the laptop and pick up the phone instead.`,
        estimatedMinutes: 8,
        questions: [
          {
            prompt:
              'A colleague’s parent has just passed away and you want to send a message of condolence. Should you use AI to draft it?',
            choices: [
              'Yes — AI produces well-worded condolences quickly',
              'No — the effort and personal voice are part of the message; write it yourself',
              'Yes, but only if you edit one sentence to add personalization',
              'It depends on whether the AI is the approved enterprise version',
            ],
            correctIndex: 1,
            explanation:
              'Relationship moments — condolences, apologies, difficult feedback — carry weight precisely because of the human effort behind them. AI polish reads as the opposite of care.',
          },
          {
            prompt:
              'You need a number that’s the result of a 4-step percentage calculation. What’s the most reliable approach?',
            choices: [
              'Ask the chatbot — it’s usually right on math',
              'Use a calculator or spreadsheet and verify independently if the number matters',
              'Ask the AI three times and average the answers',
              'Round aggressively and trust the result',
            ],
            correctIndex: 1,
            explanation:
              'LLMs are pattern-matching machines, not calculators. Multi-step arithmetic is unreliable, and the model presents wrong answers with the same confidence as right ones. Use a calculator for any number that matters.',
          },
          {
            prompt:
              'You’re considering using AI to produce a technical document on a topic you don’t personally understand. What’s the risk?',
            choices: [
              'There is no risk — AI is reliable on technical content',
              'You won’t be able to evaluate, defend, or correct the output, so any error becomes your error',
              'The AI will refuse to help',
              'The output will be too short',
            ],
            correctIndex: 1,
            explanation:
              'If your name goes on a document, you own it. Producing content you can’t evaluate or defend means errors become your errors. Use AI to do faster what you already know how to do.',
          },
        ],
      },
    ],
  },
  {
    title: 'AI for Sales Teams',
    slug: 'ai-for-sales',
    description: 'Use AI to personalize outreach, qualify leads, and shorten the sales cycle.',
    targetRole: Role.EMPLOYEE,
    targetLevel: AiLevel.PRACTITIONER,
    tier: AiLevel.PRACTITIONER,
    isCore: false,
    prerequisiteSlugs: ['ai-basics', 'kapitus-foundations'],
    orderIndex: 14,
    lessons: [
      {
        title: 'Research before you write a single word',
        slug: 'research-before-outreach',
        body: `[image] An AE named Mia at a tidy desk with two monitors. Left screen: a LinkedIn profile, a 10-K excerpt, a podcast transcript. Right screen: a half-written cold email. Sticky note on the bezel reads "what would make THIS person reply?"
[image] Close-up of a notepad with three bullets in a clean hand: "their pain · my proof · easy next step." Coffee cup beside it.

# Mia's Monday morning
Mia is an account executive at a mid-market sales platform. She has eight discovery calls to book this week and a list of forty prospects she's never spoken to. The old playbook said: blast a templated sequence and pray for a 1% reply rate. Her new manager said: pick ten, do real homework, send messages that earn the open.

She opens her laptop and resists the urge to start typing.

# What Mia figured out
Cold outreach fails on the same line over and over: "I came across your company and was impressed by what you do." Prospects know that sentence is the work of a sales rep who has done zero homework. The fix isn't a clever subject line. It's the thirty minutes of research that happens before the email is opened.

Mia uses AI not to draft the email but to *prepare* her to draft it. She drops a prospect's 10-K MD&A section into the assistant and asks: "What are the three priorities management has named for this fiscal year? Quote the lines." She pastes the prospect's LinkedIn "About" section and asks: "What kind of CX leader did they say they want to be? What words do they keep returning to?" She finds a podcast they were on and asks the assistant to pull out two specific moments where they sounded passionate or frustrated.

What she ends up with isn't a draft. It's an evidence file. Three priorities with their own words. A sense of what this person cares about. A specific moment to anchor the opener — not "I came across your company" but "I heard you on the Sales Hacker pod last spring talking about how your dispatcher team rebuilds routes by hand — that line stuck with me." Now she can write an email a human would actually read.

# Try it
Pick a real prospect. Open three public sources: their LinkedIn, their most recent earnings call transcript or company blog, and one external mention (a podcast, an article, a job posting). Then run these prompts against an approved AI tool:

1. *"I'm preparing for outreach to {name} at {company}. From the attached 10-K excerpt, list the three priorities management has named for this fiscal year. Quote each one verbatim with a one-line interpretation. Do not invent priorities not in the text."*
2. *"From this LinkedIn About section, what is this person publicly optimistic about, what are they publicly frustrated by, and what words do they repeat?"*
3. *"What's a specific, public moment I could reference to open my email — one this person would recognize as 'they actually paid attention to me'?"*

Keep the output as notes for yourself. Don't paste the output into your email; let it shape your own writing.

# Takeaway
The thirty minutes of pre-outreach research is the email. The AI doesn't write your message — it helps you walk in already knowing the person well enough to write something they'd open.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'Mia uses AI primarily to:',
            choices: [
              'Draft the cold email for her',
              'Prepare her to write the email herself',
              'Send messages at scale',
              'Score leads automatically',
            ],
            correctIndex: 1,
            explanation:
              'The lesson reframes AI from a drafting tool into a research-prep tool. The thirty minutes of homework is the email.',
          },
          {
            prompt: 'A prospect-specific anchor is:',
            choices: [
              '"I came across your company"',
              'A vague compliment about their industry',
              'A specific public moment they would recognize as "you actually paid attention"',
              'A 3x pipeline statistic',
            ],
            correctIndex: 2,
          },
        ],
      },
      {
        title: 'Writing a cold email a human would actually open',
        slug: 'cold-email-craft',
        body: `[image] A laptop showing an inbox with 47 unread cold emails, all with identical-looking subject lines. The 48th is highlighted in blue and reads differently — concrete, short, specific.
[image] A magnifying glass over a printed email draft, with three phrases crossed out in red pen: "hope this finds you well", "quick question", "synergies."

# Theo's bad batch
Theo is an SDR a year into his first sales job. He sent 200 cold emails last week and got two replies. Both were "unsubscribe." He shows the sequence to his manager Aanya. She reads three messages, hands the laptop back, and says one word: "tropes."

He looks again with fresh eyes. Every email opens with "I hope this email finds you well." Every email contains "quick question" in the first paragraph. Every email closes with "would you be open to a quick chat?" He had built a sequence out of phrases that signal one thing to every reader: *I have not thought about you for even thirty seconds.*

# What Theo learned
A cold email a human opens has four properties, in order:
1. **A real reason for reaching out to THIS person.** Not "companies like yours" — a specific public signal: a recent funding round, a job posting, a podcast quote, a tool in their stack.
2. **A concrete observation or insight tied to that signal.** What did Theo notice? What does it suggest? Not a generic claim ("AI improves productivity") but a specific one ("teams that adopt your stack typically hit the wall around 200 sequences/week").
3. **A low-friction ask.** Not "30 minutes on your calendar." A single yes/no question, or "worth a five-minute reply?".
4. **Length under 120 words.** Anything more, the reader bounces.

The hardest part isn't writing those four things. It's deleting the phrases that mark you as a rep who didn't do the work. Theo printed a hit list and taped it to his monitor: *hope this finds you well, quick question, synergies, best-in-class, companies like yours, I came across, I was impressed, circle back.* If any of those appear in his draft, he deletes them before sending.

# Try it
Take an email from your current sequence. Run this self-critique prompt against an approved AI tool — paste your draft and the prospect's public bio:

*"Critique this cold email against these four criteria: (1) is the reason for reaching out specific to THIS person, (2) is the value claim concrete and tied to their stated priorities, (3) is the ask low-friction, (4) is the body under 120 words? For each criterion, give a PASS / FAIL with one specific reason. Do not rewrite the email — give me the feedback so I can revise it."*

Then revise. Then run the same prompt again. Two cycles is usually enough.

# Takeaway
Cold-email tropes are an honesty filter — they tell the reader you didn't do the work. Cut them and the four pieces underneath have to actually be specific.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'The right way to use AI on your cold email is to:',
            choices: [
              'Ask it to "make it sound more persuasive"',
              'Have it rewrite the email for you',
              'Have it critique your draft against specific criteria so you can revise',
              'Generate 50 variants and pick one',
            ],
            correctIndex: 2,
          },
          {
            prompt: 'Which is NOT one of the four properties of a cold email worth opening?',
            choices: [
              'A real reason for reaching out to this specific person',
              'A concrete observation or insight',
              'A low-friction ask',
              'A 3x pipeline statistic',
            ],
            correctIndex: 3,
          },
        ],
      },
      {
        title: 'Qualifying leads with AI without offloading the judgment',
        slug: 'qualifying-leads',
        body: `[image] A scorecard on a screen with three columns — Fit, Intent, Budget — and a row per lead, with AI-generated 1-10 scores. A red sticky note over one row reads "but I talked to her. she's hot."
[image] Two people at a whiteboard sketching an ICP — concentric circles labelled "must-haves", "nice-to-haves", "disqualifiers" — with a stack of LinkedIn screenshots beside it.

# Aanya's pipeline
Aanya is the sales manager. She has 600 leads in the funnel and 12 reps. Last quarter she tried letting an AI scoring tool rank everything for her team and it backfired — reps ignored a hot prospect who'd hand-raised on the website because her AI score was a 4. They ranked a glossy logo at 9 that had no budget at all.

She didn't throw out AI lead-scoring. She changed how the team used it.

# What Aanya figured out
AI lead-scoring is a *flashlight*, not a judge. It points at the leads worth looking at first. It cannot replace the rep's call on whether the lead is real, ready, and worth a meeting.

The team's new rule: AI scores rank, humans decide. A good qualification prompt has three properties:
1. **Your ICP is explicit in the prompt.** Not "is this a good lead?" — "score this lead against our ICP: companies between 200 and 800 employees, in retail or logistics, where the prospect's title contains 'Ops' or 'CX'. Disqualifiers: edu / gov / sub-50-employee. Output 1-10 with one sentence justification."
2. **The AI shows its work.** Every score has a sentence. If the sentence is "based on company size and industry" — useless. If it's "score 8 because: 240 stores in retail (matches ICP), VP of CX title (matches), recent earnings-call quote about NPS gap (matches intent signal)" — useful.
3. **Reps still read the qualified-out list.** AI will rank-down a lead because of a missing data field. A rep skimming the bottom of the list will notice the one who replied to a 2023 sequence with "wrong time, ping me in Q3" — and Q3 is now.

The flashlight rule keeps the team faster *and* keeps reps' judgment in the loop.

# Try it
Take a real lead list (10-20 rows, names redacted if needed) and try this prompt:

*"Score each lead 1-10 against this ICP: {your ICP}. Disqualifiers: {your disqualifiers}. For each lead, output the score, the matched ICP criteria as a comma-separated list, and any disqualifier hit. Do NOT recommend an action — only score. If a lead lacks data to score, output 'insufficient_data' instead of guessing."*

Then read the 'insufficient_data' rows and the bottom 20% before you touch the top 20%. Often the most interesting prospect is in one of those two piles.

# Takeaway
AI scores rank. Humans qualify. Treat the score as a flashlight that points at where to look first, not as the conclusion.`,
        estimatedMinutes: 8,
        questions: [
          {
            prompt: 'A good qualification prompt makes the AI:',
            choices: [
              'Decide which leads the rep should call',
              'Rank against an explicit ICP and show its work',
              'Score on industry intuition',
              'Replace the rep’s judgment',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'When the AI returns "insufficient_data", the rep should:',
            choices: [
              'Skip the lead',
              'Auto-disqualify',
              'Investigate — that lead may be hotter than the score implies',
              'Re-prompt with a different model',
            ],
            correctIndex: 2,
          },
        ],
      },
      {
        title: 'Call notes, summaries, and the discipline of consent',
        slug: 'call-summaries',
        body: `[image] A sales rep on a video call with a recording-consent banner across the top of the screen. The banner is highlighted in yellow. A second monitor shows a structured-notes template: "discovery · pain · criteria · next step."
[image] A printed call summary on a desk with three sentences highlighted in green and one sentence highlighted in red — the highlighted-red line reads "the prospect said they were excited" with a margin note: "did they actually say that? check transcript."

# Mia after the discovery call
Mia just hung up from a 45-minute discovery call. Two years ago she would have spent an hour typing up notes. Now she has an AI summarization tool that turns the transcript into a structured stage update in 90 seconds. She loves it. She also nearly got burned by it last quarter when the assistant invented a budget number the prospect never said — and her manager pulled it from the CRM into a forecast call.

She now follows three rules.

# What Mia learned
**Rule 1 — Consent before the record button.** The first thirty seconds of every call go to consent: "Heads up — I'm taking notes with an AI assistant that transcribes the call. The transcript stays in our internal tools and isn't used to train any model. Are you OK with that?" If the answer is no, she takes notes by hand. No exceptions. Consent is not a checkbox; it is a relationship promise.

**Rule 2 — Structured prompts beat 'summarize this.'** "Summarize this call" gives you a marketing paragraph. A structured prompt gives you a usable stage update:

*"From this discovery transcript, produce a structured summary: (1) stated business pain in the prospect's own words with one direct quote, (2) decision criteria they named, (3) the budget figure if mentioned — write 'not stated' if not, (4) explicit next step they agreed to, (5) one open question they did not answer. Do NOT infer fields that are not in the transcript."*

The "do not infer" is the load-bearing line. Without it, the assistant will helpfully invent a budget.

**Rule 3 — Review every line that becomes a forecast input.** Stage, budget, decision criteria, next step — these flow into CRM fields and downstream forecasts. Mia reads the AI summary against the transcript and corrects anything the assistant softened, invented, or compressed away. Tone words like "excited" or "ready to buy" get the closest scrutiny — those are the lines that fabricate themselves.

# Try it
After your next discovery call, run the structured-summary prompt above against the transcript. Then open the transcript side-by-side and check every field. Track how often the "not stated" rule actually fires versus how often the assistant tries to fill in. That ratio is your honesty meter.

# Takeaway
Consent before record. Structured prompts before "summarize." Eyes on every line that becomes a forecast input. The AI is fast. You are the one who's accountable.`,
        estimatedMinutes: 8,
        questions: [
          {
            prompt: 'The most important line in a call-summary prompt is:',
            choices: [
              '"Be concise"',
              '"Do not infer fields that are not in the transcript"',
              '"Use markdown"',
              '"Translate jargon"',
            ],
            correctIndex: 1,
            explanation:
              'Without that constraint, the assistant invents budget, criteria, and tone words that the prospect never said.',
          },
          {
            prompt: 'Before recording a call with an AI transcription tool you must:',
            choices: [
              'Disable the assistant',
              'Get explicit, plain-language consent',
              'Mute the prospect',
              'Use a personal account',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Closing the loop — follow-ups, objections, and trust',
        slug: 'follow-up-and-objections',
        body: `[image] A laptop screen split in two. Left: a draft follow-up email referencing three specific quotes from the discovery call. Right: the transcript with those quotes highlighted in matching colors. The visual rhyme is the point.
[image] A small stack of index cards on a desk, each titled with a common objection — "we already have a tool", "no budget this quarter", "send us a deck" — with handwritten responses beneath.

# The follow-up that lands
Theo's discovery call with a logistics-ops director went well — at least, Theo thought it did. He sent the standard recap email an hour later. No reply for ten days. Then the prospect ghosted.

Aanya pulled up the recap. It was three paragraphs of "great chatting today" and "looking forward to next steps." Nothing in it referenced what the prospect had actually said.

# What Theo built
The follow-up that lands has one job: prove you listened. That's it. A great follow-up references three things the prospect said, in their own words, and ties each to a concrete next action. AI is exceptional at this — *if* you give it the right inputs.

Theo's template prompt:

*"From this call transcript, draft a follow-up email of fewer than 150 words that (1) opens with a specific quote or phrase the prospect used about their pain, (2) summarizes the two or three priorities they named, in their words, (3) proposes the specific next step they agreed to, with a concrete date, (4) names one piece of homework I owe them. Do NOT add complimentary filler. Do NOT propose next steps they did not agree to."*

Objection-handling lives in the same place. When a prospect says "we already have a tool," the answer is not a generic counter — it's a question that re-anchors the conversation in *their* stated pain. Theo keeps a library of starter prompts for the common ones:

*"The prospect said: '{quoted objection}.' Their stated pains earlier in the call were: {bullets}. Draft three diagnostic questions I can ask in reply that would re-surface those pains without arguing. Each question should be answerable in under a sentence."*

Notice the verb: *diagnostic*, not *rebuttal*. AI is bad at arguing and good at asking. Use it for the second.

# Try it
After your next discovery, run both prompts. Drop the structured follow-up into your draft folder. Then pick the most common objection your prospects raise and pre-write three diagnostic questions for it. Tape them next to your monitor.

# Takeaway
Follow-ups don't have to be clever — they have to prove you listened. AI is great at extracting what the prospect said and bad at arguing why they should care. Use it for the first, not the second.`,
        estimatedMinutes: 8,
        questions: [
          {
            prompt: 'A follow-up email’s job is to:',
            choices: [
              'Push for a meeting',
              'Prove you listened',
              'Restate your product’s features',
              'Summarize what you said on the call',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'When using AI to handle a common sales objection, the best framing is:',
            choices: [
              'Generate a clever rebuttal',
              'Draft three diagnostic questions tied to the prospect’s stated pain',
              'List three counter-claims',
              'Ask the AI what to do',
            ],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  {
    title: 'AI for Managers',
    slug: 'ai-for-managers',
    description: 'Lead a team that adopts AI safely and measurably.',
    targetRole: Role.MANAGER,
    targetLevel: AiLevel.POWER_USER,
    tier: AiLevel.POWER_USER,
    isCore: false,
    prerequisiteSlugs: ['ai-basics', 'kapitus-foundations'],
    orderIndex: 15,
    lessons: [
      {
        title: 'Setting an AI policy your team will actually follow',
        slug: 'setting-an-ai-policy',
        body: `[image] A manager named Reza at a conference table with a one-page printed policy in front of him. The page is highlighted in three colors — green (approved), yellow (caution), red (forbidden). Around the table, his team is reading their own copies.
[image] A diagram on a whiteboard with three columns labelled "Data class", "Approved tool", "What happens if you're not sure" — the third column is filled in with a single sentence: "Ask in #ai-help. Don't guess."

# Reza's lunchroom problem
Reza manages a 14-person ops team. Two months ago he sent the company AI policy to his team — a 22-page PDF written by Legal. Nobody read it. He found out because Tomas in his team pasted a customer-account spreadsheet into ChatGPT to "ask it a quick question" — and now Compliance was calling.

The policy wasn't wrong. It was unreadable. Reza had to write the version his team would actually use.

# What Reza wrote
The team-facing AI policy fits on one page. Not because Legal's version is bad — Legal's version is the source of truth — but because a policy that doesn't fit on one page does not change behavior. Reza's one-pager has three sections:

**Approved tools, by data class.** A simple table. Rows are data classes (Public, Internal, Customer PII, Production credentials). Columns are tools (the enterprise AI workspace, the public ChatGPT, the internal coding copilot). Cells are green / yellow / red. No prose.

**The single golden rule.** "Customer PII and production credentials never leave approved tools. When in doubt, redact or ask." That's one sentence. Tomas can remember it.

**The escalation path.** "If you are not sure: ask in #ai-help before you paste. If something already went wrong: tell Reza or page Compliance. We will not blame you for asking; we will blame you for hiding it." This sentence does most of the cultural work.

The 22-page Legal version still exists. It is linked from the one-pager. Most of the team will never read it. That is fine — the people who need the 22 pages know who they are.

# Try it
Open your company's current AI policy. Time how long it takes to read. If it's more than five minutes, you have the same problem Reza had. Try this prompt with an approved AI tool, passing in the full policy text:

*"From this AI-use policy, extract: (1) the approved tools per data class as a simple table, (2) the one or two golden rules that cover 80% of day-to-day decisions, (3) the escalation path when employees are unsure. Output a one-page summary an employee could read in 60 seconds. Do not soften the prohibitions."*

Then sit with your team and walk through it. Ask one question: "what part of this is unclear?" Their answers are your edit list.

# Takeaway
A policy that doesn't fit on one page does not change behavior. Write the version your team will actually read; link the long version for the people who need it.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'The most important property of a team-facing AI policy is:',
            choices: [
              'It covers every edge case',
              'It is short enough to be read and remembered',
              'It is written by Legal',
              'It is in a Confluence page',
            ],
            correctIndex: 1,
          },
          {
            prompt:
              'The escalation sentence "we will not blame you for asking; we will blame you for hiding it" exists to:',
            choices: [
              'Discourage questions',
              'Make incidents visible so they can be addressed',
              'Replace training',
              'Shift blame to Legal',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Coaching adoption — meeting your team where they actually are',
        slug: 'coaching-adoption',
        body: `[image] A manager (Lena) sitting next to a teammate at a monitor, pointing at a prompt on screen. Two cups of coffee. The teammate is mid-sentence, animated. The body language reads "learning together", not "training session."
[image] A simple chart on a wall labelled "Where the team is" with four columns — "Hasn't tried it", "Tried once, got bad result", "Uses it for one thing", "Folds it into their week" — with sticky-note initials in each column.

# Lena's three buckets
Lena manages a marketing team of 11. After the company rolled out an approved AI workspace, she did the thing every manager does first: she scheduled a 60-minute training and showed everyone the tool. Attendance was 11/11. Adoption two weeks later was 3/11.

She regrouped. The 60-minute training had assumed her team was one group. They weren't.

# What Lena figured out
Adoption is not a training problem. It's a *meeting-people-where-they-are* problem. Her team is in four buckets:

1. **Hasn't tried it.** Either too busy or quietly intimidated. A training doesn't reach them — they showed up but didn't follow up.
2. **Tried it once, got a bad result, gave up.** Possibly the most underestimated group. They've decided the tool is bad based on a single shallow prompt.
3. **Uses it for one thing.** They've found one workflow where it saves them time and aren't curious about the rest.
4. **Folds it into their week.** Two or three on every team. They're the ones who naturally discover new uses.

The intervention is different for each bucket — and the intervention is mostly *not* training. For Bucket 1, Lena does 30-minute pair sessions; she does the typing, they describe a real task. For Bucket 2, she asks them to bring the failed prompt; she shows them how a richer prompt with role, context, and constraints fixes it. For Bucket 3, she pairs them with a Bucket 4 person for a single afternoon. For Bucket 4, she asks them to write up the one workflow they're most excited about and shares it with the team in a Friday note.

What she stopped doing: scheduling more group trainings.

# Try it
List your direct reports in those four buckets. Be honest about who's in each. Then write one sentence per person about the next intervention you'll try. Use this prompt to help yourself plan:

*"I manage a team of {N}. Here is each person's current state with our approved AI workspace: {bullets}. For each person, propose a single specific 30-minute intervention I could try in the next two weeks — pair session, prompt-clinic, workflow show-and-tell, peer pairing. Be specific about which intervention fits which person and WHY. Do not recommend a group training as the next step."*

Then actually book the sessions.

# Takeaway
Adoption stalls because managers treat the team as one group and reach for "another training." Meet each report where they actually are. The intervention is almost always a 30-minute pairing, not a slide deck.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'The most common reason an "AI rollout" stalls is:',
            choices: [
              'The tool is bad',
              'The training was treated as a single intervention for an audience that isn’t single',
              'The team is technophobic',
              'Legal blocked it',
            ],
            correctIndex: 1,
          },
          {
            prompt:
              'For a teammate who tried AI once and got a bad result, the right next step is to:',
            choices: [
              'Schedule another group training',
              'Have them bring the failed prompt and show them how a richer prompt fixes it',
              'Wait six months and reintroduce the tool',
              'Move them off the team',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Giving feedback your reports can actually use',
        slug: 'feedback-that-lands',
        body: `[image] A manager and direct report at a small table in a quiet conference room. A printed note between them with three lines: "what I observed", "what I think it means", "what I'd love to see next." Two cups of tea.
[image] A printed performance message with phrases color-coded — green ("specific behavior", "concrete next step"), yellow (subjective interpretation), red (vague language like "be more strategic").

# Ben's slack draft
Ben manages a six-person engineering team. He sat down to write a 1:1 feedback message for Priya, a strong engineer whose pull-request comments had been blunt enough that two teammates flinched. He opened a doc. He wrote: "Hey — wanted to chat about your communication on PRs." He stared at it for ten minutes. He deleted it.

The honest problem: he didn't want to be a manager who said "your communication needs work."

# What Ben learned about useful feedback
Feedback that lands has three properties, in this order:

**Specific.** Name a concrete observed behavior with at least one example. Not "your communication is harsh." Try "in yesterday's PR review, you wrote 'this is wrong, don't do this' three times on Jamie's PR — Jamie unmuted you in the team channel after." Specificity is the part the report can't argue with.

**Kind.** Frame the feedback as growth toward an outcome the report wants. Not as correction. Priya's growth lever is being seen as a senior leader; blunt PR comments cap that growth. The kind frame is "this is the thing standing between you and the senior IC promotion you've talked about wanting."

**Actionable.** Give one concrete thing to try next. Not "be more diplomatic." Try "before submitting a PR review, read your top three comments aloud — if any starts with 'this is wrong,' rewrite it as a question."

Ben used AI not to write the message but to test it. He wrote a draft, then prompted: *"Here is my draft feedback. Critique it on three criteria: is it specific (names observed behavior with an example), is it kind (frames as growth toward an outcome the report wants), is it actionable (proposes one concrete thing to try next week)? For each criterion, give PASS / FAIL with a single reason. Do not rewrite the message — give me feedback so I can revise."*

Two passes later, the draft was something Priya could hear without flinching.

# Try it
Write a 1:1 feedback message you've been putting off. Then run the critique prompt above. Revise. Run it again. Send the message after the second pass, not the first.

# Takeaway
Specific. Kind. Actionable — in that order. AI can stress-test your draft against those three properties; it can't deliver the message. That part is yours.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'The three properties of useful 1:1 feedback are:',
            choices: [
              'Quick, polite, encouraging',
              'Specific, kind, actionable',
              'Direct, balanced, written',
              'Documented, scheduled, witnessed',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'The right way to use AI on a feedback draft is to:',
            choices: [
              'Ask it to write the message',
              'Have it critique your draft against criteria so you can revise',
              'Have it predict the report’s reaction',
              'Generate three variants and pick one',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Synthesizing performance signals without inventing facts',
        slug: 'perf-review-synthesis',
        body: `[image] A manager at a desk with five color-coded sticky notes in a row, each labelled with a date — "Jan 8", "Jan 22", "Feb 5", "Feb 19", "Mar 4". Beside them, an open document titled "Maya — Q1 starting point."
[image] A printed perf-review draft with one paragraph circled and a note in the margin: "where did this come from? — find the 1:1 it sourced or delete."

# Perf-review season
Lena has six perf reviews to draft in three weeks. She has a quarter of 1:1 notes per report. The reviews need to be specific (vague reviews are useless), source-grounded (no inventing wins or weaknesses that aren't backed by something real), and structured (highlight wins, strengths, growth areas, open questions). Last cycle she wrote them from memory and it took 80 hours.

She knows AI can do most of this. She also knows AI is dangerously good at inventing plausible-sounding feedback that didn't actually happen.

# What Lena does now
She uses an AI summarization tool for the first draft and treats it like a fast intern who is bad at being honest about gaps. The prompt that works:

*"From these 1:1 notes for {report's name} over Q{N}, produce a structured starting point for their perf review with these sections: highlight wins, strengths, growth areas, open questions for me to verify before finalizing. For every claim, cite which 1:1 supports it (by date). If a section has no support in the notes, write 'not covered in the notes — verify before including.' Do NOT invent wins, strengths, or growth areas that are not in the source notes. If I press you to fill a gap, refuse and flag it as an open question."*

Three things make this prompt work. The citation requirement forces the assistant to ground every claim. The "not covered in the notes" rule blocks the impulse to fill in gaps. The "if I press, refuse" line stops the assistant from caving when Lena asks "but isn't she also strong at X?"

Even with the prompt, Lena reads the draft against the actual notes. The phrases she scrutinizes hardest are the tone words — "consistently demonstrates," "is widely respected," "shows initiative." Those are the lines that invent themselves. If she can't point to the specific 1:1 they came from, she deletes them.

# Try it
Pull a quarter of 1:1 notes for one report. Run the structured-starting-point prompt. Then sit with the draft next to the original notes and check every claim. Count how many got cut. That count is your hallucination-resistance score. It should be a low number — but never zero on the first draft.

# Takeaway
AI accelerates the first draft of a perf review by an order of magnitude. The acceleration only matters if every line is source-grounded. Make the prompt insist on citation. Verify against the actual notes. Delete what doesn't trace.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'The most important line in a perf-review summarization prompt is:',
            choices: [
              '"Be concise"',
              '"For every claim, cite which 1:1 supports it; if a section has no support, say so"',
              '"Use bullet points"',
              '"Be encouraging"',
            ],
            correctIndex: 1,
          },
          {
            prompt:
              'When reviewing an AI-generated perf-review draft, the phrases to scrutinize hardest are:',
            choices: [
              'Numeric metrics',
              'Tone words like "consistently demonstrates" or "widely respected"',
              'Section headers',
              'Dates',
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        title: 'Building an AI-fluent team — measure what actually matters',
        slug: 'measuring-ai-fluency',
        body: `[image] A simple dashboard on a screen with three tiles — "Hours saved per teammate per week", "Workflows folded into routine", "Sensitive-data incidents (target: 0)". One tile is highlighted green, one yellow, one red.
[image] A team retrospective board with three columns: "What we tried", "What changed for us", "What we'd try next." Sticky notes in each.

# Reza's quarterly readout
Reza is preparing his quarterly readout. The exec asked: "how is AI adoption going on your team?" Reza could answer with vanity metrics — "we ran four trainings, 14 of 14 people have logins, we have 240 monthly active sessions" — and it would land fine. He wouldn't be lying. He also wouldn't be telling the truth about what changed.

He decided to measure the things he actually cares about.

# What Reza measures
Three numbers, tracked monthly.

**Hours saved per teammate per week.** Not estimated by him. Self-reported by the team in a one-question survey: "this week, roughly how many hours did AI save you compared to doing the same work the old way?" The number isn't perfectly accurate. It doesn't need to be. The *trend* over six months tells him what he needs to know.

**Workflows folded into routine.** Reza keeps a running list — when a teammate shows up with "I do X every week with AI now," it gets added. Not "I tried it once." Folded into the routine. A team adopting AI well grows this list by 1-2 workflows per teammate per quarter.

**Sensitive-data incidents.** Target: zero. Counted carefully — anything from "I almost pasted PII and caught myself" up to "I did paste and Compliance had to be looped in." A small non-zero number with self-reports is healthier than zero, because zero usually means people aren't telling you.

What Reza does NOT measure: tool logins, message counts, prompt counts. Those numbers go up whether or not adoption is real.

# Try it
Pick the three numbers you'd defend to your skip-level. Write the question you'd ask your team to gather each one. Then write the question you'd ask yourself to look at the trend honestly. Use this prompt to pressure-test your draft:

*"Here are three metrics I'm proposing to track AI adoption on my team: {your three}. For each, name (1) what behavior it actually measures, (2) the most likely way it could be gamed or look good while reality is bad, (3) what trend over two quarters would tell me the team is genuinely getting better. Be skeptical."*

The skeptical pass is the point. Any metric that can be gamed by chasing the number will be — usually by accident.

# Takeaway
Measure what you'd defend to your skip-level. Hours saved, workflows folded in, incidents kept low — those reflect real change. Logins and message counts will go up either way.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'A meaningful adoption metric is:',
            choices: [
              'Number of tool logins',
              'Hours saved per teammate per week, self-reported and trended',
              'Slack messages mentioning AI',
              'Hours spent in trainings',
            ],
            correctIndex: 1,
          },
          {
            prompt: 'A small non-zero number of self-reported sensitive-data near-misses is:',
            choices: [
              'A failure',
              'Healthier than a reported zero — because zero usually means people aren’t telling you',
              'Cause for HR escalation',
              'Irrelevant',
            ],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
];

async function main() {
  const isKapitus = (process.env.CLIENT ?? '').toLowerCase() === 'kapitus';
  // The "demo-org" id is stable across environments; under CLIENT=kapitus it
  // doubles as the shared Kapitus org that all employees attach to. Stamp a
  // slug so the auth flow can find it without hardcoding the id.
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {
      slug: isKapitus ? 'kapitus' : 'demo',
      name: isKapitus ? 'Kapitus' : 'Demo Co',
    },
    create: {
      id: 'demo-org',
      slug: isKapitus ? 'kapitus' : 'demo',
      name: isKapitus ? 'Kapitus' : 'Demo Co',
      industry: isKapitus ? 'Financial Services' : 'Software',
      companySize: isKapitus ? '201-1000' : '51-200',
      plan: Plan.GROWTH,
      planSeats: 100,
    },
  });

  const engineering = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Engineering' } },
    update: {},
    create: { organizationId: org.id, name: 'Engineering' },
  });

  const sales = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'Sales' } },
    update: {},
    create: { organizationId: org.id, name: 'Sales' },
  });

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@demo.test',
      name: 'Ada Admin',
      role: Role.ADMIN,
      jobTitle: 'Head of People',
      aiLevel: AiLevel.POWER_USER,
      departmentId: engineering.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'manager@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'manager@demo.test',
      name: 'Mona Manager',
      role: Role.MANAGER,
      jobTitle: 'Sales Manager',
      aiLevel: AiLevel.PRACTITIONER,
      departmentId: sales.id,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'eve@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'eve@demo.test',
      name: 'Eve Employee',
      role: Role.EMPLOYEE,
      jobTitle: 'Account Executive',
      aiLevel: AiLevel.BEGINNER,
      departmentId: sales.id,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'ed@demo.test' } },
    update: {},
    create: {
      organizationId: org.id,
      email: 'ed@demo.test',
      name: 'Ed Employee',
      role: Role.EMPLOYEE,
      jobTitle: 'Software Engineer',
      aiLevel: AiLevel.PRACTITIONER,
      departmentId: engineering.id,
    },
  });

  // Combine hardcoded baseline paths with the file-driven Kapitus academy
  // paths so the same upsert loop handles both. Idempotent — re-running the
  // seed updates lesson bodies + quiz questions in place.
  const filePaths: SeedPath[] = FILE_PATH_SLUGS.map((slug) => loadPathFromContent(slug));
  const allPaths: SeedPath[] = [...PATHS, ...filePaths];

  for (const path of allPaths) {
    const created = await prisma.learningPath.upsert({
      where: {
        organizationId_slug: { organizationId: org.id, slug: path.slug },
      },
      update: {
        title: path.title,
        description: path.description,
        isPublished: true,
        tier: path.tier,
        isCore: path.isCore,
        prerequisiteSlugs: path.prerequisiteSlugs,
        orderIndex: path.orderIndex,
      },
      create: {
        organizationId: org.id,
        title: path.title,
        slug: path.slug,
        description: path.description,
        targetRole: path.targetRole,
        targetLevel: path.targetLevel,
        tier: path.tier,
        isCore: path.isCore,
        prerequisiteSlugs: path.prerequisiteSlugs,
        orderIndex: path.orderIndex,
        isPublished: true,
      },
    });

    for (let i = 0; i < path.lessons.length; i++) {
      const lessonSpec = path.lessons[i]!;
      const lesson = await prisma.lesson.upsert({
        where: {
          learningPathId_slug: { learningPathId: created.id, slug: lessonSpec.slug },
        },
        // Stride of 10 so lab-kind lessons can interleave at odd-multiples (15,
        // 35, 55) without renumbering reads. Update applies on re-seed so old
        // rows with stride=1 also rebase.
        update: { title: lessonSpec.title, body: lessonSpec.body, orderIndex: i * 10 },
        create: {
          learningPathId: created.id,
          title: lessonSpec.title,
          slug: lessonSpec.slug,
          body: lessonSpec.body,
          estimatedMinutes: lessonSpec.estimatedMinutes,
          orderIndex: i * 10,
        },
      });

      const existingQuiz = await prisma.quiz.findFirst({ where: { lessonId: lesson.id } });
      const quiz =
        existingQuiz ??
        (await prisma.quiz.create({
          data: { lessonId: lesson.id, title: `${lessonSpec.title} — quiz` },
        }));

      const questionCount = await prisma.quizQuestion.count({ where: { quizId: quiz.id } });
      if (questionCount === 0) {
        await prisma.quizQuestion.createMany({
          data: lessonSpec.questions.map((q, idx) => ({
            quizId: quiz.id,
            prompt: q.prompt,
            choices: q.choices,
            correctIndex: q.correctIndex,
            explanation: q.explanation ?? null,
            orderIndex: idx,
          })),
        });
      }
    }

    for (const userId of [employee1.id, employee2.id]) {
      await prisma.learningPathAssignment.upsert({
        where: { learningPathId_userId: { learningPathId: created.id, userId } },
        update: {},
        create: {
          learningPathId: created.id,
          userId,
          assignedById: admin.id,
        },
      });
    }
  }

  // ── Global Labs (hands-on AI scenarios) ──────────────────────────────────
  // Labs ship as `*.lab.json` content files under packages/db/content/labs/.
  // organizationId = null = visible to every tenant. Idempotent: matched by
  // `slug` (unique).
  const labsDir = path.join(__dirname, '..', 'content', 'labs');
  let labsUpserted = 0;
  if (fs.existsSync(labsDir)) {
    const labFiles = fs.readdirSync(labsDir).filter((f) => f.endsWith('.lab.json'));
    for (const file of labFiles) {
      const raw = fs.readFileSync(path.join(labsDir, file), 'utf-8');
      const spec = JSON.parse(raw) as {
        slug: string;
        title: string;
        brief: string;
        systemPrompt: string;
        seededContext: Record<string, unknown>;
        rubric: Record<string, unknown>;
        estimatedMinutes: number;
        learningPathId?: string | null;
        isPublished?: boolean;
      };
      await prisma.lab.upsert({
        where: { slug: spec.slug },
        update: {
          title: spec.title,
          brief: spec.brief,
          systemPrompt: spec.systemPrompt,
          seededContext: spec.seededContext,
          rubric: spec.rubric,
          estimatedMinutes: spec.estimatedMinutes,
          isPublished: spec.isPublished ?? true,
        },
        create: {
          slug: spec.slug,
          organizationId: null,
          learningPathId: spec.learningPathId ?? null,
          title: spec.title,
          brief: spec.brief,
          systemPrompt: spec.systemPrompt,
          seededContext: spec.seededContext,
          rubric: spec.rubric,
          estimatedMinutes: spec.estimatedMinutes,
          isPublished: spec.isPublished ?? true,
        },
      });
      labsUpserted += 1;
    }
  }

  // ── Attach labs to AI Basics as lab-kind lessons ──────────────────────────
  // Each lab becomes an inline lesson at a skill-checkpoint orderIndex so
  // learners practice as they progress through the path instead of consuming
  // labs from a separate page. The lessons are global (org-scoped via the
  // path's nullable organizationId on the LearningPath row).
  const labLessonAttachments: Array<{
    labSlug: string;
    pathSlug: string;
    lessonSlug: string;
    title: string;
    orderIndex: number;
    estimatedMinutes: number;
    brief: string;
  }> = [
    {
      labSlug: 'prompt-injection-defense',
      pathSlug: 'ai-basics',
      lessonSlug: 'lab-spot-the-injection',
      title: 'Practice: spot the prompt injection',
      // Reads are at stride 10 (0, 10, 20, …). Interleaved labs sit at 15/35/55
      // so they fall between specific reading lessons.
      orderIndex: 15,
      estimatedMinutes: 8,
      brief:
        'A user is trying to trick a customer-support assistant into revealing hidden admin notes. Refuse the injection without breaking persona.',
    },
    {
      labSlug: 'pii-redaction',
      pathSlug: 'ai-basics',
      lessonSlug: 'lab-redact-the-pii',
      title: 'Practice: redact PII before you send',
      orderIndex: 35,
      estimatedMinutes: 8,
      brief:
        'Summarize a customer export without echoing any names, emails, phone numbers, or social security numbers in your reply.',
    },
    {
      labSlug: 'policy-compliance',
      pathSlug: 'ai-basics',
      lessonSlug: 'lab-stay-on-policy',
      title: 'Practice: stay within the company policy',
      orderIndex: 55,
      estimatedMinutes: 8,
      brief:
        'Answer the user’s question without violating the company AI-use policy. Reference the policy in your reasoning when needed.',
    },
    {
      labSlug: 'ai-basics-capstone',
      pathSlug: 'ai-basics',
      lessonSlug: 'lab-ai-basics-capstone',
      title: 'Capstone: draft a real reply, end-to-end',
      // Sits at orderIndex 80, after the SCENARIO at 75, as the final
      // skill-checkpoint of the AI Basics path. Exercises all five reads
      // (prompt craft, hallucination spotting, PII handling, policy
      // compliance, knowing when not to use AI) in a single open-ended task.
      orderIndex: 80,
      estimatedMinutes: 10,
      brief:
        'One open-ended workplace task. Produce a specific, policy-compliant, PII-safe reply in 1–3 turns. Every skill from the path applies at once.',
    },
    // ── Agent A2 — AI for Sales labs ─────────────────────────────────────────
    {
      labSlug: 'sales-cold-email-rewrite',
      pathSlug: 'ai-for-sales',
      lessonSlug: 'lab-cold-email-rewrite',
      title: 'Practice: rewrite a cold email like a human',
      orderIndex: 15,
      estimatedMinutes: 9,
      brief:
        'Rewrite a generic cold-email template into something a real human would actually open. Keep it under 120 words. Cut the spam tropes.',
    },
    {
      labSlug: 'sales-deal-pii-handling',
      pathSlug: 'ai-for-sales',
      lessonSlug: 'lab-deal-pii-handling',
      title: 'Practice: summarize a deal note without leaking PII',
      orderIndex: 35,
      estimatedMinutes: 8,
      brief:
        'Summarize a messy deal note for your sales manager without ever sending the prospect’s SSN, personal cell, or home address to the assistant. Use placeholders.',
    },
    {
      labSlug: 'sales-account-research',
      pathSlug: 'ai-for-sales',
      lessonSlug: 'lab-account-research-capstone',
      title: 'Capstone: synthesize account research before a first call',
      orderIndex: 50,
      estimatedMinutes: 10,
      brief:
        'Turn a tangle of public signals into a one-page, source-grounded pre-call brief. No hallucinated facts. Explicit unknowns named.',
    },
    // ── Agent A2 — AI for Managers labs ──────────────────────────────────────
    {
      labSlug: 'manager-feedback-drafting',
      pathSlug: 'ai-for-managers',
      lessonSlug: 'lab-feedback-drafting',
      title: 'Practice: draft 1:1 feedback that lands',
      orderIndex: 15,
      estimatedMinutes: 9,
      brief:
        'Draft a 1:1 feedback message that is specific, kind, and actionable. Iterate with the coach until it would actually land.',
    },
    {
      labSlug: 'manager-perf-review-summary',
      pathSlug: 'ai-for-managers',
      lessonSlug: 'lab-perf-review-summary',
      title: 'Practice: summarize 1:1 notes without inventing facts',
      orderIndex: 35,
      estimatedMinutes: 10,
      brief:
        'Get a structured perf-review starting point from a quarter of 1:1 notes — every claim source-cited, every gap explicitly named.',
    },
    {
      labSlug: 'manager-coaching-prompt-design',
      pathSlug: 'ai-for-managers',
      lessonSlug: 'lab-coaching-prompt-capstone',
      title: 'Capstone: design a coaching prompt your reports will use',
      orderIndex: 50,
      estimatedMinutes: 10,
      brief:
        'Design a reusable coaching-prompt template your direct reports can paste into ChatGPT or Claude to coach themselves — without becoming a yes-machine.',
    },
  ];

  let labLessonsUpserted = 0;
  for (const attach of labLessonAttachments) {
    const lab = await prisma.lab.findUnique({ where: { slug: attach.labSlug } });
    // Attach to every path matching the slug (typically one per tenant, plus
    // any global copy). Each path needs its own lab-lesson row because
    // Lesson.learningPathId is the relation.
    const learningPaths = await prisma.learningPath.findMany({
      where: { slug: attach.pathSlug },
    });
    if (!lab || learningPaths.length === 0) continue;

    for (const learningPath of learningPaths) {
      await prisma.lesson.upsert({
        where: {
          learningPathId_slug: {
            learningPathId: learningPath.id,
            slug: attach.lessonSlug,
          },
        },
        update: {
          title: attach.title,
          body: attach.brief,
          estimatedMinutes: attach.estimatedMinutes,
          orderIndex: attach.orderIndex,
          kind: 'LAB',
          labId: lab.id,
        },
        create: {
          learningPathId: learningPath.id,
          title: attach.title,
          slug: attach.lessonSlug,
          body: attach.brief,
          estimatedMinutes: attach.estimatedMinutes,
          orderIndex: attach.orderIndex,
          kind: 'LAB',
          labId: lab.id,
        },
      });
      labLessonsUpserted += 1;
    }
  }

  const scenariosResult = await seedScenarios(prisma, org.id);
  const lessonImagesResult = await seedLessonImages(prisma);

  // ── Global assessment-item bank ───────────────────────────────────────────
  // Items are global (organizationId = null) so every tenant samples from the
  // same bank. Idempotent: matched by prompt text.
  const bankPath = path.join(__dirname, '..', 'content', 'assessment-bank', 'items.json');
  const bankItems: Array<{
    prompt: string;
    choices: string[];
    correctIndex: number;
    level: AiLevel;
    category: string;
  }> = JSON.parse(fs.readFileSync(bankPath, 'utf-8'));
  let bankCreated = 0;
  for (const item of bankItems) {
    const existing = await prisma.assessmentItem.findFirst({
      where: { organizationId: null, prompt: item.prompt },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.assessmentItem.create({
      data: {
        organizationId: null,
        prompt: item.prompt,
        choices: item.choices,
        correctIndex: item.correctIndex,
        level: item.level,
        category: item.category,
      },
    });
    bankCreated += 1;
  }

  // ── Kapitus mode: consolidate personal-org signups into the shared org ──
  // Before the white-label rollout, every signup got `<Name>'s Organization`
  // and saw an empty curriculum. Move those users + their data into the
  // shared Kapitus org so they pick up where they left off. Idempotent —
  // a no-op once every user is in the kapitus org.
  let reconciledUsers = 0;
  if (isKapitus) {
    const strays = await prisma.user.findMany({
      where: { organizationId: { not: org.id } },
      select: { id: true, organizationId: true, role: true, email: true },
    });
    for (const u of strays) {
      const oldOrgId = u.organizationId;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: u.id },
          data: { organizationId: org.id, role: Role.EMPLOYEE },
        }),
        prisma.assessment.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.auditLog.updateMany({
          where: { actorId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.aiCoachSession.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.conversation.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
        prisma.prompt.updateMany({
          where: { userId: u.id, organizationId: oldOrgId },
          data: { organizationId: org.id },
        }),
      ]);
      // The orphan personal org is now data-free; delete cascades through any
      // remaining shared rows (Departments, Invitations) that were never
      // attached to a user.
      await prisma.organization.delete({ where: { id: oldOrgId } }).catch(() => {});
      reconciledUsers += 1;
    }
  }

  console.log('Seed complete:', {
    org: org.id,
    users: [admin.email, manager.email, employee1.email, employee2.email],
    paths: PATHS.map((p) => p.slug),
    assessmentItems: { created: bankCreated, total: bankItems.length },
    labs: { upserted: labsUpserted, labLessons: labLessonsUpserted },
    scenarios: scenariosResult,
    lessonImages: lessonImagesResult,
    reconciledUsers,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
