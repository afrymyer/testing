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
6. recommendedScripts: array of script filenames from the AVAILABLE AUTOMATION SCRIPTS list that would resolve this ticket. Be specific — match scripts to the actual symptoms described, not just the category. If the keyword matcher missed a relevant script, include it here. If the keyword matcher suggested a wrong script, do NOT include it. Only recommend scripts that would genuinely help resolve this specific issue.
7. scriptReasoning: 1 sentence explaining why you chose these scripts (or why none apply). Example: "clear-print-spooler.ps1 matches because user describes stuck print jobs in queue" or "No scripts apply — this requires physical hardware inspection"
8. escalation: boolean — should this be escalated rather than handled at L1?
9. reasoning: 1-2 sentence explanation of your analysis

10. sentiment: object with:
   - level: "frustrated" | "angry" | "urgent" | "anxious" | "neutral" | "patient" | "appreciative" — the CLIENT's emotional tone based on their language
   - urgency: 1-5 scale (5 = most urgent) based on language cues, not just the priority field
   - businessImpact: "blocking" | "degraded" | "inconvenience" | "routine" — how much this affects the client's ability to work
   - cues: array of 1-3 short phrases from the ticket that signal the sentiment (e.g. "tried multiple times", "entire department down", "when you get a chance", "ASAP", "been 3 days")
   - needsFollowUp: boolean — true if the client's tone suggests they need a proactive status update or empathetic response (frustrated, angry, or waiting a long time)

11. quickHitter: object with:
   - isQuickWin: boolean — true if a competent L1 tech could resolve this in 5-20 minutes using available tools/scripts
   - estimatedMinutes: your estimate of actual resolution time in minutes (be realistic, include verification time)
   - justification: 1 sentence why this is or isn't a quick win. Example: "Password reset with account unlock is a 5-min task with the reset script" or "Requires on-site hardware inspection, not a quick win"
   - blockers: array of 0-2 things that could prevent quick resolution (e.g. "user not available", "needs manager approval", "requires reboot during business hours")

Be specific and practical. A password reset is different from an MFA enrollment issue. A slow computer from uptime is different from a slow computer from malware. Use the ticket details to make precise assessments, not just surface-level keyword matches.

