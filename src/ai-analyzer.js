/**
 * AI-Powered Ticket Analyzer
 *
 * Uses Claude to intelligently categorize tickets, suggest resolutions,
 * and assess automation potential — going beyond keyword matching.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { CATEGORY_PATTERNS, RESOLUTION_SCRIPTS } = require('./ticket-analyzer');

let client = null;

function getClient() {
  if (!client && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic();
  }
  return client;
}

function isConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Build the system prompt with full context about categories and scripts
function buildSystemPrompt() {
  const categoryList = CATEGORY_PATTERNS.map(
    (c) =>
      `- ${c.category} ("${c.label}"): avg ${c.avgMinutes} min, base automation score ${c.automationScore}%`
  ).join('\n');

  const scriptList = RESOLUTION_SCRIPTS.map(
    (s) =>
      `- ${s.name} [${s.type}]: ${s.label} — ${s.resolves} (symptoms: ${s.symptoms.slice(0, 5).join(', ')})`
  ).join('\n');

  return `You are an expert MSP (Managed Service Provider) ticket analyst. You analyze IT support tickets and provide intelligent categorization, resolution guidance, and automation assessment.

You have deep knowledge of:
- Windows Active Directory, Group Policy, DHCP, DNS
- Microsoft 365 (Exchange Online, Teams, OneDrive, SharePoint)
- Endpoint management (Datto RMM, desktop support)
- Common MSP workflows (onboarding, offboarding, password resets)
- PowerShell automation for IT tasks

AVAILABLE CATEGORIES:
${categoryList}
- uncategorized ("Needs Review"): for tickets that don't fit any category

AVAILABLE AUTOMATION SCRIPTS:
${scriptList}

For each ticket, provide:
1. category: best-fit category ID from the list above (or "uncategorized")
2. confidence: 0-100 how confident you are in the categorization
3. automationScore: 0-100 how automatable this specific ticket is (consider the details, not just category)
4. suggestedResolution: 1-3 sentence specific resolution steps a technician should take
5. rootCause: brief likely root cause of the issue
6. recommendedScripts: array of script filenames from the available list that would help (empty if none apply)
7. escalation: boolean — should this be escalated rather than handled at L1?
8. reasoning: 1-2 sentence explanation of your analysis

Be specific and practical. A password reset is different from an MFA enrollment issue. A slow computer from uptime is different from a slow computer from malware. Use the ticket details to make precise assessments, not just surface-level keyword matches.

Respond with a JSON array (one object per ticket) matching the input order. No markdown wrapping — just the raw JSON array.`;
}

const BATCH_SIZE = 10;

/**
 * Analyze a batch of tickets using Claude.
 * Tickets should have at minimum: id, title, description (optional: resolution, priority)
 */
async function analyzeWithAI(tickets) {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error('Anthropic API key not configured');
  }

  const results = [];

  // Process in batches to manage context size and cost
  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);
    const batchResults = await analyzeBatch(anthropic, batch);
    results.push(...batchResults);
  }

  return results;
}

async function analyzeBatch(anthropic, tickets) {
  const ticketData = tickets.map((t, idx) => ({
    index: idx,
    id: t.id || t.ticketId,
    ticketNumber: t.ticketNumber,
    title: t.title || '',
    description: t.description || '',
    resolution: t.resolution || '',
    priority: t.priority || null,
  }));

  const userMessage = `Analyze these ${tickets.length} IT support tickets:\n\n${JSON.stringify(ticketData, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text.trim();

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected JSON array');
    }

    // Map AI results back to ticket IDs
    return tickets.map((ticket, idx) => {
      const ai = parsed[idx] || {};
      return {
        ticketId: ticket.id || ticket.ticketId,
        ticketNumber: ticket.ticketNumber,
        aiCategory: ai.category || 'uncategorized',
        aiConfidence: clamp(ai.confidence || 0, 0, 100),
        aiAutomationScore: clamp(ai.automationScore || 0, 0, 100),
        aiSuggestedResolution: ai.suggestedResolution || '',
        aiRootCause: ai.rootCause || '',
        aiRecommendedScripts: Array.isArray(ai.recommendedScripts) ? ai.recommendedScripts : [],
        aiEscalation: !!ai.escalation,
        aiReasoning: ai.reasoning || '',
      };
    });
  } catch (parseErr) {
    console.error('[AI] Failed to parse Claude response:', parseErr.message);
    console.error('[AI] Raw response:', text.slice(0, 500));

    // Return empty AI results for this batch
    return tickets.map((ticket) => ({
      ticketId: ticket.id || ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
      aiCategory: null,
      aiConfidence: 0,
      aiAutomationScore: 0,
      aiSuggestedResolution: 'AI analysis failed — using keyword-based results.',
      aiRootCause: '',
      aiRecommendedScripts: [],
      aiEscalation: false,
      aiReasoning: 'Parse error in AI response.',
    }));
  }
}

/**
 * Merge AI results into existing keyword-analyzed tickets.
 * AI insights get added as an `aiInsights` object on each ticket.
 * When AI confidence > keyword confidence, AI category takes precedence.
 */
function mergeAIResults(analyzedTickets, aiResults) {
  const aiMap = new Map();
  for (const ai of aiResults) {
    const key = ai.ticketId || ai.ticketNumber;
    aiMap.set(String(key), ai);
  }

  return analyzedTickets.map((ticket) => {
    const ai = aiMap.get(String(ticket.ticketId)) || aiMap.get(String(ticket.ticketNumber));
    if (!ai) return ticket;

    // Find the category label for the AI's chosen category
    const aiPattern = CATEGORY_PATTERNS.find((p) => p.category === ai.aiCategory);
    const aiCategoryLabel = aiPattern ? aiPattern.label : 'Needs Review';

    // Determine if AI should override the keyword categorization
    const aiWins = ai.aiConfidence > ticket.matchConfidence && ai.aiCategory !== 'uncategorized';
    const categoryChanged = aiWins && ai.aiCategory !== ticket.category;

    return {
      ...ticket,
      // Override category if AI is more confident
      ...(categoryChanged
        ? {
            category: ai.aiCategory,
            categoryLabel: aiCategoryLabel,
            matchConfidence: ai.aiConfidence,
            estimatedMinutes: aiPattern ? aiPattern.avgMinutes : ticket.estimatedMinutes,
          }
        : {}),
      // Always add AI insights as a separate object
      aiInsights: {
        category: ai.aiCategory,
        categoryLabel: aiCategoryLabel,
        confidence: ai.aiConfidence,
        automationScore: ai.aiAutomationScore,
        suggestedResolution: ai.aiSuggestedResolution,
        rootCause: ai.aiRootCause,
        recommendedScripts: ai.aiRecommendedScripts,
        escalation: ai.aiEscalation,
        reasoning: ai.aiReasoning,
        categoryChanged,
        originalCategory: categoryChanged ? ticket.categoryLabel : null,
      },
      // Use AI automation score when it differs significantly from keyword score
      automationScore: Math.round(
        ticket.automationScore * 0.4 + ai.aiAutomationScore * 0.6
      ),
    };
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { analyzeWithAI, mergeAIResults, isConfigured };
