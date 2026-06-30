require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const app = express();
const axios = require("axios");
app.use(cors());
app.use(express.json({ limit: "10mb" }));
const { InferenceClient } = require("@huggingface/inference");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const hf = new InferenceClient(process.env.HF_API_KEY);
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

function wantsImage(text = "") {
  const lower = text.toLowerCase();

  return [
    "generate image",
    "generate an image",
    "make an image",
    "create an image",
    "visual roadmap",
    "roadmap image",
    "infographic",
    "diagram",
  ].some((word) => lower.includes(word));
}

function saysNoToImage(text = "") {
  const lower = text.toLowerCase().trim();

  return (
    lower === "no" ||
    lower === "nope" ||
    lower.includes("no image") ||
    lower.includes("without image") ||
    lower.includes("don't want image") ||
    lower.includes("dont want image") ||
    lower.includes("not visual")
  );
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
  let imageRequested = false;
  let imageRejected = false;

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

    if (wantsImage(text)) {
      imageRequested = true;
    }

    if (saysNoToImage(text)) {
      imageRejected = true;
    }
  }

  return {
    goal,
    duration,
    level,
    wantsImage: imageRequested && !imageRejected,
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

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "You are PlacementGPT. Help students with placements, DSA, SQL, aptitude, resumes, interviews, cybersecurity, and career preparation. Use markdown and keep answers useful.",
        },
        ...messages,
      ],
    });

    return res.json({
      reply: completion.choices[0].message.content,
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
      type: details.wantsImage ? "image" : "roadmap",
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
      max_tokens: 1800,
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

Return ONLY valid JSON. No markdown or code fences.

Use exactly this structure:
{
  "title": "string",
  "overview": "string",
  "phases": [
    {
      "title": "string",
      "duration": "string",
      "topics": ["string"],
      "tasks": ["string"],
      "project": "string"
    }
  ],
  "interviewPreparation": ["string"],
  "finalAdvice": "string"
}

Create 3 or 4 phases. Keep tasks short and practical.
`,
        },
        {
          role: "user",
          content: `Goal: ${goal}\nDuration: ${duration}\nLevel: ${level}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    console.log("ROADMAP RAW:", raw);

    const roadmap = extractJson(raw);

    if (!roadmap) {
      return res.status(500).json({
        error: "Could not process the roadmap. Please try again.",
      });
    }

    return res.json(roadmap);
  } catch (error) {
    console.error("ROADMAP ERROR:", error);

    return res.status(500).json({
      error: "Failed to generate roadmap.",
    });
  }
});
app.post("/generate-roadmap-image", async (req, res) => {
  try {
    const { goal, duration, level } = req.body;

    const prompt = `
Create a modern professional career roadmap infographic.

Career: ${goal}
Duration: ${duration}
Level: ${level}

Requirements:
- Dark navy background
- Blue glowing timeline
- Modern UI design
- Vertical infographic
- Professional icons
- Learning milestones
- Career progression
- High quality
- Clean typography
- No watermark
`;

    const image = await hf.textToImage({
      provider: "nscale",
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: prompt,
      parameters: {
        num_inference_steps: 6,
      },
    });

    const buffer = Buffer.from(await image.arrayBuffer());

    res.json({
      image: `data:image/png;base64,${buffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("HF ERROR:");
    console.error(err);

    res.status(500).json({
      error: err.message,
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
      "/generate-roadmap-image",
    ],
  });
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});