IMPORTANT for script recommendations: Review the AVAILABLE AUTOMATION SCRIPTS list carefully. Match based on what the script ACTUALLY RESOLVES (not just the name). If a ticket describes symptoms that a script can fix, recommend it even if the category doesn't obviously match. For example, a "Teams showing blank screen" ticket should get clear-teams-cache.ps1 even if categorized under a different category.

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

  const rawText = response.content[0].text.trim();
  const text = stripCodeFences(rawText);

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
        aiScriptReasoning: ai.scriptReasoning || '',
        aiEscalation: !!ai.escalation,
        aiReasoning: ai.reasoning || '',
        aiSentiment: ai.sentiment || null,
        aiQuickHitter: ai.quickHitter || null,
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
      // Override scripts if AI recommended different ones
      ...(ai.aiRecommendedScripts.length > 0 ? {
        suggestedScripts: ai.aiRecommendedScripts.map(scriptName => {
          const found = RESOLUTION_SCRIPTS.find(s => s.name === scriptName);
          return found ? {
            name: found.name, type: found.type, label: found.label,
            resolves: found.resolves, requires: found.requires,
            relevance: ai.aiConfidence, matchedSymptoms: ['AI-matched'],
            manualMinutes: found.manualMinutes,
          } : { name: scriptName, type: 'unknown', label: scriptName, relevance: ai.aiConfidence, matchedSymptoms: ['AI-matched'], manualMinutes: null };
        }),
      } : {}),
      // Override quick-hitter flag if AI has a different assessment
      ...(ai.aiQuickHitter ? {
        isQuickHitter: ai.aiQuickHitter.isQuickWin,
        estimatedMinutes: ai.aiQuickHitter.estimatedMinutes || ticket.estimatedMinutes,
      } : {}),
      // Always add AI insights as a separate object
      aiInsights: {
        category: ai.aiCategory,
        categoryLabel: aiCategoryLabel,
        confidence: ai.aiConfidence,
        automationScore: ai.aiAutomationScore,
        suggestedResolution: ai.aiSuggestedResolution,
        rootCause: ai.aiRootCause,
        recommendedScripts: ai.aiRecommendedScripts,
        scriptReasoning: ai.aiScriptReasoning,
        escalation: ai.aiEscalation,
        reasoning: ai.aiReasoning,
        sentiment: ai.aiSentiment,
        quickHitter: ai.aiQuickHitter,
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

/**
 * Generate batch-level AI insights that look across ALL tickets for patterns,
 * systemic issues, strategic recommendations, and workload predictions.
 */
async function generateBatchInsights(tickets, analyzedTickets) {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error('Anthropic API key not configured');
  }

  // Build a condensed summary of the ticket batch for the AI
  const categoryCount = {};
  const priorityCount = {};
  let totalAutoScore = 0;
  let escalationCount = 0;
  const descriptions = [];

  for (const t of analyzedTickets) {
    const cat = t.aiInsights?.categoryLabel || t.categoryLabel || 'Unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;

    const pri = t.priority || 'Unknown';
    priorityCount[pri] = (priorityCount[pri] || 0) + 1;

    totalAutoScore += t.automationScore || 0;
    if (t.aiInsights?.escalation) escalationCount++;

    // Include a brief of each ticket for pattern detection
    descriptions.push({
      id: t.ticketNumber || t.ticketId,
      title: t.title || '',
      category: cat,
      priority: pri,
      automationScore: t.automationScore,
      rootCause: t.aiInsights?.rootCause || '',
      escalation: t.aiInsights?.escalation || false,
      createDate: t.createDate || null,
    });
  }

  const avgAutoScore = analyzedTickets.length > 0
    ? Math.round(totalAutoScore / analyzedTickets.length)
    : 0;

  const systemPrompt = `You are a senior MSP operations strategist analyzing a batch of IT support tickets. Your job is to identify patterns, systemic issues, and strategic opportunities that individual ticket analysis would miss.

You have deep knowledge of MSP operations, SLA management, technician efficiency, and IT infrastructure health indicators.

Respond with a JSON object (no markdown wrapping) containing:

1. "executiveSummary": A 2-4 sentence executive summary suitable for an MSP manager. Highlight the most important finding, the overall health of the ticket queue, and one key action item.

2. "systemicIssues": An array of 0-5 objects, each with:
   - "issue": Short title of the systemic issue
   - "description": 1-2 sentence explanation
   - "affectedTickets": Array of ticket IDs that are related
   - "severity": "critical" | "high" | "medium" | "low"
   - "recommendation": Specific action to resolve the root cause

3. "strategicRecommendations": An array of 3-5 objects, each with:
   - "title": Short actionable title
   - "description": 1-3 sentence explanation of the recommendation
   - "impact": "high" | "medium" | "low"
   - "effort": "low" | "medium" | "high"
   - "category": "automation" | "process" | "training" | "infrastructure" | "staffing"

4. "workloadInsights": An object with:
   - "volumeAssessment": 1-2 sentence assessment of ticket volume and distribution
   - "peakPatterns": Any time-based patterns noticed (day of week, time of day, etc.)
   - "capacityRisk": "healthy" | "at_risk" | "overloaded" — assessment of team capacity
   - "capacityNote": 1 sentence explanation

5. "automationOpportunities": An array of 2-4 objects, each with:
   - "opportunity": Short title
   - "description": How to implement this automation
   - "estimatedTimeSaved": Estimated minutes saved per month
   - "ticketTypes": Which ticket categories this would affect

Be specific, data-driven, and practical. Reference actual ticket IDs and categories from the data. Don't be generic — tailor every insight to what you see in THIS specific batch.`;

  const userMessage = `Analyze this batch of ${analyzedTickets.length} MSP tickets for cross-cutting patterns and strategic insights.

BATCH SUMMARY:
- Total tickets: ${analyzedTickets.length}
- Category distribution: ${JSON.stringify(categoryCount)}
- Priority distribution: ${JSON.stringify(priorityCount)}
- Average automation score: ${avgAutoScore}%
- Escalation flags: ${escalationCount}

INDIVIDUAL TICKETS:
${JSON.stringify(descriptions, null, 2)}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawText = response.content[0].text.trim();
  const text = stripCodeFences(rawText);

  try {
    const parsed = JSON.parse(text);
    return {
      executiveSummary: parsed.executiveSummary || '',
      systemicIssues: Array.isArray(parsed.systemicIssues) ? parsed.systemicIssues : [],
      strategicRecommendations: Array.isArray(parsed.strategicRecommendations) ? parsed.strategicRecommendations : [],
      workloadInsights: parsed.workloadInsights || {},
      automationOpportunities: Array.isArray(parsed.automationOpportunities) ? parsed.automationOpportunities : [],
    };
  } catch (parseErr) {
    console.error('[AI] Failed to parse batch insights:', parseErr.message);
    console.error('[AI] Raw response:', text.slice(0, 500));
    return {
      executiveSummary: 'AI batch analysis could not be parsed. Individual ticket insights are still available.',
      systemicIssues: [],
      strategicRecommendations: [],
      workloadInsights: {},
      automationOpportunities: [],
    };
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Strip markdown code fences from AI response (e.g. ```json ... ```)
 */
function stripCodeFences(text) {
  const fenced = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return fenced ? fenced[1].trim() : text;
}

module.exports = { analyzeWithAI, mergeAIResults, generateBatchInsights, isConfigured };
