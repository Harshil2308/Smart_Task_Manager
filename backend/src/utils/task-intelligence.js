const axios = require("axios");
const { pool } = require("../config/db");

const LABEL_RANK = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
};

const LEVEL_RANK = {
  Low: 1,
  Medium: 2,
  High: 3
};

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function normalizeText(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function toTitleCase(value) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function inferCategory(text) {
  if (text.includes("meeting")) {
    return "Meeting";
  }

  if (text.includes("client")) {
    return "Client";
  }

  if (text.includes("bug") || text.includes("issue")) {
    return "Engineering";
  }

  if (text.includes("report") || text.includes("review")) {
    return "Operations";
  }

  return "General";
}

function extractDeadlineFromText(text) {
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lower = normalizeText(text);

  let deadlineDate = null;
  let matchedPhrase = "";

  if (lower.includes("today")) {
    deadlineDate = baseDate;
    matchedPhrase = "today";
  } else if (lower.includes("tomorrow")) {
    deadlineDate = new Date(baseDate);
    deadlineDate.setDate(deadlineDate.getDate() + 1);
    matchedPhrase = "tomorrow";
  } else if (lower.includes("next week")) {
    deadlineDate = new Date(baseDate);
    deadlineDate.setDate(deadlineDate.getDate() + 7);
    matchedPhrase = "next week";
  } else {
    const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);

    if (inDaysMatch) {
      const dayCount = Number(inDaysMatch[1]);
      deadlineDate = new Date(baseDate);
      deadlineDate.setDate(deadlineDate.getDate() + dayCount);
      matchedPhrase = inDaysMatch[0];
    }
  }

  if (!deadlineDate) {
    deadlineDate = new Date(baseDate);
    deadlineDate.setDate(deadlineDate.getDate() + 7);
  }

  const deadlineDays = Math.max(
    0,
    Math.ceil((deadlineDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    deadline: deadlineDate.toISOString().slice(0, 10),
    deadlineDays,
    matchedPhrase
  };
}

function parseVoiceText(voiceText = "") {
  const cleanedText = (voiceText || "").replace(/\s+/g, " ").trim();
  const deadlineInfo = extractDeadlineFromText(cleanedText);

  let title = cleanedText;
  if (deadlineInfo.matchedPhrase) {
    title = title.replace(new RegExp(deadlineInfo.matchedPhrase, "i"), "").trim();
  }

  title = title
    .replace(/\b(by|before|for)\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: title || "Voice task",
    description: cleanedText,
    deadline: deadlineInfo.deadline,
    deadlineDays: deadlineInfo.deadlineDays,
    category: inferCategory(normalizeText(cleanedText))
  };
}

async function fetchKeywordOverrides(text) {
  const normalized = normalizeText(text);
  const [keywordRows] = await pool.execute(
    "SELECT keyword, priority_label, effort, impact FROM reference_keywords"
  );

  const matches = keywordRows.filter((row) => normalized.includes(row.keyword.toLowerCase()));

  if (matches.length === 0) {
    return {
      matchedKeywords: [],
      priorityLabel: null,
      effort: null,
      impact: null
    };
  }

  const strongestPriority = matches.reduce((best, row) => {
    const candidate = row.priority_label || best;
    return (LABEL_RANK[candidate] || 0) > (LABEL_RANK[best] || 0) ? candidate : best;
  }, "Low");

  const strongestEffort = matches.reduce((best, row) => {
    const candidate = toTitleCase(row.effort || best);
    return (LEVEL_RANK[candidate] || 0) > (LEVEL_RANK[best] || 0) ? candidate : best;
  }, "Low");

  const strongestImpact = matches.reduce((best, row) => {
    const candidate = toTitleCase(row.impact || best);
    return (LEVEL_RANK[candidate] || 0) > (LEVEL_RANK[best] || 0) ? candidate : best;
  }, "Low");

  return {
    matchedKeywords: matches.map((row) => row.keyword),
    priorityLabel: strongestPriority,
    effort: strongestEffort,
    impact: strongestImpact
  };
}

function enhancePriorityScore(baseScore, overrides) {
  let score = Number(baseScore || 0);

  if (overrides.priorityLabel === "High") {
    score += 12;
  } else if (overrides.priorityLabel === "Critical") {
    score += 18;
  }

  if (overrides.impact === "High") {
    score += 6;
  }

  if (overrides.effort === "High") {
    score += 4;
  }

  return clamp(Math.round(score * 100) / 100, 0, 100);
}

function strongestLabel(...labels) {
  return labels.reduce((best, label) => {
    return (LABEL_RANK[label] || 0) > (LABEL_RANK[best] || 0) ? label : best;
  }, "Low");
}

async function predictTaskPriority(taskPayload) {
  const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:5000";
  const response = await axios.post(`${mlServiceUrl}/predict`, {
    deadline_days: taskPayload.deadlineDays,
    effort: taskPayload.effort,
    impact: taskPayload.impact,
    workload: taskPayload.workload
  }, {
    timeout: 5000
  });

  return response.data;
}

module.exports = {
  enhancePriorityScore,
  extractDeadlineFromText,
  fetchKeywordOverrides,
  inferCategory,
  parseVoiceText,
  predictTaskPriority,
  strongestLabel,
  toTitleCase
};
