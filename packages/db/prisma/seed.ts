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
  {
    title: 'AI for Legal Intake',
    slug: 'ai-for-legal-intake',
    description:
      'Use AI to capture facts cleanly, spot red flags, and hand off cases without leaking client information.',
    targetRole: Role.EMPLOYEE,
    targetLevel: AiLevel.PRACTITIONER,
    tier: AiLevel.PRACTITIONER,
    isCore: false,
    prerequisiteSlugs: [],
    orderIndex: 20,
    lessons: [
      {
        title: 'The first thirty seconds: spotting case viability',
        slug: 'first-thirty-seconds-case-viability',
        body: `[image] An intake specialist named Elena at a clean desk, headset on, mid-call, eyes on a one-page triage card pinned beside her monitor. Soft afternoon light from a window to her left. Navy and gold accents on the firm's branded notepad.
[image] A close-up of the triage card itself — three short columns labelled "Mechanism · Injury · Time" — with handwritten check marks in the first two columns and a question mark in the third.

# 2:14 on a Tuesday

Elena has been at CEO Lawyer for nine weeks. The phone rings and she picks up like she has a thousand times now. Carla on the other end is mid-sentence before Elena says hello — something about being rear-ended, neck pain, "and I don't know if I even have a case."

Elena breathes. The first thirty seconds of an intake call do most of the work on whether the firm signs the case, whether the caller is helped, and whether the next forty minutes are a productive triage or a tour through someone's worst week. The thirty seconds are not about being warm — though they are warm — they are about quietly answering three questions in her own head.

# Three questions, every time

The triage card on the wall has three columns. Mechanism. Injury. Time.

**Mechanism.** What actually happened to this person? Rear-end on the freeway. Slip on a wet floor at a grocery store. Dog bite on a neighbor's porch. The mechanism tells Elena the body of law that applies — auto, premises, animal — and whether the firm even handles it. CEO Lawyer is a personal injury firm; calls about a tenant dispute or a divorce get routed elsewhere, kindly, in the first two minutes.

**Injury.** Is the caller hurt? In what way? "I'm a little sore" is a different call from "I went to the ER and they're sending me for an MRI." There is no case without an injury, and the severity sets the priority of the handoff. Elena does not diagnose anything — she captures what the caller says.

**Time.** When did this happen? Florida's personal injury statute of limitations is two years for incidents on or after March 24, 2023; before that, it was four. A caller describing an incident from forty months ago needs Elena to flag the SOL the second she hears the date — not because the call ends, but because every minute Elena spends matters more.

These three questions take twenty to thirty seconds at the open of the call. She does not ask them as a checklist; she lets the caller talk, and she listens for the answers.

# What AI does and doesn't do here

Elena does not have AI in her ear during the call. She has it after the call. Once the human conversation is done, she pastes her own notes — never raw caller PII into a public tool — into the firm's internal assistant and asks it to flag anything that looks off in the mechanism/injury/time triangle. AI is good at noticing patterns: "the caller mentioned they treated themselves for two weeks before seeing a doctor — that is a gap of care worth surfacing for the case manager."

What AI is not good at is the call itself. The call is a human conversation, often with someone who is in pain, financially stressed, or angry. The most important thirty seconds happen ear-to-ear, not screen-to-screen.

# Try it

Next call you take, write down the three answers — mechanism, injury, time — within the first minute, as bullets, not sentences. After the call, paste your bullets into the internal assistant and prompt:

*"Here are my triage bullets from a personal-injury intake call. Read them like a case manager would. Are there any obvious red flags — SOL near the line, no insurance, mechanism we don't handle, missing facts a case manager will need? Do not invent details I did not provide. Reply in three short bullets."*

The reply is for you, not for the case file. The case file gets the cleaned-up summary you wrote yourself.

# Takeaway

The first thirty seconds of any intake call live or die on three short answers — mechanism, injury, time. Capture them clean, then let AI help you sanity-check what you wrote.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'Elena uses the "mechanism, injury, time" triage to:',
            choices: [
              'Score the caller on a 1-10 scale before transferring',
              'Quickly answer three questions in her head about whether the firm can help and how urgently',
              'Decide settlement value during the call',
              'Read aloud as a script so callers know it is a real firm',
            ],
            correctIndex: 1,
            explanation:
              'The triage is a private check Elena runs in her head: does the firm handle this kind of case, is there an actual injury, and is the SOL clock close. Settlement value is never decided on an intake call.',
          },
          {
            prompt: 'When in the call does Elena use AI?',
            choices: [
              'Live during the call, listening in real time',
              'Never — AI is forbidden in intake',
              'After the call, on her own typed notes, to sanity-check what she wrote',
              'Before the call, to generate questions',
            ],
            correctIndex: 2,
            explanation:
              'The call itself is human-to-human. AI helps after — pasting cleaned notes (no raw PII) into the internal assistant to flag pattern-level red flags before handoff.',
          },
          {
            prompt: 'What is the SOL risk on an intake call?',
            choices: [
              'Statute of Limitations — the legal time window to file. If close to expiring, the case must move faster.',
              'Settlement Offer Limit, a firm policy on max demand',
              'Standard Operating Letter, the boilerplate engagement letter',
              'A scoring metric for case quality',
            ],
            correctIndex: 0,
            explanation:
              'Statute of limitations is the deadline to file suit. In Florida personal injury, generally 2 years (or 4 years if the incident predates the 2023 change). Catching it early in the call protects the caller and the firm.',
          },
        ],
      },
      {
        title: 'Capturing facts without leading the caller',
        slug: 'capturing-facts-without-leading',
        body: `[image] Elena's hand and a steno pad. The page shows short, dated bullets — no full sentences, no interpretive language. A yellow highlighter sits next to it. Light from a single desk lamp.
[image] A whiteboard split in two columns labelled "OPEN QUESTION" and "LEADING QUESTION". Under OPEN: "What happened next?" Under LEADING: "And then he ran the red light, right?" The second one is circled in red.

# The call after lunch

Elena's third call of the afternoon is a man named Robert who fell at a hardware store. He is angry. He thinks he knows whose fault it is. He has, by minute two, told Elena what he believes happened: "the manager left a spill there for like an hour, I'm sure of it."

Elena writes none of that down. She writes: "caller reports floor was wet near aisle 6; caller estimates spill present 'about an hour' — basis for estimate not stated." Two different sentences with very different lifespans.

# Why leading questions ruin intake notes

Intake notes are not testimony. But they often become the first written record of the caller's account, and that record gets read by attorneys, opposing counsel in discovery, and sometimes the caller themselves at a deposition months later. If the intake notes reflect what Elena thought happened — based on the questions she asked — instead of what the caller actually said, the case is harder to defend.

A leading question is one that contains its own answer. "He ran the red light, right?" is leading. "What color was the light?" is open. "You hit your head, didn't you?" is leading. "Were you injured? Where?" is open.

In a casual call, leading questions feel natural and helpful — Elena is just trying to move things along. But in the written record, they collapse two different things into one: what the caller knows, and what Elena assumed. Six months later, the case manager will not know which is which.

# Three habits that fix this

**Quote, don't paraphrase.** When the caller says "he was going way too fast", Elena writes: caller stated "he was going way too fast." When the caller estimates a speed, she writes the caller's estimate verbatim and notes "basis for estimate not stated." She does not write "speeding was a factor."

**Capture uncertainty.** If the caller says "I think it was Tuesday but it might have been Wednesday," Elena writes exactly that — including the uncertainty. The case manager needs to know what is firm and what is hazy.

**Separate facts from opinions.** Two columns in her head: things the caller saw and things the caller believes. "The other driver had been drinking" is a belief unless the caller saw the breath test result. Elena writes: "caller's impression: other driver appeared impaired; basis: slurred speech, glassy eyes per caller."

# Using AI to find your own leading questions

After a call, paste your notes into the internal assistant and ask:

*"Here are my intake notes. Look for any place where I may have summarized the caller's belief as a fact, or written language that suggests I led the caller to an answer. Flag specific lines. Do not rewrite the notes — just point at the lines."*

The assistant is good at pattern-matching this. It will catch things like "she clearly slipped on the spill" — the word "clearly" is doing interpretive work the caller did not. Elena edits the line to "caller stated she slipped on a wet patch near aisle 6."

This habit, more than any other, is what separates an intake specialist whose notes hold up six months later from one whose notes get the firm in trouble.

# Try it

Take your last five intake records and run them through the prompt above. Count the lines the assistant flags. The first time most people try this, it flags more than they expected. That is the value — you cannot fix what you cannot see.

Then, one habit at a time: practice quoting verbatim for two weeks, then practice capturing uncertainty, then practice separating fact from opinion. Within a month the leading-language flags drop to near zero.

# Takeaway

A good intake note records what the caller said and how confident they were — not what you concluded from it. Use AI to surface the leading language you didn't notice you wrote.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'A leading question in intake is one that:',
            choices: [
              'Comes first in the call',
              'Contains its own answer ("he ran the red, right?")',
              'Asks about leadership at the firm',
              'Leads to a follow-up',
            ],
            correctIndex: 1,
            explanation:
              'Leading questions plant the answer. They collapse what the caller knows with what the intake specialist assumed — which damages the written record.',
          },
          {
            prompt: 'When the caller estimates "he was going about 50", Elena should:',
            choices: [
              'Write "speeding was a factor"',
              "Write the caller's estimate verbatim and note that the basis for the estimate was not stated",
              'Ignore it as hearsay',
              'Write "approximately 45-55 mph"',
            ],
            correctIndex: 1,
            explanation:
              'Quote verbatim and tag the uncertainty. Editorial cleanup destroys the line between what the caller witnessed and what they inferred.',
          },
        ],
      },
      {
        title: 'AI-assisted intake notes: what is safe to paste, what is not',
        slug: 'ai-intake-notes-safe-to-paste',
        body: `[image] Elena's screen showing a chat with the firm's internal AI assistant on the left and a redaction key on a sticky note on the right — "[CALLER_NAME] · [DOB] · [ADDRESS] · [SSN]". A second sticky on the monitor reads "When in doubt, ask Judge."
[image] A side-by-side comparison: on the left a prompt containing a full SSN, address, and DOB highlighted in red; on the right the same prompt with all four fields replaced by bracketed placeholders, highlighted in green.

# Judge walks past

Judge is the firm's compliance lead — ex-bar-counsel, now in-house, recurring presence in every staff training. She is not unkind, but she is precise. Today she walks past Elena's desk and glances at the screen.

"What's that you're pasting?"

Elena's chat window has a paragraph in it that includes the caller's full name, date of birth, the last four of an SSN, a street address, and a phone number. She was going to ask the assistant to "summarize this intake call."

"This is the firm's internal tool, right?" Elena asks. "It's behind the firewall."

"Internal tools are still tools. And Rule 1.6 doesn't have an exception for 'I thought it was internal.' Walk me through what you're doing."

# What Rule 1.6 actually says

State bar Rule 1.6 — Confidentiality of Information — boils down to: a lawyer (and by extension everyone working under that lawyer's supervision) shall not reveal information related to a client's representation unless the client has given informed consent, the disclosure is implicitly authorized to carry out the representation, or a narrow exception applies.

The rule does not say "public tools only." It says all client information. The exception for "carrying out the representation" lets Elena type a summary of the call into the case-management system, because that is part of the representation. It does not automatically extend to every AI tool the firm happens to have a license to.

For the firm's approved internal assistant, the rule operationally means this: facts useful to summarize a call are fine; raw identifiers that uniquely tie facts to a real person are not. The principle is data minimization. The assistant does not need the SSN to give Elena a summary.

# The safe-to-paste list, the never-paste list

**Safe to paste, in the firm's approved internal assistant only:**

- First name + last initial.
- City and state of the incident.
- Mechanism and circumstances of injury.
- Names of public actors mentioned in police reports (the officer, the store manager who filed the incident report).
- Treatment categories ("ER visit, X-rays, muscle relaxers", "two chiropractor appointments").
- Insurance carrier names without policy numbers.

**Never paste, in any AI tool, internal or external:**

- Full name with date of birth.
- Full Social Security Number, ever.
- Driver's license number.
- Home street address.
- Medical record numbers.
- Insurance policy numbers and group numbers.
- Full credit card numbers.

This list is not exhaustive but it covers ninety-five percent of real cases. When a category isn't on either list, the default is don't paste — ask Judge or the case manager.

# How to write the prompt anyway

Elena edits her prompt. Where she had the caller's name, she writes [CALLER_NAME]. Where she had the DOB, she writes [DOB_REDACTED]. The summary the assistant produces is just as useful — case manager handoff, red-flag triangulation, gap-in-treatment detection. The placeholders carry zero information about who Carla actually is.

The trick is that the firm's case-management system, which is the actual system of record, holds the real identifiers under proper access controls. The assistant's job is to help Elena think — not to be the system of record.

# Try it

Take a recent intake note you wrote. Walk through it line by line. Mark every place where you wrote a value that appears on the never-paste list, and replace it with a placeholder. Then paste the redacted version into the assistant and ask for a summary. Compare it to your own summary. If the assistant's redacted version is just as useful as one with raw identifiers — and it almost always is — you have your habit.

# Takeaway

Rule 1.6 doesn't care which tool you used; it cares whether client information left the protected system. Paste facts, not identifiers — the assistant does its best work either way.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'Rule 1.6 confidentiality applies:',
            choices: [
              "Only to public AI tools, not the firm's internal tools",
              'To all tools — internal or external — when client information is involved',
              'Only to the lawyer, not staff',
              'Only to written communications, not chat',
            ],
            correctIndex: 1,
            explanation:
              "Rule 1.6 covers all client information regardless of the tool. The firm's case-management system is the system of record; AI assistants are aids that work fine on redacted inputs.",
          },
          {
            prompt: 'Which item is on the "never paste" list?',
            choices: [
              'The city of the incident',
              'The mechanism of injury',
              "The caller's full SSN",
              'The insurance carrier name (without policy number)',
            ],
            correctIndex: 2,
            explanation:
              "Full SSN is a never-paste identifier. City, mechanism, and carrier name (without policy numbers) are safe in the firm's approved internal assistant.",
          },
          {
            prompt: 'After redacting raw identifiers, the AI summary is usually:',
            choices: [
              'Useless without the raw data',
              'Just as useful — case manager handoff and red-flag triangulation work fine on facts alone',
              'Less accurate but acceptable',
              'Slower to produce',
            ],
            correctIndex: 1,
            explanation:
              'The assistant is reasoning about facts and patterns, not running a database lookup. Redacted prompts produce equally useful summaries.',
          },
        ],
      },
      {
        title: 'Red flags: SOL, no insurance, prior counsel',
        slug: 'red-flags-sol-insurance-prior-counsel',
        body: `[image] A close-up of a desk calendar with three dates circled in red — date of incident, two years out from date of incident, and today — connected by a thin line of marker labelled "SOL window."
[image] A laptop screen with three pinned tabs labelled "POLICE REPORT", "INSURANCE", "PRIOR COUNSEL CHECK" — and a fourth tab labelled "JUDGE — slack" with one unread message.

# Friday at 4:52pm

Elena's last call of the week is Tomás. He's calling about a fall from scaffolding at a construction site three months ago. Right shoulder dislocated. ER same day. He sounds tired.

The mechanism, injury, and time look fine on the surface. Three months is well within the SOL. The injury is real and documented. The mechanism is workplace — workers' comp overlay, but not unusual. Elena starts to think this is a clean intake.

Then the details start coming. He is technically classified as an independent contractor by the GC — not a W-2 employee. He was already on partial workers' comp from a different employer for a 2023 lumbar injury, but didn't mention that to the ER. He spoke briefly to another PI attorney in March, who never returned his calls and was never retained. He posted a TikTok last month lifting his daughter at her birthday party with the supposedly injured arm. He is undocumented and asks Elena if that hurts his case.

By the end of the call Elena has a triage page with seven red flags on it. The case is not a no — but it is not a yes Elena can give on her own. It is the kind of case that goes to an attorney for a sign-or-decline call before anyone signs a retainer.

# The red flags that actually matter

**Statute of limitations** is the deadline to file suit. In Florida personal injury, generally two years (four for incidents before March 2023, but most active cases now are under the two-year rule). A statute issue does not always kill the case — there are tolling rules, discovery exceptions, and accommodation arguments — but a near-line SOL is a sign-it-or-decline-it-fast trigger, not a let-me-think-about-it-for-a-week.

**No insurance on either side** is a structural problem. Even a clear-liability case becomes economically unworkable if there is no coverage to collect against, no UM/UIM on the client's side, and no recoverable assets on the at-fault driver's side. The firm sometimes signs these — but only with eyes wide open.

**Prior counsel on the same matter** raises a conflict-check question and a "why did the prior attorney decline or disengage?" question. Even if the caller never signed a retainer, the firm verifies and documents the situation before signing.

**Plaintiff's own admitted fault** in a contributory-negligence state (Alabama, Maryland, North Carolina, Virginia, D.C.) can bar recovery entirely. In comparative-fault states, it reduces it. The intake specialist captures the admission verbatim and flags it.

**Gaps in treatment** between the injury and significant medical care give the defense a "your client wasn't really hurt" argument. The intake specialist flags both the gap and any explanation the caller offers.

**Pre-existing condition** in the same body part as the new injury is not a deal-breaker but is a litigation issue. The intake specialist captures the prior condition and notes that the medical workup will need to address apportionment.

**Social-media activity contradicting the injury claim** is one of the most modern flags. The TikTok of Tomás lifting his daughter with his shoulder is exactly the kind of thing the defense will surface in discovery. Elena flags it for the attorney before retainer.

**Plaintiff is undocumented** does not bar recovery in Florida — undocumented plaintiffs have the same right to recover compensatory damages — but it carries communication, deposition-prep, and W-2-versus-cash-wage considerations that the case team needs to know going in.

# How AI helps you finish the triage

After the call, Elena pastes her redacted notes into the internal assistant and prompts:

*"From these intake notes, identify red flags relevant to a personal injury case in Florida. For each, classify severity as DEAL-BREAKER, WORKABLE-WITH-CAVEAT, or MONITOR, and recommend a concrete next step (route to attorney for review, request a specific record, send a preservation letter, etc.). Do not opine on settlement value or whether the firm should sign."*

The assistant is good at this. It will catch flags Elena listed and sometimes one she missed. She edits the output, attaches it to the case file, and the attorney has a sixty-second read instead of a ninety-minute conversation with cold notes.

# Try it

Take an intake where you weren't sure whether to recommend signing. Redact the identifiers, paste your notes into the assistant, and run the prompt above. Compare its red-flag list to the one you would have made yourself. The overlap teaches you what to look for; the divergence teaches you where your eye is still developing.

# Takeaway

A clean-sounding case can have seven red flags under the surface. Capture them in your notes, then use AI to triage severity and next steps before the attorney sees the file.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'A near-line statute of limitations on an intake call should trigger:',
            choices: [
              'A slower decision — wait two weeks and think about it',
              'A faster decision — sign-or-decline now, the clock is running',
              'An immediate decline regardless of facts',
              "Nothing — SOL is the attorney's problem, not the intake specialist's",
            ],
            correctIndex: 1,
            explanation:
              'SOL is a hard deadline. Near-line SOL means the firm has to make the sign-or-decline call quickly, not slowly. The intake specialist flags it the moment it appears.',
          },
          {
            prompt:
              'The caller volunteers a TikTok showing them using the supposedly injured arm. The intake specialist should:',
            choices: [
              'Ignore it — social media is irrelevant',
              'Capture it verbatim and flag it for the attorney before retainer',
              'Tell the caller to delete the video',
              'Sign the case immediately to prevent the caller from posting more',
            ],
            correctIndex: 1,
            explanation:
              'Telling the caller to delete is spoliation — never. The intake specialist captures the fact and flags it so the attorney can make a sign decision with eyes open. Discovery will find the video regardless.',
          },
        ],
      },
      {
        title: 'Handing off cleanly to the case manager',
        slug: 'clean-handoff-to-case-manager',
        body: `[image] Two desks side by side — Elena's intake station on the left, a case manager named Priya at the right desk with a printed handoff sheet in front of her. A short head-nod between them. The handoff sheet is divided into four labelled sections.
[image] A close-up of the handoff sheet itself: four sections labelled "Facts captured", "Open questions", "Red flags + severity", "Immediate next step". The first three are filled in tight bullets; the fourth has a single sentence and a name.

# The Monday morning catch-up

Priya is one of CEO Lawyer's case managers. She inherits Elena's intakes. Monday at 9:04am she is sitting with twelve new files from the weekend's calls — five clean signs, four "needs attorney review", two declines, one she can't tell from the notes.

The twelfth file is the one she can't tell. The intake notes are detailed — three pages of bullet points, time-stamped, with the caller's words quoted. But there is no summary at the top. Priya has to read every bullet to figure out what the case actually is, and even then she's guessing at what Elena thought of it.

She walks over to Elena's desk and asks. Elena answers in twenty seconds. The case is clear, the red flag is contained, the next step is obvious. Priya goes back to her desk and writes it on the file herself.

That twenty-second conversation should have been one paragraph at the top of the handoff. The whole point of an intake-to-case-manager handoff is that Priya doesn't have to come find Elena to do her job.

# What a clean handoff has

Four sections, every time.

**Facts captured.** A short paragraph or six to eight bullets covering the mechanism, injury, time, location, treatment so far, insurance situation, and prior counsel status. This is the meat of the intake — what the case is. Not what Elena thinks of it.

**Open questions.** A bullet list of things the case manager needs to verify or follow up on — police report not yet pulled, MRI authorization pending, exact date of incident unclear (caller said "April 14 or 15"), photos of the other vehicle missing. The case manager will work through this list; Elena's job is to make the list complete and explicit, not to silently leave gaps for Priya to discover.

**Red flags and severity.** The list Elena built with the assistant after the call. Each flag tagged DEAL-BREAKER, WORKABLE-WITH-CAVEAT, or MONITOR. If Elena had to guess on severity, she says so.

**Immediate next step.** One sentence. Not "follow up." Specifically: "Route to attorney before retainer because of two WORKABLE-WITH-CAVEAT flags (prior counsel never retained; pre-existing lumbar condition). If attorney approves, Priya to schedule signing meeting Wednesday and request the 2018 lumbar workup from the prior workers' comp case." Names a person, an action, and a timeline.

# Using AI to draft the handoff, not write the case file

Elena writes the four sections herself. She does not paste the entire intake into the assistant and ask for "a handoff." That would invite paraphrase drift — the assistant softening a caller's quote, or sharpening Elena's uncertainty into a fact. Instead, she writes the handoff and then uses the assistant as a second pair of eyes:

*"Here is the four-section handoff I am about to attach to a personal-injury intake file. Critique it: does the 'Facts captured' section state any fact not supported by the bullets in 'Open questions'? Is any red flag missing a severity tag? Does the 'Immediate next step' name a person, an action, and a timeline? Flag specific lines."*

The assistant catches gaps. Elena fixes them. Two or three minutes total, after a thirty-minute call that took her ninety seconds to summarize on her own. The handoff is for the next person.

# What good looks like

Six months in, the test of a clean handoff is simple: Priya should be able to act on the file without coming to Elena's desk. If Priya is walking over twice a week to ask "what did you mean by this?", the handoffs are too loose. If Priya never has to, the handoffs are doing what they should.

Elena's manager checks one randomly selected handoff per week, gives feedback within twenty-four hours, and tracks the count of "walked over to ask" interactions. Three months in, that count drops from four a week to zero. That is the metric that matters.

# Try it

Pick your three most recent intakes. Re-write each handoff using the four-section structure above. Then run the critique prompt against each. The first time, your handoffs may grow a section or two. By the third, the four-section structure feels native — and the case manager stops needing to walk over.

# Takeaway

A handoff isn't a record of the call — it's a working document for the next person. Four sections, every time: facts, open questions, red flags with severity, one specific immediate next step.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'The four sections of a clean intake-to-case-manager handoff are:',
            choices: [
              'Caller info, Insurance, Treatment, Demand',
              'Facts captured, Open questions, Red flags with severity, Immediate next step',
              'Summary, Strategy, Settlement value, Signature',
              'Mechanism, Injury, Time, Witnesses',
            ],
            correctIndex: 1,
            explanation:
              'The four-section handoff (facts / open questions / red flags + severity / immediate next step) is the standard. It lets the case manager act without having to come back and ask.',
          },
          {
            prompt: 'Elena uses AI on the handoff to:',
            choices: [
              'Write the handoff for her from the raw notes',
              'Critique the handoff she wrote, flagging gaps and missing severity tags',
              'Predict whether the case will settle',
              'Generate the engagement letter automatically',
            ],
            correctIndex: 1,
            explanation:
              'Elena writes the handoff (to avoid paraphrase drift) and uses AI as a second pair of eyes — flagging missing severity tags, vague next steps, and unsupported claims.',
          },
        ],
      },
    ],
  },
  {
    title: 'AI for Legal Marketing',
    slug: 'ai-for-legal-marketing',
    description:
      'Use AI to write legal-marketing content that converts AND survives bar review — geo-pages, social, reviews, and campaigns.',
    targetRole: Role.EMPLOYEE,
    targetLevel: AiLevel.PRACTITIONER,
    tier: AiLevel.PRACTITIONER,
    isCore: false,
    prerequisiteSlugs: [],
    orderIndex: 21,
    lessons: [
      {
        title: 'Why legal marketing is different',
        slug: 'why-legal-marketing-is-different',
        body: `[image] A marketing lead named Priya standing at a whiteboard, marker in hand, with three columns drawn — "Normal Marketing", "Legal Marketing", "What Changes" — a colleague leaning in to read. A printed copy of Florida Rule 4-7 sits on the table.
[image] A laptop screen showing two side-by-side mocked ads: the left labelled "BANNED" with phrases circled — "GUARANTEED", "#1 BEST", "WE WILL WIN" — and the right labelled "COMPLIANT" with phrases — "experienced", "we focus on", "results vary".

# Priya's first week

Priya joins CEO Lawyer as head of marketing after six years at a SaaS company. Her first week she does what any marketer would do: she opens the website, opens the ad accounts, reads the brand book, and starts writing down what she wants to change.

Two days in, Judge — the firm's compliance lead — pulls up a chair at her desk. "Before you ship anything, you need to read one document." She slides a printed copy of the state bar advertising rules across the desk. Fifty-eight pages.

Priya's reaction is the same reaction every legal marketer has on day three: this is not normal marketing. The rules are not "best practices" — they are the floor below which the firm faces real consequences. The freedom Priya had at her old job to claim "#1 platform" or "guaranteed results" is not freedom she has here.

# What the rules actually forbid

Most state bar advertising rules — ABA Model Rule 7.1, and state analogues like Florida Rule 4-7, New York DR 2-101, California Rule of Professional Conduct 7.1 — share a common core. The specifics vary; the spirit does not.

**False or misleading statements.** Anything that creates a substantial likelihood that a reasonable person will form an unjustified expectation. The famous "you'll get a settlement of at least $50,000" is the clear case. The subtler case is "we have over a 99% success rate" — what does success mean, over what cases, what time period? If the firm cannot substantiate it on the same page, it cannot say it.

**Guarantees of outcome.** "We guarantee results." "We will win your case." "You will not pay unless we recover." That last one — the contingency-fee statement — is allowed in most states with specific framing ("no fee unless we win" or "no fee unless we recover"), but the bare "you will not pay" can run afoul of cost-and-expense rules. Different from outcome guarantees.

**Comparative claims without substantiation.** "Best personal injury firm." "#1-rated." "Top lawyers." Some states (Florida, Texas) require objective substantiation on the same page and limit which third-party endorsements count. Other states (New York, Massachusetts) outright ban comparative superlatives.

**Implied client testimonials that omit required disclaimers.** "John got $400,000 for his case" without "Past results do not guarantee future outcomes" is a violation in nearly every state.

**Misleading specialty claims.** "Specialist in personal injury" requires actual state-bar certification in most jurisdictions. "We focus our practice on personal injury" does not.

# What changes about the marketing job

The job is not less creative. It is more constrained, which forces a different kind of creativity — the kind that lives below the surface of the copy, in the choice of localization, the choice of audience, the choice of specific facts to surface.

Priya cannot say "best." She can say "experienced". She cannot say "guaranteed." She can say "no fee unless we win" with the contingency-fee framing. She cannot say "we will win your case." She can describe the firm's process — investigation, expert workup, willingness to take cases to trial — in concrete terms. She cannot say "we have a 95% success rate." She can say "we focus exclusively on personal injury and have tried cases through verdict" if both of those are true.

The shift is from outcome-promise marketing to process-and-substance marketing. A reader cannot evaluate "best" — they can evaluate "we have tried over 30 personal injury cases to verdict in the last decade" if you supply the number.

# AI in this constrained space

AI is a useful drafting partner here, but a dangerous one without explicit constraints. Out of the box, an AI assistant will cheerfully draft a landing page full of "best" and "guaranteed" and "winning" — those words appear constantly in marketing training data. Priya's prompts have to disable them.

Her standard prefix when drafting any marketing copy:

*"You are drafting copy for a law-firm landing page. DO NOT use 'best', 'top', '#1', 'top-rated', 'guarantee', 'guaranteed', 'we will win', 'leading', 'winning lawyers', 'unmatched'. Required: at the end of the page, include the standard attorney-advertising disclaimer 'Past results do not guarantee future outcomes' and jurisdictional notice 'Licensed in [state]'. If you draft a statistic, attribute it or leave a [SOURCE] placeholder."*

Forty words at the top of every prompt. They cost nothing and eliminate the most common bar violations before they reach review.

# Try it

Take a current marketing page and run it through the assistant with this prompt:

*"Audit this page against ABA Model Rule 7.1 and Florida Rule 4-7. List every phrase that could plausibly be flagged by a compliance reviewer — outcome guarantees, superlatives without substantiation, missing disclaimers, implied specialty without state-bar certification. Output a table: 'phrase', 'rule citation', 'suggested compliant alternative'."*

The output is your edit list. Walk it back to Judge. The third or fourth time you do this, you start writing copy that does not need the edit list.

# Takeaway

Legal marketing isn't normal marketing with a disclaimer pasted on the bottom. The rules forbid the very phrases that marketing training data is most fluent in. Build the constraints into every prompt — and trust them more than you trust the model.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'Comparative claims like "best" and "#1" in legal advertising:',
            choices: [
              'Are always allowed',
              'Are banned in most states or require on-page objective substantiation',
              'Only matter in TV ads, not web copy',
              "Are decided case-by-case by the firm's discretion",
            ],
            correctIndex: 1,
            explanation:
              'Comparative superlatives without substantiation are banned outright in some states (NY, MA) and require on-page substantiation in others (FL, TX). Either way, default-no is the safe posture.',
          },
          {
            prompt: 'The shift legal marketing forces on a marketer is:',
            choices: [
              'Less creativity overall',
              'From outcome-promise marketing to process-and-substance marketing',
              'No web presence at all',
              'TV ads only',
            ],
            correctIndex: 1,
            explanation:
              'The constraints push the creative work onto things a reader can evaluate — specific localization, process details, tried-cases counts — instead of "best"-style claims a reader cannot.',
          },
          {
            prompt: 'When prompting AI to draft legal marketing copy, you should:',
            choices: [
              'Trust the default output and edit lightly',
              'Always include explicit constraints disabling "best", "guarantee", "win", and similar banned phrases',
              'Use a different AI model than for other content',
              'Avoid AI entirely',
            ],
            correctIndex: 1,
            explanation:
              'AI defaults to outcome-promise language because that is what marketing training data is full of. Forty words of explicit constraints at the top of every prompt eliminate the most common bar violations before they reach review.',
          },
        ],
      },
      {
        title: "Writing geo-pages that don't read like spam",
        slug: 'geo-pages-that-dont-read-like-spam',
        body: `[image] A wide-screen monitor showing a city map of Augusta with annotations — I-20, Augusta University Medical Center, Richmond County courthouse — beside an open document titled "Augusta, GA landing page draft v3".
[image] Two stacked screenshots: top one labelled "FIND-AND-REPLACE" with the same generic copy ten times with different city names highlighted; bottom labelled "GENUINELY LOCAL" with copy that references specific roads, hospitals, and statutes.

# The thirty-page audit

Priya audits the firm's existing geo-pages on a Tuesday. There are thirty-four of them — one per city the firm services. Twenty-nine of them are the same page with the city name swapped. The headline is "Personal Injury Lawyer in [CITY]." The body talks about "this community" and "your area." The map embed is the only thing that actually changes.

Google penalizes this. Readers smell it. Bar reviewers flag it as misleading-by-omission. The pages do not rank, do not convert, and do not survive review. They are a thirty-four-page exercise in producing nothing.

She pulls one page — the one for Augusta, Georgia — and rewrites it from scratch. She has it ranking on page two of Google within ten days.

# What "genuinely local" means

A genuinely local page is one where the body is unsalvageable if you find-and-replace the city name. If you swap "Augusta" for "Macon," nothing else in the page should still read true.

The signal density that makes a page genuinely local is specific, public, verifiable, and physically anchored.

**Roads and intersections that locals know.** Not "the highway" — "the I-20 / I-520 interchange" or "Washington Road near Augusta Mall." Augustans recognize those names; an out-of-towner does not.

**Hospitals and medical landmarks.** "Augusta University Medical Center" and "Doctors Hospital" are the two main level-trauma facilities. A page that says "the local hospital" is generic. A page that says "if you are taken to AU Medical Center or Doctors Hospital" reads like the firm has actually handled cases in Augusta.

**Courthouses and jurisdictional facts.** "Richmond County Civil Court handles personal-injury cases under \\$25,000; State Court handles larger civil claims." A reader doing research will check this and find it accurate.

**Statute-of-limitations specifics for the state.** "Georgia personal-injury statute of limitations is 2 years from date of injury (O.C.G.A. § 9-3-33)." Not "the statute of limitations may apply." The citation is itself a signal.

**Specific local industries or populations.** Augusta is home to Fort Eisenhower (formerly Fort Gordon). Military families have overlapping VA-benefits, federal-employee, and TRICARE considerations. A page that mentions this is doing work; a page that does not is a generic page that says "Augusta" on it.

# The local-facts brief is the prompt

Priya's workflow is: build the local-facts brief by hand, then prompt the assistant to draft the page against the brief.

Her local-facts brief for any new city is one document with five sections: roads & corridors, hospitals & medical, courts & jurisdiction, SOL & state-specific law, populations & industries. She fills it out from public sources in two to four hours. That work is the page; AI is the typing.

Her prompt looks roughly like this:

*"Draft an Augusta, Georgia geo-page for CEO Lawyer, a personal injury firm. Use ONLY the local facts in the brief below. DO NOT invent local references. DO NOT use 'best', 'top', '#1', 'guarantee', 'we will win', 'leading'. Required: include the standard attorney-advertising disclaimer at the bottom. Length: 600-900 words. Tone: direct and informative, not promotional. Structure: (1) opening that names a real road or landmark, (2) what to do at the scene, (3) where local clients typically receive care, (4) the SOL with citation, (5) what the firm does on a typical case in Richmond County, (6) closing with contact and disclaimer.\\n\\nLOCAL FACTS BRIEF:\\n[paste the brief]"*

The output is the first draft of a page she can ship after compliance review. The work that made it good was the brief.

# Where AI breaks down

The model will, on its own, occasionally insert a road name that is right-for-the-wrong-city, a hospital that does not exist, or a statute citation with a wrong section number. Every claim a reader could verify needs verification — Priya's compliance review includes a Google search for each named road, hospital, court, and statute. The check takes ten minutes per page. It catches one or two errors per page on the first generation.

The second time she generates a page for the same city — say, when a new attorney joins and the page needs updating — the assistant has not learned anything; it will make new errors. Verification is permanent, not first-draft-only.

# Try it

Pick a city the firm services where the existing page is weak. Build the local-facts brief by hand from three sources: city government site, courthouse listings, and one local news site. Run the prompt above. Then verify every named entity. Compare the result to the page that exists today.

The first page takes four to six hours. The third page takes two. The brief makes the difference; AI is the multiplier.

# Takeaway

A geo-page lives or dies on whether the body would be unsalvageable after a find-and-replace. Build the local-facts brief by hand, prompt the assistant against it, verify every named entity, and ship a page that earns its rank.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt: 'A "genuinely local" geo-page is one where:',
            choices: [
              'The city name appears at least ten times',
              'The body would be unsalvageable if you find-and-replaced the city name with a different one',
              'A local lawyer wrote it',
              'It has a map embed',
            ],
            correctIndex: 1,
            explanation:
              'Find-and-replace is the test. If swapping city names leaves the page still reading true, the page is generic — not local.',
          },
          {
            prompt: 'The work that makes an AI-drafted geo-page good is:',
            choices: [
              'The cleverness of the prompt',
              'The local-facts brief Priya builds by hand before prompting',
              'The choice of AI model',
              'The temperature setting',
            ],
            correctIndex: 1,
            explanation:
              'AI is the multiplier; the brief is the work. Without a hand-built local-facts brief, the assistant has nothing real to draft against.',
          },
        ],
      },
      {
        title: 'Social posts that survive bar review',
        slug: 'social-posts-bar-review',
        body: `[image] A phone screen showing a draft LinkedIn post next to a printed copy of the state bar's advertising rule excerpt — both highlighted in different colors. A red pen rests across the phone.
[image] A whiteboard with three stacked rows — "Hook", "Claim", "Disclaimer" — each row holding a tight, single-sentence example of a compliant social post fragment.

# Wednesday morning content review

Priya runs a thirty-minute Wednesday content review with the firm's social manager Marcus. They look at every post going out that week before it goes out. The compliance check fits inside the meeting.

The cost of not doing this is one bad post a month — not catastrophic on its own, but compounding. A bar complaint over a single post is rare; a pattern of borderline posts becomes the basis for a formal review. Priya prefers the thirty minutes.

# What a compliant social post looks like

The good news is that the structure is repeatable. A compliant social post for a law firm has three parts.

**The hook.** A specific, true observation about the topic. "Florida's personal-injury statute of limitations changed from four years to two in March 2023 — for incidents on or after that date." This is a fact a reader can verify, and it earns the rest of the post. Hooks that are claims about the firm ("we are the best", "we have won millions") are weaker AND riskier.

**The substance.** A short explanation, list, or example — fifty to a hundred and fifty words. "What this means for you: if you were injured in a car accident in 2024 or 2025, the clock to file is two years from the date of the accident. Insurance settlements can take months — starting the process early matters more than ever." This is the value of the post. The reader walks away knowing one thing they did not before.

**The disclaimer or anchor.** "This is general information, not legal advice for your specific case. Past results do not guarantee future outcomes. Licensed in Florida." On platforms like LinkedIn or the firm's blog this lives at the bottom. On platforms like X or Instagram with character limits, the firm uses a pinned disclaimer at the profile level and a "see profile for required disclosures" tag at the end of the post.

# What it does not look like

The patterns that get firms in trouble on social are predictable.

**Outcome-promise posts.** "I just won my client a $1.2M settlement! If you're injured, we get results!" — names a specific number without context, implies the same is likely for any reader, and lacks the required "past results" disclaimer. Fixable: "We recently resolved a serious-injury case for a client through pre-trial settlement. Every case is different. Past results do not guarantee future outcomes." The post is now a process post, not an outcome promise.

**Superlative posts.** "We are the top personal injury firm in [City]. Hire the best." — banned superlative, no substantiation. Even if there is some Avvo rating or Best Lawyers listing, it has to be on-page and the rating organization has to qualify under the state's rules.

**Specialty-claim posts.** "Our specialists handle every kind of accident case." — implies state-bar specialty certification. Most lawyers in most states are not certified specialists. The compliant phrasing is "we focus our practice on personal injury" or "we handle exclusively personal injury cases."

**Identifying-client posts.** "Today we are proud to have helped Maria Hernandez recover from her injuries." — names the client, which without express written consent violates Rule 1.6. The fix is generality: "Today we are proud to have helped another Augusta client recover from a serious injury." Better yet: the post is about the work, not a client at all.

# The AI workflow that works

Marcus drafts a post. He runs it through the assistant with this prompt before Priya sees it:

*"Audit this draft social post for a Georgia personal-injury firm against state bar Rule 7.1 and analogous rules. Flag every: outcome guarantee, superlative without substantiation, missing required disclaimer, implied specialty without certification, and identification of a specific client without consent. Output a table — 'flagged phrase', 'rule concern', 'suggested compliant alternative'. Do not rewrite the whole post."*

The assistant catches three or four issues per draft on average. Marcus revises. Priya's review takes thirty seconds instead of three minutes per post. The firm ships fifteen compliant posts a week.

# When AI suggests something risky

Twice in Priya's first two months, the assistant has suggested a "compliant alternative" that is itself a problem — usually because the model has interpolated a phrase from training data that sounds careful but is not. The safety net is: anything the assistant suggests as a compliant alternative still goes through Judge for the harder calls. The assistant accelerates ninety percent of the work; Judge handles the ten percent it gets wrong.

# Try it

Find a draft social post in your queue. Run the audit prompt. Then have Judge — or whoever in your firm holds the compliance pen — review the assistant's flags and suggested alternatives. The third or fourth time you do this, you start seeing the patterns yourself, and the post comes out clean on the first draft.

# Takeaway

A compliant social post is hook + substance + disclaimer. Use AI to audit drafts against the rules, not to write them from scratch — and run the harder calls past whoever holds the compliance pen.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'The three parts of a compliant social post for a law firm are:',
            choices: [
              'Hook, claim, call-to-action',
              'Hook, substance, disclaimer or anchor',
              'Headline, story, hashtags',
              'Win, settlement amount, call us now',
            ],
            correctIndex: 1,
            explanation:
              'Hook (specific, true observation) + substance (short explanation) + disclaimer / anchor is the repeatable structure that survives bar review.',
          },
          {
            prompt: 'A post that names a specific client by name is:',
            choices: [
              'Fine if the case is settled',
              "A Rule 1.6 confidentiality issue without the client's express written consent",
              'Only a problem on Facebook',
              'Required for SEO',
            ],
            correctIndex: 1,
            explanation:
              'Client identification is confidential information under Rule 1.6. Express written consent is required to identify a client publicly. Generality (or omitting the client altogether) is safer.',
          },
        ],
      },
      {
        title: "Review responses that don't reveal client information",
        slug: 'review-responses-no-client-info',
        body: `[image] A laptop showing a Google review at 2 stars with the reviewer's text on the left, and a draft response document on the right. The response is short — three sentences, marked up in pen.
[image] A close-up of a sticky note pinned to the monitor reading "Public response = brochure. Private message = case discussion. Do not mix the two."

# The 2-star at 9:14am

A 2-star Google review lands on the firm's profile overnight. The reviewer claims her case manager never returned her calls, the firm pressured her to settle while she was still in PT, and the settlement was lower than she expected. She signs her name. She names her case manager.

Priya sees it at 9:14am. By 10am she has a draft response. By noon, she has decided not to post it, and to post a different, much shorter one instead.

# Why the first draft was wrong

The first draft did what almost everyone wants to do when a negative review names specifics. It answered the specifics.

"Renee, we appreciate your feedback. The settlement amount in your case reflected the insurance carrier's policy limits and the documented medical bills. Daniel was on a previously scheduled medical leave during the period you reference, and the case manager who covered for him left two voicemails on August 14 and August 18 that may not have reached you. We worked diligently to..."

Every sentence of that draft is, in some way, a confirmation of a fact about Renee's representation. Even saying "Daniel was on medical leave" confirms that Renee was a client, that Daniel was her case manager, and that there was a gap. Even neutral acknowledgments confirm the relationship. Even thanking her for "her time as a client" confirms it.

Rule 1.6 — confidentiality of information related to representation — does not have a "she said it first" exception. The fact that Renee disclosed the existence of the representation publicly does not give the firm permission to disclose anything more.

# The mental shift

A public response to a review is a brochure, not a case discussion. It speaks to the audience of future potential clients reading the firm's profile, not to the reviewer. The reviewer is reached, if at all, in a private channel.

Once Priya internalizes that distinction, the response shrinks. The shorter, the better. Under eighty words is the target.

# What a compliant response looks like

The response Priya posts:

*"Thank you for sharing your feedback. We take all client concerns seriously. Confidentiality rules prevent us from discussing specifics of any individual case publicly. Please call our office at [phone] and ask for the managing attorney — we would welcome the chance to address your concerns directly."*

Forty-five words. It does not confirm Renee was a client. It does not contradict her account. It does not name the case manager. It does not defend a settlement amount. It invites a private conversation where Rule 1.6 still governs but a real exchange can occur.

The audience reading this — future clients researching the firm — sees a firm that does not get defensive in public, that points to a real path for resolution, and that holds confidentiality even under provocation. That is a stronger signal than any point-by-point rebuttal.

# When the review is factually wrong

Reviews are sometimes flat-out fabrications — a competitor, a never-was-client, a confused person who is reviewing the wrong firm. Two paths.

**Reporting to the platform.** Google and Yelp both have procedures for flagging reviews that violate their content policies — including reviews from non-clients impersonating clients. The firm files those reports through the platform's review system, not through the public response.

**Public response, if any.** Even in a fabrication case, the public response should be short, factual-on-the-firm's-side, and never disclose anything about any actual case. "We were unable to locate any record of representing the reviewer or anyone matching this description. We have flagged this review with [platform] for verification. We invite any genuine client with concerns to contact us directly." This walks the line.

# The AI workflow

Priya drafts the response, then runs it through:

*"Audit this public response to a negative online review of a personal injury law firm. The reviewer named themselves and a case manager and described specifics. Confidentiality rule 1.6 prohibits us from confirming or denying ANY case-specific facts, including whether the person was a client. Flag any line that: confirms the representation existed, addresses a specific factual claim, contradicts the reviewer with a fact, or could be read as defending a specific decision in the case. Suggest a shorter, more general alternative for any flagged line. Word count target: under 80."*

The assistant catches confirmations Priya almost certainly missed in her first draft. The third revision is the one that goes live.

# Try it

Find a negative review on the firm's profile that has not yet been responded to (or has been responded to weakly). Draft a response. Run it through the audit prompt. Compare. Most first drafts shrink by half. That shrinkage is the value.

# Takeaway

A public review response is a brochure for future clients, not a case discussion with the reviewer. The shorter, the better — and the more general, the safer. Use AI to catch the confirmations you snuck in without noticing.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt: 'The audience for a public review response is:',
            choices: [
              'The reviewer themselves',
              "Future clients reading the firm's profile",
              'The state bar',
              'Other lawyers',
            ],
            correctIndex: 1,
            explanation:
              'A public response is a brochure for everyone else who reads the review later. The reviewer is reached in a private channel, where Rule 1.6 still applies but a real exchange can happen.',
          },
          {
            prompt:
              'Saying "we worked diligently for our former client Renee" in a public response is:',
            choices: [
              'Fine — Renee already posted her name',
              'A Rule 1.6 issue because it confirms the representation existed',
              'Required to maintain credibility',
              'Allowed only with manager approval',
            ],
            correctIndex: 1,
            explanation:
              'The fact that the reviewer disclosed the relationship publicly does not give the firm permission to confirm it. Rule 1.6 has no "she said it first" exception.',
          },
        ],
      },
      {
        title: 'Measuring what actually converts',
        slug: 'measuring-what-actually-converts',
        body: `[image] A dashboard on a wide monitor showing two columns of metrics — left labelled "Vanity" with greyed-out impressions and clicks, right labelled "Outcomes" with bolder green-and-gold numbers for qualified intakes and signed retainers.
[image] A printed quarterly report sitting on Priya's desk, with one specific cell highlighted in yellow: "Cost per signed retainer, by channel."

# The 11am Friday

Priya inherits the firm's marketing dashboard at her first end-of-quarter review. The dashboard is impressive at a glance. Big numbers. Trend lines. Pie charts. Twenty-eight metrics.

She looks for the metric that matters and cannot find it.

The metric is cost per signed retainer, by channel. Not impressions. Not clicks. Not "leads" — a category that includes anyone who filled out a form for any reason. Signed retainers — the people who walked through the entire intake funnel and became clients. By channel — so the firm knows where the next dollar should go.

The dashboard tracks twenty-eight things and does not track the one thing the firm makes decisions on.

# Why this happens everywhere

Marketing dashboards default to what is easy to measure. Ad platforms report impressions and clicks because the platforms can measure those directly. CRMs report leads because the form fills are theirs to count. Signed retainers — the actual business outcome — require joining data the ad platform does not have with data the CRM partially has with data only the case-management system actually has.

Most agencies do not do this join. Most internal marketing teams do not either. The default report stops at "lead generation." A firm running on default reporting is making decisions on what marketing produced traffic, not what produced clients.

# Three levels of marketing measurement

**Vanity metrics.** Impressions, clicks, social followers, reach. They tell the firm whether the campaign existed. They do not tell the firm whether it worked.

**Lead metrics.** Form fills, phone calls, intakes initiated. They tell the firm whether the campaign produced human contact. They do not tell the firm whether that contact was a real prospective client.

**Outcome metrics.** Qualified intakes (people who passed the mechanism/injury/time triage and would be acceptable to sign), signed retainers, cost per signed retainer by channel, time-to-signed by channel. These tell the firm whether the campaign produced what the firm exists to produce.

A useful dashboard has all three levels. A decision-grade dashboard surfaces the third.

# How AI helps

The reporting itself is mostly a data-engineering job — joining ad-platform data to CRM data to case-management data, building the funnel view, tagging by channel. AI does not do the join. People do.

Where AI helps is in three places.

**Drafting the questions the dashboard should answer.** Priya prompts: "I am building a quarterly marketing dashboard for a personal-injury law firm. I have access to ad-platform impressions/clicks/spend, CRM lead form-fills and phone calls, and case-management retainer status. List the ten most important decision-relevant questions a CMO at a PI firm would want this dashboard to answer. Do not include vanity metrics."

The list it returns is good. Not perfect — Priya adds two and cuts one — but it shortens her question-design phase from a week to an afternoon.

**Reading the dashboard for patterns.** Once the data is flowing, Priya pastes the previous month's numbers (rounded, no client identifiers) into the assistant and asks: "Here are the channel-level results for [month]. What is the cost per signed retainer by channel? Which channels are over-performing relative to the prior three months, which are under-performing? Flag any anomalies — e.g. a sudden cost spike with no volume change. Suggest three specific questions worth investigating, not five generic ones."

The assistant does decent pattern-spotting. It catches things the agency missed in last week's review.

**Writing the end-of-quarter narrative.** The board does not read the dashboard. The board reads a one-page narrative. Priya drafts the narrative herself — AI's "marketing prose" voice is the wrong voice for an internal report — but she runs the draft through:

*"Audit this end-of-quarter marketing narrative for a personal-injury firm. Flag: (a) any vanity metric being presented as an outcome, (b) any claim not supported by the numbers in the appendix, (c) any forward-looking statement that sounds like a guarantee. Suggest sharper language for any vague phrase."*

She fixes what it flags. The narrative is tighter, more honest, and more useful to a board than the version she would have shipped without the audit.

# The end-of-quarter conversation

The conversation Priya wants to have at the end of every quarter is: which channels are converting at what cost per signed retainer, and what should we shift to the next quarter? That is a thirty-minute conversation if the dashboard supports it. It is a five-hour conversation if the team has to build the data join in the room.

Six months in, the conversation is thirty minutes. The dashboard supports it. The next dollar goes where the data says it should.

# Try it

Take last quarter's marketing report. Cross out every metric that is not tied to a signed retainer or a cost per signed retainer. Count what is left. If the answer is less than three metrics, you have the dashboard problem most firms have. The fix is the data join, not the cleverness of the next campaign.

# Takeaway

Vanity metrics measure whether the campaign happened. Lead metrics measure whether it reached people. Outcome metrics — cost per signed retainer by channel — measure whether it worked. Build for the third; use AI to read patterns and write the honest narrative.`,
        estimatedMinutes: 9,
        questions: [
          {
            prompt:
              'The single metric that should drive marketing-spend decisions at a PI firm is closest to:',
            choices: [
              'Impressions per month',
              'Clicks per month',
              'Cost per signed retainer, by channel',
              'Social-media followers',
            ],
            correctIndex: 2,
            explanation:
              'Signed retainers are the business outcome. Joined to channel-level spend, they tell the firm where the next dollar should go. Impressions, clicks, and followers are vanity.',
          },
          {
            prompt: 'AI helps Priya build the dashboard primarily by:',
            choices: [
              'Doing the data join between ad platforms and the case-management system',
              'Drafting the decision-relevant questions, spotting patterns in the numbers, and auditing the end-of-quarter narrative',
              'Replacing the marketing agency',
              'Generating the dashboard charts',
            ],
            correctIndex: 1,
            explanation:
              'The data engineering is a people job. AI helps with the questions, the pattern-reading, and the narrative audit — three places where its strengths apply and its weaknesses are caught.',
          },
        ],
      },
    ],
  },
  {
    title: 'AI for Paralegals',
    slug: 'ai-for-paralegals',
    description:
      'Use AI to do paralegal work — research, drafting, record summarization, document review — without sanctions, UPL, or confidentiality breaches.',
    targetRole: Role.EMPLOYEE,
    targetLevel: AiLevel.POWER_USER,
    tier: AiLevel.POWER_USER,
    isCore: false,
    prerequisiteSlugs: ['ai-basics'],
    orderIndex: 22,
    lessons: [
      {
        title: 'Legal research with AI: verify every citation',
        slug: 'legal-research-verify-every-citation',
        body: `[image] A paralegal named Marcus at his desk with three monitors — left showing an AI chat with a list of case citations, center showing a Westlaw window with a "No documents match your search" message, right showing a printed brief with three citations circled in red pen.
[image] A wall calendar with two dates marked in red — "Mata v. Avianca sanctions order, June 2023" and "today" — connected by an arrow with the words "still happening" written underneath.

# The cautionary tale every paralegal should know

In May 2023, two New York lawyers filed a brief in Mata v. Avianca that cited six federal cases. None of them existed. The lawyers had used ChatGPT for the research. When opposing counsel could not find the cases, the lawyers asked ChatGPT to confirm they were real — and it confirmed they were. The court sanctioned the lawyers $5,000 each and made the firm's name a permanent part of legal-AI education.

It is not the only case. In the two years since, at least three dozen attorneys have been sanctioned for similar conduct in federal and state courts. Most of them did not know they were citing fabrications. They asked the AI a research question, it produced cases with citations, and they pasted the citations into the brief without confirming them in a real database.

# Why this keeps happening

A large language model does not look up cases. It generates text that fits the pattern of a legal citation. Citations are extremely patterned — case name v. case name, volume number, reporter abbreviation, page number, court, year. The model has read millions of real citations during training. It can produce text that matches that pattern with absolute fluency.

It does not know whether the case behind the citation exists.

When you ask "are there cases supporting the proposition that...?", the model will generate a list of cases that sound right. Some will be real. Some will be hybrids — real case names with fake citations, real citations with the wrong holding, real holdings attributed to the wrong court. Some will be wholesale fabrications. The text in all four categories looks identical.

If the paralegal pastes the list into the brief, the brief contains a mix of real and fake. The fake ones get the firm sanctioned.

# The rule

Every citation that appears in any brief, motion, letter, or filed document goes through verification in a real database — Westlaw, Lexis, Fastcase, or the official reporter — before the document leaves the firm. No exceptions. The rule applies whether the citation came from a junior associate, a senior partner, a treatise, or an AI tool. The paralegal who verifies is the last line of defense.

The verification is short. For a case citation, the paralegal pulls up the actual case in Westlaw or Lexis and confirms three things: the case exists, the cited page contains the proposition the brief attributes to it, and the case has not been overturned or distinguished in a way that undermines the citation. For a statute, the paralegal confirms the section number, the current text, and the effective date.

This takes two to five minutes per citation. A twenty-citation brief takes an hour. There is no shortcut.

# Where AI is actually useful for research

AI is a useful research tool when you treat it as a starting-point generator, not an answer-producer.

**Issue spotting.** "I am drafting a brief on premises liability in Florida where the plaintiff slipped on a clear liquid in a grocery store and the store argues lack of constructive notice. What are the leading arguments on both sides?" The assistant will produce a framework with case names. The framework is the value. The case names are leads — every one of them goes through verification.

**Generating a search-term list.** "What are the best Westlaw search terms to find Florida appellate cases on constructive notice in transitory-substance slip-and-fall cases?" The assistant produces a search-term list better than most paralegals would on their first try.

**Plain-language explanations of standards.** "Explain the difference between actual and constructive notice in a way I can include as a one-paragraph background section." The plain-language explanation is the assistant's strength.

**Drafting around verified authority.** Once the paralegal has the real cases in front of them, the assistant can help with structure — "given these three cases, draft a one-paragraph synthesis of the holding on constructive notice." The cases are real; the synthesis prose is the assistant's domain.

# Where AI is dangerous for research

**Producing citations from scratch.** Never use a citation that came from an AI assistant without verifying it. Not "verify the ones that look weird" — verify all of them. The hallucinated citations look exactly like the real ones.

**Confirming whether a case exists.** Asking the assistant "is this case real?" is asking the same system that may have invented it whether it invented it. The answer is not evidence. Verification means pulling up the case in a real legal database.

**Quoting the holding.** AI sometimes produces a quote that does not appear in the case. The quote has to be pulled from the actual opinion text, not the assistant's paraphrase.

# The workflow that works

Marcus's research workflow has four steps.

1. **Issue-spot with AI.** Get the framework, the candidate case names, and the search terms.
2. **Verify in a real database.** Pull up every case named. Discard fabrications. Keep real cases. Confirm the holding matches the framework.
3. **Read the cases.** Yes — actually read the cases that survive verification. The assistant's summary of a case is not the same as the case.
4. **Draft with AI against verified authority.** Now the assistant helps with synthesis, structure, and phrasing — operating on real material.

The cases that get the firm in trouble are the ones where step 2 is skipped.

# Try it

Take a research question from a current matter. Run it through the assistant. Take the case names it produces. Verify each one in Westlaw or Lexis. Note how many were real, how many were partially real, how many were fabricated. The ratio teaches you how much skepticism to bring to step 1.

# Takeaway

AI does not look up cases — it generates text that fits the pattern of a citation. Every citation gets verified in a real database before it leaves the firm. The paralegal who skips that step is the next sanctions order waiting to happen.`,
        estimatedMinutes: 11,
        questions: [
          {
            prompt: 'In Mata v. Avianca, the lawyers got sanctioned because:',
            choices: [
              'They lost the case at trial',
              'They cited six federal cases that did not exist, generated by ChatGPT, without verifying in a real database',
              'They used an unapproved AI vendor',
              'They missed a filing deadline',
            ],
            correctIndex: 1,
            explanation:
              'Six fabricated citations made it into a federal court filing because nobody verified them in Westlaw or Lexis. The sanctions made it the canonical AI-and-law cautionary tale.',
          },
          {
            prompt: 'Asking the AI "is this case real?" is:',
            choices: [
              'A reliable way to spot hallucinations',
              'Not evidence — you are asking the system that may have invented it whether it invented it',
              'Required by Westlaw',
              'A backup verification step',
            ],
            correctIndex: 1,
            explanation:
              'Verification means pulling up the case in a real legal database. The model that produced the citation cannot be the system that validates it.',
          },
          {
            prompt: 'Where AI IS useful in legal research:',
            choices: [
              'Producing the final citations',
              'Confirming case existence',
              'Issue-spotting, generating search terms, plain-language explanations, drafting against verified authority',
              'Filing the brief',
            ],
            correctIndex: 2,
            explanation:
              'AI is a starting-point generator and a drafting partner once the authority is verified. The verification itself happens in a real database, every time.',
          },
        ],
      },
      {
        title: "Demand letter drafting in the firm's voice",
        slug: 'demand-letter-firms-voice',
        body: `[image] Marcus at a desk with a fact pattern on the left monitor, a draft demand letter on the right, and a printed firm style guide between them, tabbed and highlighted.
[image] A side-by-side excerpt — left labelled "GENERIC AI DRAFT" with phrases circled in red ("egregious", "wanton disregard", "we will not hesitate to file"), right labelled "FIRM VOICE" with the same paragraph rewritten in direct, evidence-anchored prose.

# The first draft test

The firm's demand letters have a voice. Direct. Evidence-anchored. Specific. No "egregious." No "wanton disregard." No "we will not hesitate to file suit." No flourishes. The defense adjusters at the major insurers — Allstate, Progressive, Geico, State Farm, GEICO — read hundreds of demand letters a month. They can tell, by paragraph two, whether the firm sending the letter is one to negotiate seriously with or one to lowball.

The firm's voice is calibrated to read as: this firm has the records, has the medicine, has the law, has the willingness to try the case, and is asking for a specific number with a specific deadline. Drama is for firms that do not have the facts.

# Why AI defaults break the firm's voice

Off-the-shelf AI is enthusiastic. It will reach for "egregious" and "outrageous" and "callous disregard" because those are the words that appear in the training data of plaintiff's-side demand letters across the country. Many real plaintiff's-side firms write that way. CEO Lawyer does not.

Worse, AI will invent. It will say "the at-fault driver was operating his vehicle at a high rate of speed in violation of Florida Statute § 316.183" when the fact pattern says nothing about speed and the citation may or may not match the cited section. It will say "the plaintiff has suffered permanent impairment" when the medical records say the IME found range-of-motion deficits but does not opine on permanency.

A demand letter built on inventions does not survive five minutes of negotiation. The adjuster pulls the medical records, finds the discrepancy, and the letter becomes a credibility hit on the firm.

# The structure of a CEO Lawyer demand letter

Five sections, in order, every time.

**Caption.** Client name. Insurer claim number. Date of loss. Policy limits if known. No prose — just the data.

**Statement of facts.** Three to six short paragraphs. What happened, where, when, witnesses, police report citation. Quote police-report language verbatim. Do not characterize.

**Liability.** Why the insured's driver or insured premises owner is at fault. Cite the police report's fault assignment. Cite specific traffic-law violations only when documented (the officer wrote up a citation; the driver was charged). Do not invent violations the record does not contain.

**Damages.** Itemized. Each line is a specific provider, a specific date or date range, and a specific dollar amount, with the bates range supporting it. Medical bills, lost wages, out-of-pocket expenses. Pain and suffering is a general category — no multiplier in a first-draft demand. The attorney decides whether to add one in revision.

**Demand.** One specific dollar figure. One specific response deadline (typically 30 days). Contact information for response.

That is the letter. Three pages. No "egregious." No "we will not hesitate." A directness that reads like the firm has done the work.

# The prompt that produces firm-voice drafts

Marcus's prompt for a first-draft demand letter has three parts: the system prompt embedded as a prefix, the fact pattern, and the verification rules.

The prefix:

*"Draft a first-draft demand letter to a personal-injury insurer in the voice of a plaintiff's-side firm that prefers direct, evidence-anchored prose over rhetorical flourishes. AVOID (case-insensitive): 'egregious', 'outrageous', 'wanton', 'callous', 'reckless disregard', 'we will not hesitate', 'in the strongest possible terms', 'demand justice', 'fight for'. AVOID inventing: case citations, statute sections, witnesses, treatment dates, dollar amounts, or permanency findings not in the facts I provide. If a citation seems necessary, leave [VERIFY: ___] for the paralegal. If a fact is missing, leave [NEEDS FACT: ___]. Use only the structure: Caption, Statement of Facts, Liability, Damages (itemized with provider, dates, amounts, bates range), Demand (single figure, single deadline)."*

The fact pattern comes next — usually 300-600 words of structured bullets from the file.

The output is a first draft Marcus then walks through. He fills in any [VERIFY] placeholders by pulling the actual statute or case. He fills in any [NEEDS FACT] placeholders by going back to the file. He runs the numbers in Damages against the bates-stamped records. He hands the letter to the attorney.

The attorney's edits are usually tone-level, not fact-level. That is the test.

# What the attorney still owns

The paralegal does not decide the demand figure. The paralegal does not decide whether to add a settlement multiplier on pain and suffering. The paralegal does not decide the response deadline. The paralegal does not decide whether to send the letter at all. All of those are attorney decisions, on the file.

What the paralegal owns is: the facts are accurate, the bates ranges are right, the damages add up to the total, no citations are invented, no permanency findings appear that the medical records do not support, the voice matches the firm's, and the letter is on the attorney's desk in a state where the attorney's edits are tone and strategy, not error-correction.

That is the value the paralegal adds. The AI is leverage. The judgment is human.

# Try it

Take a closed case where the demand letter went out cleanly. Reverse-engineer the fact pattern from the records — what the paralegal would have had on day one. Run the demand-letter prompt above. Compare the output to the letter that actually went out. The deltas are your edit instinct — the places where the firm's voice diverges from the model's default. The third or fourth iteration of this, your first drafts will need very little tone editing.

# Takeaway

A first-draft demand letter is a paralegal product, not an AI product. Use AI to handle the heavy typing — but enforce the firm's voice, the no-invention rule, and the structured sections in the prompt, and let the attorney's judgment own the demand figure and the strategy.`,
        estimatedMinutes: 11,
        questions: [
          {
            prompt: 'The CEO Lawyer firm voice in a demand letter is best described as:',
            choices: [
              'Dramatic and outraged',
              'Direct and evidence-anchored, without rhetorical flourishes',
              'Casual and warm',
              'Brief — under a page',
            ],
            correctIndex: 1,
            explanation:
              "The firm's voice reads as: we have the records, we have the medicine, we have the law, we are willing to try. Drama is for firms that do not have the facts.",
          },
          {
            prompt: 'In a first-draft demand letter, the paralegal owns:',
            choices: [
              'The demand figure and the response deadline',
              'The decision to add a pain-and-suffering multiplier',
              'The facts, the bates citations, the damages math, the voice, and the no-invention rule',
              'Whether to send the letter at all',
            ],
            correctIndex: 2,
            explanation:
              "Strategic decisions (demand figure, multiplier, deadline, whether to send) are the attorney's. The paralegal owns accuracy, structure, voice, and the no-invention rule.",
          },
        ],
      },
      {
        title: 'Medical record summarization without losing damaging detail',
        slug: 'medical-record-no-losing-damaging-detail',
        body: `[image] A thick three-ring binder of medical records on a desk, with colored tabs poking out. Marcus has a one-page printed summary in front of him with sections labelled "Mechanism", "Imaging", "Treatment", "Gaps", "Damaging facts to surface".
[image] A close-up of one section of the summary, "Damaging facts to surface", with three short bullets: "Prior L4-L5 disc bulge 2019 — opposing counsel will find this", "6-week gap Aug-Oct — unexplained in file", "ER intake nurse: patient said \\"never had back problems\\" — contradicted by 2018 records".

# The 247-page record set

Marcus inherits a 247-page medical-record set on a Friday afternoon. Soft-tissue case. The mediation is Wednesday. The attorney needs a one-page summary by Monday.

The temptation, every time, is to summarize the records in a way that makes the case look good. Lead with the strongest findings. Bury the gaps. Skip the prior conditions. Soften the inconsistencies. The summary is for the attorney's prep, after all — why surface the bad?

The answer is: because opposing counsel will surface the bad in mediation, in deposition, and at trial if there is one. The attorney needs to know about it on Monday, not at 10am Wednesday. The paralegal who summarizes only the good is not helping the attorney — they are setting the attorney up to be ambushed.

# The two functions of a medical summary

A medical-record summary for litigation has two jobs.

**Document the case-relevant facts.** Mechanism of injury, treatment timeline, imaging findings, objective examination findings, the providers involved, the bills incurred. This is the meat. The attorney builds the case theory on these.

**Surface the damaging facts.** Prior conditions in the same body part. Gaps in treatment. Inconsistencies between what the client told different providers. Imaging readings that undercut the causation theory. Surveillance notes. Anything that opposing counsel will use.

A summary that does the first job and not the second is half-done. The half it is missing is the more important half. The attorney can build the case theory in an afternoon. The attorney cannot un-be-surprised at mediation by a prior injury the summary did not mention.

# Why AI helps here

A 247-page record set takes a careful paralegal four to six hours to summarize properly. AI can compress that to under two hours with no loss of quality if the workflow is right. The reason is that AI is good at exactly the two operations that dominate medical-record summarization: extracting structured fields from semi-structured text, and pattern-spotting across pages.

The catch is that the records cannot leave the protected system as raw PHI. Marcus does not paste the records into a public AI tool. He works in the firm's approved internal assistant. He uses [PATIENT], [DOB], [MRN] placeholders. He describes what is in the records — section by section — rather than uploading the records themselves.

# The structured-summary workflow

Marcus's workflow has six steps.

1. **Read the entire record set.** Yes — actually read it. Tab it. Mark the dates. Mark the providers. Mark anything that catches his eye. No assistant substitutes for this.

2. **Build the timeline by hand.** A two-column document: date, event. Every imaging study. Every provider visit. Every authorization request. Every gap. This is the spine of the summary.

3. **Identify the damaging facts.** Marcus's checklist: prior conditions in the same body part, gaps in treatment of more than thirty days, statements to providers that contradict the case theory ("never had back problems before" while the prior records show otherwise), MRI or imaging readings that mention degenerative or pre-existing findings, treatment plateaus, surveillance notes if any, social-media indicators.

4. **Describe the timeline and the damaging facts to the assistant — using placeholders.** Marcus paraphrases the records in his own words. He does not upload them. He says "[PATIENT] is a 38-year-old rear-ended on June 7. Same-day ER, cervical and lumbar strain, X-rays negative. Two weeks of chiropractic care, then a 6-week gap with no documented care, then orthopedic consult on October 18 with MRI showing L4-L5 disc protrusion described as 'consistent with degenerative changes, no acute traumatic finding'. Prior 2018 work-related lumbar injury at a different employer with documented L4-L5 disc bulge in 2019 imaging and 8 weeks of PT then." And so on.

5. **Prompt for the structured summary.** "Produce a one-page mediation summary using the structure: Mechanism, Initial complaints and exam, Imaging, Treatment timeline, Gaps in care, Prior conditions, Causation issues, Bottom-line case-impact notes. Surface damaging facts in their own section — do not soften or omit. Use [PAGE __] placeholders for page citations I will fill in."

6. **Walk the page citations.** Marcus pulls up each page reference in the actual records and writes in the real page number. Five minutes per citation. The attorney can pull up the page in twenty seconds in mediation.

The output is a one-page document — typically 400-500 words — that surfaces the case-relevant facts AND the damaging facts, in their own labelled sections, with page citations the attorney can verify in real time.

# What the summary explicitly does not do

The summary does not predict settlement value. It does not recommend a strategy. It does not opine on whether the case will succeed at trial. Those decisions are the attorney's, on the file, with the rest of the case-team context. The paralegal who slips strategy into a record summary is doing two jobs poorly — and the second one is not their job to do.

# Try it

Take a recently closed case where the mediation went well or badly. Pull the medical record summary the paralegal produced at the time. Walk through it with the damaging-facts checklist — were they all surfaced? Were they all on the first page? Were the page citations real?

The summaries that helped the case the most were the ones that gave the attorney the bad news first. That is the bar.

# Takeaway

A medical-record summary is for the attorney's eyes before mediation, not for the case theory. Surface the damaging facts in their own section — opposing counsel will. AI compresses the work; the paralegal's judgment about what is damaging is the value.`,
        estimatedMinutes: 11,
        questions: [
          {
            prompt: 'The two functions of a medical-record summary for litigation are:',
            choices: [
              'Document the bills and document the diagnoses',
              'Document the case-relevant facts AND surface the damaging facts',
              'Predict settlement value and recommend strategy',
              'Summarize for the client and the attorney',
            ],
            correctIndex: 1,
            explanation:
              'The summary has to do both — case-relevant facts for the theory AND damaging facts (priors, gaps, inconsistencies, problematic imaging) that opposing counsel will use. Doing only the first half is setting the attorney up to be ambushed.',
          },
          {
            prompt: 'Marcus uses placeholders ([PATIENT], [MRN]) because:',
            choices: [
              'AI tools require it for formatting',
              "Protected health information should not leave the protected system as raw identifiers, even in the firm's approved internal assistant",
              'It saves typing',
              'Placeholders rank better in search',
            ],
            correctIndex: 1,
            explanation:
              'Data minimization. The assistant does its job on facts and patterns; raw identifiers belong in the case-management system, not in chat history.',
          },
        ],
      },
      {
        title: 'Document review prioritization',
        slug: 'document-review-prioritization',
        body: `[image] Marcus seated in front of a large monitor showing a document-review interface with a sidebar of folders — "Hot", "Privileged", "Reviewed", "Unsorted" — and a notification badge showing 1,847 documents unsorted.
[image] A printed one-page review protocol on his desk, with five sections labelled "Hot-document triggers", "Privilege flags", "Bates-track rules", "Production batch checks", "Quality-control checkpoints".

# The 12,000-document production

The firm receives a 12,000-document production in a commercial premises-liability case three months before trial. Two associates and three paralegals will review it. Marcus runs the review. He has six weeks.

A review without prioritization is a review that does not finish. Twelve thousand documents at three minutes a document is six hundred person-hours. Even with five people, that is six weeks of full-time review and no time for anything else. Marcus does not have six weeks; he has six weeks for review AND deposition prep AND trial subpoenas AND the rest of the case.

The fix is prioritization. Not every document gets three minutes. Some get thirty seconds. Some get thirty minutes. The protocol decides which is which.

# The four tiers

**Tier 0 — exclude.** Junk that the production happened to include — duplicates of duplicates, blank pages, system metadata. AI is good at flagging these. A first-pass cull can remove 15-25% of the production before any human reviewer touches it.

**Tier 1 — skim.** Routine business documents that probably do not move the case — internal logistics emails, calendar items, low-relevance attachments. A reviewer looks at each for thirty seconds, tags it as reviewed, moves on. AI can pre-tag this tier with reasonable accuracy.

**Tier 2 — read carefully.** Documents within the relevant date range, mentioning relevant entities, and containing language that maps to the case theory. Three to ten minutes each. Reviewer reads for issues, tags for hot-document flags, marks any privilege concerns.

**Tier 3 — hot documents and privileged.** The documents that move the case — admissions, party communications about the incident, prior-knowledge evidence, internal incident reports, manager-level decisions about the dangerous condition — and documents over which a privilege claim might apply. Twenty to forty minutes each. Reviewed by a senior paralegal or associate, escalated to the attorney as needed.

A 12,000-document production usually breaks down roughly as 20% Tier 0, 55% Tier 1, 22% Tier 2, 3% Tier 3. The 3% is the case. The rest is filing.

# How AI does the first pass

Marcus uses the firm's e-discovery platform's AI features (or a separate approved tool) to do the first-pass tier assignment. The tool runs against the corpus and produces a tier prediction for each document. The features it uses are non-controversial: presence of relevant entity names, date range, document type, presence of key terms from the protocol.

The tool is not making the final call. It is producing a starting tier that a human reviewer either confirms or overrides. Marcus's experience is that the tool gets Tier 0 right 95% of the time, Tier 1 right 85% of the time, and Tier 2-versus-3 right about 60% of the time. The 40% miss rate on the most important tier is exactly why a human reviewer still looks at every Tier 2 and Tier 3 document.

# Where AI is dangerous

**Privilege calls.** A human reviewer makes every privilege call. AI cannot decide whether a communication between in-house counsel and a regional manager about an incident is privileged in the jurisdiction at issue. Misclassifying a privileged document as producible is one of the worst errors a review can make — and the platform will not catch it because the platform does not know the privilege law.

**Hot-document recognition that depends on case theory.** The platform knows the case theory from a high-level prompt or pre-classification model. It does not know the nuance the attorney has built up over a year on the case. A document the platform tags as routine may be the document the attorney has been looking for. The human reviewer's eye, calibrated by case context, is the only thing that catches these.

**Search-term elasticity.** A search term like "spill" misses "wet floor", "liquid", "puddle", "slick". The protocol has to be designed with elasticity in mind. AI helps build the search-term list — Marcus prompts "List 20 alternative terms a manager might use to describe a wet-floor condition in internal emails, including misspellings and abbreviations" — but the term list itself is reviewed by an attorney before the search runs.

# The protocol that makes this work

Marcus's review protocol is a one-page document the team reads on day one.

- **Date range.** The relevant date range and the cutoffs for "before" and "after" review.
- **Custodians.** The list of named custodians whose documents are tiered to a higher default.
- **Key terms.** The vetted term list, with elasticity built in.
- **Hot-document triggers.** Concrete patterns — "any document discussing the floor maintenance schedule", "any document mentioning prior incidents at the store", "any document from the regional risk manager to store management about safety". A reviewer who sees one of these immediately tags it Tier 3.
- **Privilege flags.** Sender or recipient names that trigger privilege review. Communications with counsel always go to privileged review regardless of platform prediction.
- **Quality-control checkpoints.** Every reviewer's first 50 documents are re-reviewed by Marcus. Mid-review, Marcus samples 5% of each reviewer's Tier 0 and Tier 1 assignments to catch drift. End-of-review, every Tier 3 document is re-reviewed by the senior paralegal or associate.

The protocol is the work. AI is the multiplier. Without the protocol, the AI tier predictions are meaningless. With the protocol, the team finishes the review in three weeks and has time for everything else.

# Try it

Pick a recent production review. Walk through how the documents were tiered. How many got the right tier on the first pass? How many hot documents were caught early versus late? If the answer is "we caught most of them in the last week of review", the protocol needed to load the hot-document triggers more heavily on the first pass.

The bar is finding the 3% that matters in the first two weeks, not the last two. That is what prioritization is for.

# Takeaway

Document review without prioritization does not finish. Build a protocol with four tiers, use AI for the first pass, and put a human reviewer on every Tier 2, every Tier 3, and every privilege call. The 3% that matters is the whole point.`,
        estimatedMinutes: 10,
        questions: [
          {
            prompt:
              'In a 12,000-document production review, the tier breakdown usually looks like:',
            choices: [
              'Roughly equal across four tiers',
              'About 20% Tier 0 (exclude), 55% Tier 1 (skim), 22% Tier 2 (read carefully), 3% Tier 3 (hot/privileged)',
              '80% Tier 3 and 20% Tier 0',
              '100% Tier 2',
            ],
            correctIndex: 1,
            explanation:
              "Most of the production is junk or low-relevance. The 3% that is hot or privileged is the case. The protocol's job is to find that 3% in the first two weeks of review.",
          },
          {
            prompt: 'Privilege calls in document review:',
            choices: [
              'Are made by the AI platform',
              'Are made by every reviewer using their best judgment',
              'Are made by a human reviewer — AI cannot decide privilege; misclassifying privileged as producible is one of the worst errors a review can make',
              'Are skipped to save time',
            ],
            correctIndex: 2,
            explanation:
              "AI does not know the jurisdiction's privilege law. Every privilege call goes through a human reviewer. The platform's prediction is a starting point, not a decision.",
          },
        ],
      },
      {
        title: 'The ethical guardrails: UPL, confidentiality, supervision',
        slug: 'ethical-guardrails-upl-confidentiality',
        body: `[image] Judge sitting across a small conference table from Marcus, both with mugs of coffee and a single printed page between them — titled "Where the lines are" — with three columns labelled "UPL", "Confidentiality", "Supervision".
[image] A wall poster in the paralegal area, navy on cream, in plain serif type: "Three lines paralegals do not cross. 1. Practicing law. 2. Breaching confidentiality. 3. Working unsupervised on substantive matters." With Judge\'s initials at the bottom.

# The Tuesday coffee

Once a month, Judge does a one-on-one with every paralegal. The first one with Marcus, six weeks into the job, is short. She does not give a lecture. She asks him three questions.

"Have you ever given legal advice to a client?"

"No."

"Have you ever pasted full client identifiers — name, DOB, SSN — into any AI tool, even the firm's internal one?"

"No."

"Have you ever drafted, signed, and filed a document on a case without an attorney's sign-off?"

"No."

"Good. Those are the three lines. We are going to talk for fifteen more minutes about how to keep it that way."

# Unauthorized practice of law

UPL — the unauthorized practice of law — is the line a paralegal cannot cross without putting the attorney's license, the firm, and the client at risk.

The line lives in a few specific behaviors:

**Giving legal advice.** A paralegal cannot advise a client on the merits of their case, predict an outcome, recommend a course of action, or interpret a legal document for the client. A paralegal can: relay an attorney's advice to the client, explain procedural steps the attorney has approved, answer factual questions, and gather information.

**Setting fees or accepting representation.** A paralegal cannot tell a client the firm will represent them or set the fee. Those are attorney decisions. The paralegal can describe the firm's intake process and route the matter to an attorney for the decision.

**Drafting and filing substantive documents without supervision.** A paralegal can draft. An attorney must review and sign anything that goes out of the firm. The attorney's review is not a rubber stamp — it is the legal judgment that makes the document the firm's product instead of UPL.

**Representing a client in court or in a deposition.** Some procedural appearances are allowed for paralegals in some jurisdictions; substantive ones are not. Default to no without explicit attorney instruction.

AI does not change any of these lines. If a paralegal uses AI to draft a motion and files it without an attorney's review, that is UPL — and now also a sanctions risk if the motion contains hallucinated citations the attorney would have caught. The AI is leverage on tasks that are clearly within the paralegal's scope. It does not expand the scope.

# Confidentiality

Rule 1.6 — confidentiality of information relating to representation — covers everything the firm learns about a client matter, from anyone, in any form. It is broader than attorney-client privilege.

What it means practically for a paralegal using AI:

**Approved internal tools only for client information.** The firm's enterprise-licensed assistant operating in a controlled environment is approved; the public ChatGPT, Claude.ai consumer, and other public tools are not, regardless of what their privacy settings say. The list of approved tools is on the firm intranet and changes occasionally; Marcus checks it.

**Data minimization within approved tools.** Even in the approved tool, paste only what is necessary. First name + last initial for the client. Facts, not identifiers. Treatment categories, not full record sets. The principle is: the assistant does its job on facts and patterns; raw identifiers belong in the case-management system.

**Search history is data too.** What Marcus searches for in the assistant is logged. A search like "is suing for $10M for a back injury reasonable in Florida" tied to a client matter is itself sensitive. He treats prompts like internal memos — written assuming someone will read them in three years.

**No external sharing of work-product prompts.** A clever prompt Marcus develops for medical-record summarization is not a tweet. It is the firm's process. The firm shares it internally; not externally without sign-off.

# Supervision

Supervision is what makes everything a paralegal does a legal product of the attorney's firm instead of an unauthorized practice by the paralegal individually. The supervising attorney is responsible for the paralegal's work on substantive matters. That is not a formality — that is the structure that makes the work legal.

What good supervision looks like in practice:

**Every substantive work product is reviewed by an attorney before it goes out.** Demand letters, motions, briefs, deposition outlines, settlement documents. The attorney's review is recorded in the file — initials, date, "reviewed and approved" or an explicit set of edits.

**The attorney knows what the paralegal is doing.** A weekly check-in. A shared task list. A standing agenda item. Supervision is not "tell me if something goes wrong"; it is "I know what is in the queue and I see the work as it moves."

**The paralegal escalates known unknowns.** When Marcus is not sure whether something is within his scope — a question from a client that edges into legal advice, a research finding he is not sure how to interpret, a citation he cannot verify — he asks the attorney before proceeding. The asking is the supervision in action. The instinct to ask is the trained reflex the firm wants every paralegal to have.

**AI tool use is supervised too.** The first time Marcus uses a new prompt for substantive work, he shows the prompt and the output to the supervising attorney. The attorney either approves the workflow or adjusts it. Once approved, Marcus can use the workflow on similar tasks without re-asking. New kinds of tasks require new sign-off.

# Where AI tempts the line

AI tempts paralegals across all three lines, in predictable ways.

**Toward UPL.** A client emails Marcus directly with a legal question. The temptation: paste the question into the assistant, get an answer that sounds right, send it. The line-crossing version is sending it. The compliant version is: relay the question to the attorney with relevant context, draft a response that the attorney reviews and signs off on, send.

**Toward confidentiality breach.** A complicated case calls for deep research. The temptation: paste the entire file into a powerful general-purpose AI tool that is not the firm's approved internal one. The line-crossing version is doing it. The compliant version is using the approved tool, with minimized data, on the parts of the task where the tool is genuinely useful.

**Toward unsupervised work.** An attorney is in trial all week and unavailable. A deadline is looming. The temptation: use AI to draft and finalize the work, file it, "the attorney would have approved it anyway." The line-crossing version is filing without sign-off. The compliant version is escalating the deadline issue, asking another attorney to cover the sign-off, or moving the deadline if those options exist.

# Try it

Look at one substantive work product you produced last month. Walk through three questions:

1. Was every assertion in it within my scope as a paralegal? Did any of it edge into giving legal advice that should have been the attorney's?
2. Was every piece of client information I shared with the AI tool minimized? Could I have used placeholders for any identifier I included?
3. Was the supervising attorney's review on the file before this went out? Are the initials and date there?

If the answers are yes, yes, and yes, the work is on the right side of all three lines. If any answer is no, that is the next conversation with Judge.

# Takeaway

UPL, confidentiality, and supervision are the three lines AI does not move. The tool is leverage on work that is already in your scope, on data that is already minimized, under an attorney whose review is already on the file. The instinct to ask before crossing any of those lines is the trained reflex that makes the rest of the work legal.`,
        estimatedMinutes: 12,
        questions: [
          {
            prompt: 'Unauthorized practice of law (UPL) lives in:',
            choices: [
              'Filing paperwork',
              'Giving legal advice, setting fees, drafting and filing substantive documents without attorney supervision, representing clients in substantive proceedings',
              'Using AI tools',
              'Talking to clients',
            ],
            correctIndex: 1,
            explanation:
              'UPL is about substantive legal work performed without attorney authorization or supervision. Paralegals do plenty of work that touches each of those categories — under attorney supervision and with attorney sign-off. The supervision is the line.',
          },
          {
            prompt: 'Using a non-approved public AI tool on client matter information is:',
            choices: [
              'Fine if the privacy settings are configured carefully',
              "A Rule 1.6 confidentiality violation regardless of the tool's privacy settings — only the firm's approved internal tools are authorized",
              'Allowed for low-stakes matters',
              'Allowed if the client consents verbally',
            ],
            correctIndex: 1,
            explanation:
              'The approved-tools list is the operational definition of what is permitted under Rule 1.6 for this firm. Privacy settings on a non-approved tool do not change that. Client consent for tool use, if relied on, must be informed and documented — not a verbal handwave.',
          },
          {
            prompt: 'Supervision in practice means:',
            choices: [
              'Telling the attorney about problems after they occur',
              'Every substantive work product is reviewed and signed off by the attorney before it goes out, the attorney knows what is in the queue, and the paralegal escalates known unknowns',
              'Daily 1:1s on every case',
              'The attorney watches the paralegal type',
            ],
            correctIndex: 1,
            explanation:
              "Supervision is the structure that makes the paralegal's work a legal product of the attorney's firm. Reviewing and signing every substantive output, knowing what is in the queue, and being the escalation point for known unknowns is what that structure looks like in practice.",
          },
        ],
      },
    ],
  },
];

async function main() {
  const clientName = (process.env.CLIENT ?? '').toLowerCase();
  const isKapitus = clientName === 'kapitus';
  const isCeolawyer = clientName === 'ceolawyer';
  // The "demo-org" id is stable across environments; under CLIENT=kapitus it
  // doubles as the shared Kapitus org that all employees attach to. Stamp a
  // slug so the auth flow can find it without hardcoding the id.
  const orgSlug = isCeolawyer ? 'ceolawyer' : isKapitus ? 'kapitus' : 'demo';
  const orgName = isCeolawyer ? 'CEO Lawyer' : isKapitus ? 'Kapitus' : 'Demo Co';
  const orgIndustry = isCeolawyer ? 'Legal' : isKapitus ? 'Financial Services' : 'Software';
  const orgSize = isCeolawyer ? '51-200' : isKapitus ? '201-1000' : '51-200';
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {
      slug: orgSlug,
      name: orgName,
    },
    create: {
      id: 'demo-org',
      slug: orgSlug,
      name: orgName,
      industry: orgIndustry,
      companySize: orgSize,
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
    // ── CEO Lawyer — AI for Legal Intake labs ────────────────────────────────
    {
      labSlug: 'legal-intake-summary',
      pathSlug: 'ai-for-legal-intake',
      lessonSlug: 'lab-legal-intake-summary',
      title: 'Practice: turn a messy intake call into a facts-only summary',
      orderIndex: 15,
      estimatedMinutes: 9,
      brief:
        'A raw intake transcript, rambling and out of order. Produce a clean structured summary with no invented details — every field traces back to something the caller actually said.',
    },
    {
      labSlug: 'legal-intake-pii-redaction',
      pathSlug: 'ai-for-legal-intake',
      lessonSlug: 'lab-legal-intake-pii-redaction',
      title: 'Practice: summarize an intake without leaking PII',
      orderIndex: 35,
      estimatedMinutes: 7,
      brief:
        'Use placeholders for SSN, full DOB, address, and DL. Rule 1.6 does not have an exception for "I thought it was internal."',
    },
    {
      labSlug: 'legal-intake-red-flag-triage',
      pathSlug: 'ai-for-legal-intake',
      lessonSlug: 'lab-legal-intake-red-flag-capstone',
      title: 'Capstone: triage a case with three red flags',
      orderIndex: 55,
      estimatedMinutes: 12,
      brief:
        'A scenario with seven red flags hiding in the facts. Identify each, classify severity, and recommend a concrete next step — without crossing into UPL.',
    },
    // ── CEO Lawyer — AI for Legal Marketing labs ─────────────────────────────
    {
      labSlug: 'legal-marketing-geo-page',
      pathSlug: 'ai-for-legal-marketing',
      lessonSlug: 'lab-legal-marketing-geo-page',
      title: 'Practice: rewrite a geo-page that survives bar review',
      orderIndex: 15,
      estimatedMinutes: 10,
      brief:
        'A generic landing page localized to Augusta, Georgia. No outcome guarantees, no banned superlatives, real local anchors, required disclaimers.',
    },
    {
      labSlug: 'legal-marketing-review-response',
      pathSlug: 'ai-for-legal-marketing',
      lessonSlug: 'lab-legal-marketing-review-response',
      title: 'Practice: respond to a 2-star review without breaching confidentiality',
      orderIndex: 35,
      estimatedMinutes: 8,
      brief:
        'Public response is a brochure for future clients, not a case discussion. Under 80 words, no confirmations of representation, no naming the case manager.',
    },
    {
      labSlug: 'legal-marketing-campaign-brief',
      pathSlug: 'ai-for-legal-marketing',
      lessonSlug: 'lab-legal-marketing-campaign-capstone',
      title: 'Capstone: build a state-expansion campaign brief',
      orderIndex: 55,
      estimatedMinutes: 12,
      brief:
        'A one-page brief the agency can execute against — audience, channels, anchor messages, disclaimers, success metrics. Compliant with North Carolina ad rules.',
    },
    // ── CEO Lawyer — AI for Paralegals labs ──────────────────────────────────
    {
      labSlug: 'paralegal-citation-check',
      pathSlug: 'ai-for-paralegals',
      lessonSlug: 'lab-paralegal-citation-check',
      title: 'Practice: catch the hallucinated citations',
      orderIndex: 15,
      estimatedMinutes: 12,
      brief:
        'Six citations in an AI-drafted brief. Some are real, some are not. Flag the fakes with the structural red flag — the volume that does not exist, the judge on the wrong court — before the brief leaves the firm.',
    },
    {
      labSlug: 'paralegal-demand-letter',
      pathSlug: 'ai-for-paralegals',
      lessonSlug: 'lab-paralegal-demand-letter',
      title: "Practice: draft a demand letter in the firm's voice",
      orderIndex: 35,
      estimatedMinutes: 12,
      brief:
        "A specific fact pattern. Itemized damages, bates-cited records, no invented facts, the firm's direct evidence-anchored voice — and the attorney's decisions left to the attorney.",
    },
    {
      labSlug: 'paralegal-medical-summary',
      pathSlug: 'ai-for-paralegals',
      lessonSlug: 'lab-paralegal-medical-summary-capstone',
      title: 'Capstone: medical-record summary that surfaces the damaging facts',
      orderIndex: 55,
      estimatedMinutes: 14,
      brief:
        'A 247-page record set. One-page mediation summary that documents the case-relevant facts AND surfaces every damaging fact opposing counsel will use — with PHI protected and page citations attached.',
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
