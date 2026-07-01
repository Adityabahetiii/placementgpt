require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const MODEL = "llama-3.1-8b-instant";

/* -------------------- JSON HELPERS -------------------- */

function cleanJson(text = "") {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJson(text = "") {
  const cleaned = cleanJson(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");

    if (first === -1 || last === -1 || last <= first) {
      return null;
    }

    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

/* -------------------- ROADMAP DETAIL EXTRACTION -------------------- */

function getDuration(text = "") {
  const lower = text.toLowerCase();

  const match = lower.match(
    /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(month|months|year|years)\b/i
  );

  if (!match) return "";

  const numberMap = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    twelve: "12",
  };

  const number = numberMap[match[1].toLowerCase()] || match[1];
  const unit = match[2].toLowerCase();

  if (unit.includes("year")) {
    return number === "1" ? "1 Year" : `${number} Years`;
  }

  return number === "1" ? "1 Month" : `${number} Months`;
}

function getLevel(text = "") {
  const lower = text.toLowerCase();

  if (
    lower.includes("beginner") ||
    lower.includes("begineer") ||
    lower.includes("begginer") ||
    lower.includes("no experience") ||
    lower.includes("fresher") ||
    lower.includes("starting from scratch") ||
    lower.includes("new to this")
  ) {
    return "Beginner";
  }

  if (
    lower.includes("intermediate") ||
    lower.includes("intermidiate")
  ) {
    return "Intermediate";
  }

  if (
    lower.includes("advanced") ||
    lower.includes("experienced") ||
    lower.includes("expert")
  ) {
    return "Advanced";
  }

  return "";
}

/*
  This function is the important fix.

  It supports:
  "please give me the roadmap for 6 month as im beginner for prompt engineer"
  "I want a roadmap for Data Analyst for 3 months"
  "Create a 2 month roadmap to learn Blender"
  "Roadmap for CA"
*/
function getGoalFromText(text = "") {
  const original = text.trim();

  if (!original) return "";

  const lower = original.toLowerCase();

  // Supports:
  // "roadmap for prompt engineer"
  // "6 month roadmap for prompt engineer"
  // "please give roadmap for 6 month as beginner for prompt engineer"
  // "I want to become a prompt engineer"

  const goalPatterns = [
    /\bfor\s+(?:a\s+)?([a-z][a-z\s/&-]*?)(?=\s*(?:as|in|for)\s+(?:a\s+)?(?:beginner|begineer|begginer|intermediate|advanced|\d)|$)/i,

    /\bfor\s+([a-z][a-z\s/&-]*)$/i,

    /\b(?:become|learn|prepare for)\s+(?:a\s+)?([a-z][a-z\s/&-]*?)(?=\s*(?:in|for|as)\s+|$)/i,
  ];

  for (const pattern of goalPatterns) {
    const match = original.match(pattern);

    if (match && match[1]) {
      let goal = match[1]
        .replace(/\bplease\b/gi, "")
        .replace(/\broadmap\b/gi, "")
        .replace(/\bim\b/gi, "")
        .replace(/\bi am\b/gi, "")
        .replace(/\bbeginner\b/gi, "")
        .replace(/\bbegineer\b/gi, "")
        .replace(/\bbegginer\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (goal.length >= 2) {
        // Keep abbreviations such as CA uppercase
        if (goal.toLowerCase() === "ca") {
          return "CA";
        }

        return goal.replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
      }
    }
  }

  // If user only types a goal in a later message:
  // Example: "Prompt Engineer"
  if (
    lower.length >= 2 &&
    lower.length < 60 &&
    !lower.includes("month") &&
    !lower.includes("beginner") &&
    !lower.includes("intermediate") &&
    !lower.includes("advanced") &&
    !lower.includes("experience")
  ) {
    if (lower === "ca") return "CA";

    return original.replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
  }

  return "";
}

function getConversationDetails(messages = []) {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content || "");

  let goal = "";
  let duration = "";
  let level = "";

  /*
    Important:
    Read messages from newest to oldest.

    This means if the user first asked for CA,
    then starts asking for Prompt Engineer,
    Prompt Engineer becomes the new goal.
  */
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const text = userMessages[i];

    if (!goal) {
      goal = getGoalFromText(text);
    }

    if (!duration) {
      duration = getDuration(text);
    }

    if (!level) {
      level = getLevel(text);
    }

  }

  return {
    goal,
    duration,
    level,
  };
}

/* -------------------- NORMAL CHAT -------------------- */

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messages are required.",
      });
    }

    // Allow the client to request a continuation by setting `continue: true`.
    // We'll make one extra model call to continue the previous assistant reply
    // when requested. By default, increase token limit to avoid early truncation.
    const maxTokens = 4096;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content:
            "You are PlacementGPT. Help students with placements, DSA, SQL, aptitude, resumes, interviews, cybersecurity, and career preparation. Use markdown and keep answers useful.",
        },
        ...messages,
      ],
    });

    const choice = completion.choices && completion.choices[0];
    const content = choice?.message?.content || "";
    const finishReason = choice?.finish_reason || choice?.finishReason || null;

    // If model stopped because of length, provide a friendly hint and flags.
    const truncated = finishReason === "length" || finishReason === "max_tokens";

    let replyText = content;

    if (truncated) {
      // Append a short user-visible hint so end-users know they can continue.
      replyText = `${content}\n\nThe response exceeded the maximum length. Click Continue to generate the remaining content.`;
    }

    // If client asked for an explicit continuation in this request, perform one continuation call.
    if (req.body.continue === true && truncated) {
      try {
        const contCompletion = await groq.chat.completions.create({
          model: MODEL,
          temperature: 0.7,
          max_tokens: maxTokens,
          messages: [
            {
              role: "system",
              content:
                "Continue the previous assistant reply from where it stopped. Do not repeat previous content. Continue naturally.",
            },
            ...messages,
          ],
        });

        const contChoice = contCompletion.choices && contCompletion.choices[0];
        const contText = contChoice?.message?.content || "";
        const contFinish = contChoice?.finish_reason || contChoice?.finishReason || null;

        // Combine previous and continuation pieces into one reply string.
        replyText = `${content}\n${contText}`;

        // Update truncated flag based on continuation result.
        const stillTruncated = contFinish === "length" || contFinish === "max_tokens";

        return res.json({
          reply: replyText,
          finish_reason: contFinish,
          truncated: stillTruncated,
          can_continue: stillTruncated,
        });
      } catch (err) {
        console.error("CHAT CONTINUATION ERROR:", err);
        // Fall back to returning the partial reply with metadata.
      }
    }

    return res.json({
      reply: replyText,
      finish_reason: finishReason,
      truncated,
      can_continue: truncated,
    });
  } catch (error) {
    console.error("CHAT ERROR:", error);

    return res.status(500).json({
      error: "Failed to get AI response.",
    });
  }
});

/* -------------------- ROADMAP CHAT -------------------- */

app.post("/roadmap-chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required.",
      });
    }

    const details = getConversationDetails(messages);

    console.log("ROADMAP DETAILS:", details);

    if (!details.goal) {
      return res.json({
        type: "question",
        reply: "What would you like a roadmap for?",
      });
    }

    if (!details.duration) {
      return res.json({
        type: "question",
        reply: `How long do you want your ${details.goal} roadmap to cover?`,
      });
    }

    if (!details.level) {
      return res.json({
        type: "question",
        reply: `What is your current level for ${details.goal}: beginner, intermediate, or advanced?`,
      });
    }

    return res.json({
      type: "roadmap",
      reply: `Great — I will create a ${details.duration} roadmap for ${details.goal} at ${details.level} level.`,
      goal: details.goal,
      duration: details.duration,
      level: details.level,
    });
  } catch (error) {
    console.error("ROADMAP CHAT ERROR:", error);

    return res.status(500).json({
      error: "Could not continue roadmap conversation.",
    });
  }
});

/* -------------------- ROADMAP GENERATOR -------------------- */

app.post("/generate-roadmap", async (req, res) => {
  try {
    const { goal, duration, level } = req.body;

    if (!goal || !duration || !level) {
      return res.status(400).json({
        error: "Goal, duration, and level are required.",
      });
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.35,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `
You are an expert roadmap creator.

Create a practical roadmap for the exact user goal. Never change the goal into another field.

For example:
- If goal is Prompt Engineer, create Prompt Engineering roadmap.
- If goal is Chartered Accountant, create CA roadmap.
- If goal is Video Editor, create Video Editing roadmap.
- If goal is Blender, create Blender learning roadmap.

Return ONLY valid JSON. No markdown or code fences. Do not add explanations.

Use exactly this structure:
{
  "title": "string",
  "duration": "string",
  "summary": "string",
  "phases": [
    {
      "title": "string",
      "emoji": "string",
      "skills": ["string"],
      "outcome": "string"
    }
  ],
  "highlights": ["string"],
  "nextSteps": ["string"]
}

Create 4 to 6 phases. Each phase should represent a logical milestone. Keep the skills short, practical, and specific.
`,
        },
        {
          role: "user",
          content: `Goal: ${goal}\nDuration: ${duration}\nLevel: ${level}`,
        },
      ],
    });

    const choice = completion.choices && completion.choices[0];
    let raw = choice?.message?.content || "";
    const finishReason = choice?.finish_reason || choice?.finishReason || null;

    // If the model stopped because of length, try one automatic continuation
    if (finishReason === "length" || finishReason === "max_tokens") {
      try {
        const cont = await groq.chat.completions.create({
          model: MODEL,
          temperature: 0.35,
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content:
                "Continue the previous JSON output exactly where it stopped. Return only the remaining JSON content without markdown or explanation.",
            },
            {
              role: "user",
              content: `Goal: ${goal}\nDuration: ${duration}\nLevel: ${level}`,
            },
          ],
        });

        const contChoice = cont.choices && cont.choices[0];
        const contText = contChoice?.message?.content || "";
        raw = `${raw}\n${contText}`;
      } catch (err) {
        console.error("ROADMAP CONTINUATION ERROR:", err);
      }
    }

    console.log("ROADMAP RAW:", raw);

    const roadmap = extractJson(raw);

    if (!roadmap || !roadmap.title || !Array.isArray(roadmap.phases)) {
      return res.status(500).json({
        error: "Could not process the roadmap. Please try again.",
      });
    }

    if (!roadmap.duration) roadmap.duration = duration;
    if (!roadmap.summary) {
      roadmap.summary = `A structured ${duration} roadmap for ${goal} at ${level} level.`;
    }

    roadmap.phases = roadmap.phases
      .filter((phase) => phase && phase.title && Array.isArray(phase.skills))
      .map((phase, index) => ({
        title: String(phase.title),
        emoji: String(phase.emoji || ["🚀", "📚", "🧠", "🛠️", "🎯", "🏁"][index % 6]),
        skills: phase.skills.map((skill) => String(skill)).filter(Boolean),
        outcome: String(
          phase.outcome || `Milestone ${index + 1} for ${goal}`
        ),
      }));

    roadmap.highlights = Array.isArray(roadmap.highlights)
      ? roadmap.highlights.map((item) => String(item)).filter(Boolean)
      : [];

    roadmap.nextSteps = Array.isArray(roadmap.nextSteps)
      ? roadmap.nextSteps.map((item) => String(item)).filter(Boolean)
      : [];

    return res.json(roadmap);
  } catch (error) {
    console.error("ROADMAP ERROR:", error);

    return res.status(500).json({
      error: "Failed to generate roadmap.",
    });
  }
});
app.post("/analyze-resume", async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({
        error: "Resume text is required.",
      });
    }

    const prompt = `
You are an expert ATS Resume Reviewer.

Analyze the following resume and return ONLY valid JSON.

Required format:

{
  "atsScore": 0,
  "verdict": "",
  "strengths": [],
  "weaknesses": [],
  "missingKeywords": [],
  "suggestions": []
}

Rules:
- atsScore should be between 0-100.
- strengths should be an array.
- weaknesses should be an array.
- missingKeywords should be an array.
- suggestions should be an array.
- Do NOT return markdown.
- Do NOT wrap inside code blocks.

Resume:

${resumeText}
`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const choice = completion.choices && completion.choices[0];
    let raw = choice?.message?.content || "";
    const finishReason = choice?.finish_reason || choice?.finishReason || null;

    if (finishReason === "length" || finishReason === "max_tokens") {
      try {
        const cont = await groq.chat.completions.create({
          model: MODEL,
          temperature: 0.3,
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content:
                "Continue the previous JSON output exactly where it stopped. Return only the remaining JSON content without markdown or explanation.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const contChoice = cont.choices && cont.choices[0];
        const contText = contChoice?.message?.content || "";
        raw = `${raw}\n${contText}`;
      } catch (err) {
        console.error("RESUME ANALYSIS CONTINUATION ERROR:", err);
      }
    }

    const analysis = extractJson(raw);

    if (!analysis) {
      return res.status(500).json({
        error: "Failed to parse AI response.",
      });
    }

    res.json(analysis);
  } catch (err) {
    console.error("Resume Analysis Error:", err);

    res.status(500).json({
      error: "Failed to analyze resume.",
    });
  }
});
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 PlacementGPT Backend is running successfully!",
    endpoints: [
      "/chat",
      "/roadmap-chat",
      "/generate-roadmap",
      "/analyze-resume"
    ],
  });
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});