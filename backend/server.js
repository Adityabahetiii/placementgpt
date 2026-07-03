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
    /\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twelve)(?:\s+([a-z]+))?\b/i
  );

  if (!match) return "";

  const numberMap = {
    one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10", twelve: "12",
  };

  const number = numberMap[match[1].toLowerCase()] || match[1];
  const unit = match[2] ? match[2].toLowerCase() : "";

  if (!unit) {
    return "AMBIGUOUS";
  }
  
  const parsedNumber = parseFloat(number);

  if (
    unit.includes("year") || 
    unit.includes("yr") || 
    unit === "y" ||
    /^y.*r/i.test(unit)
  ) {
    if (parsedNumber % 1 !== 0) {
      const months = Math.round(parsedNumber * 12);
      return `${months} Months`;
    }
    return number === "1" ? "1 Year" : `${number} Years`;
  }

  if (
    unit.includes("month") || 
    unit.includes("moth") || 
    unit.includes("mnth") || 
    unit.includes("mo") ||
    /^m.*n.*t/i.test(unit) ||
    /^m.*o.*t/i.test(unit) ||
    unit === "m" ||
    unit === "mponth" ||
    unit === "mnths"
  ) {
    return number === "1" ? "1 Month" : `${number} Months`;
  }

  return "AMBIGUOUS";
}

function getLevel(text = "") {
  const lower = text.toLowerCase();

  if (
    /\b(beginner|begineer|beginer|begginer|biginner|begginner|fresher)\b/i.test(lower) ||
    lower.includes("no experience") ||
    lower.includes("starting from scratch") ||
    lower.includes("new to this")
  ) {
    return "Beginner";
  }

  if (
    /\b(intermediate|intermidiate|intermediete|intermediatee|intermadiate)\b/i.test(lower)
  ) {
    return "Intermediate";
  }

  if (
    /\b(advanced|advnced|advanved|advaced|advance|experienced|expert)\b/i.test(lower)
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
const careerAliases = {
  "ca": "Chartered Accountant",
  "ai": "AI Engineer",
  "ml": "Machine Learning Engineer",
  "sde": "Software Development Engineer",
  "swe": "Software Engineer",
  "se": "Software Engineer",
  "ui ux": "UI/UX Designer",
  "ui/ux": "UI/UX Designer",
  "pm": "Product Manager",
  "ba": "Business Analyst",
  "da": "Data Analyst",
  "qa": "Quality Assurance Engineer",
  "hr": "Human Resources",
  "ds": "Data Scientist",
  "dba": "Database Administrator"
};

function resolveCareerAlias(goal) {
  const normalized = goal.toLowerCase().trim();
  if (careerAliases[normalized]) {
    return careerAliases[normalized];
  }
  return goal.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGoalFromText(text = "", skipFallback = false) {
  // Strip trailing punctuation right away so regex $ anchor works on the actual word
  const original = text.trim().replace(/[\\\\.,!?]+$/, "");

  if (!original) return "";

  const lower = original.toLowerCase();

  const goalPatterns = [
    // Matches: "roadmap for [goal]", "guide me for [goal]", "career path for [goal]", "for [goal]"
    /\b(?:for|on|in)\s+(?:(?:a|an|the)\s+)?([a-z0-9\s/&+#-]*?)(?=\s*(?:as|for|roadmap|path|career|beginner|intermediate|advanced|\d)|$)/i,

    // Matches: "become [goal]", "learn [goal]", "prepare for [goal]", "be [goal]", "work as [goal]"
    /\b(?:become|be|work as|get a job as|learn|prepare for|study|master)\s+(?:(?:a|an|the)\s+)?([a-z0-9\s/&+#-]*?)(?=\s*(?:in|for|as|roadmap|path)\s+|$)/i,

    // Matches: "[goal] roadmap", "[goal] career path", "[goal] guide"
    /(?:^|\b)(?:i want a\s+|give me a\s+|create a\s+|a\s+)?([a-z0-9\s/&+#-]*?)\s+(?:roadmap|career path|path|guide|journey)(?=\s*(?:for|as|in|to)\b|$)/i
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
        const genericGoals = ["tech", "technology", "business", "it", "engineering", "science", "arts", "medical", "finance"];
        if (genericGoals.includes(goal.toLowerCase())) {
          return ""; // Treat as ambiguous to force clarification
        }

        return resolveCareerAlias(goal);
      }
    }
  }

  if (skipFallback) {
    return "";
  }

  // If user only types a goal in a later message:
  // Example: "Prompt Engineer"
  if (
    lower.length >= 2 &&
    lower.length < 60 &&
    !lower.includes("month") &&
    !lower.includes("year") &&
    !/\b(beginner|begineer|beginer|begginer|biginner|begginner|intermediate|intermidiate|intermediete|intermediatee|intermadiate|advanced|advnced|advanved|advaced|advance|experienced|expert)\b/i.test(lower)
  ) {
    const isGibberish = 
      !/[a-zA-Z]/.test(lower) || 
      /[0-9]{3,}/.test(lower) ||
      /^([a-z]{2,4})\1+$/i.test(lower) ||
      /(.)\1{2,}/.test(lower) || 
      /[aeiou]{4,}/i.test(lower) || 
      /(abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz)/i.test(lower) ||
      /^(asdf|qwerty|qwer|zxcv|test|testing)$/i.test(lower);
    if (isGibberish) return "";

    // Check if it's a conversational message that should NOT be treated as a goal.
    const isConversational = /^(hello|hi|hii|heyy|helo|hlo|hey|what|who|why|how|where|when|thanks?|thx|bye|goodbye|can you|help|ok|okay|yes|no|please|i want|i need|give me|create|make|generate|build|roadmap|learning path|good|morning|evening|you|idk|nothing|not sure|dont know|don't know|whatever|any|random|cancel|stop|never mind|suggest|regenerate|change|update)\b/i.test(lower);
    
    if (isConversational) {
      return "";
    }

    return resolveCareerAlias(original);
  }

  return "";
}

function getConversationDetails(messages = []) {
  let goal = "";
  let duration = "";
  let level = "";

  // Find the index of the most recent user message
  let newestUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      newestUserIndex = i;
      break;
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    // 1. Exit roadmap mode automatically if a roadmap was already generated
    // UNLESS the newest user message is an update (e.g. changing duration/level or saying regenerate)
    if (
      message.role === "assistant" &&
      message.content &&
      message.content.includes("I will create a") &&
      message.content.includes("roadmap")
    ) {
      const newestMsg = messages[newestUserIndex];
      const newestText = newestMsg ? (newestMsg.content || "") : "";
      
      const isUpdate = 
        getDuration(newestText) || 
        getLevel(newestText) || 
        /\b(change|update|make it|regenerate|re-generate|instead)\b/i.test(newestText);
        
      if (!isUpdate) {
        break; // Stop looking further back, effectively resetting the goal
      }
    }

    if (message.role === "user") {
      const text = message.content || "";
      
      let wasWaitingForLevel = false;
      let wasWaitingForDuration = false;
      
      if (i === newestUserIndex) {
        let lastAsst = null;
        for (let j = i - 1; j >= 0; j--) {
          if (messages[j].role === "assistant") {
            lastAsst = messages[j];
            break;
          }
        }
        if (lastAsst) {
          if (lastAsst.content.includes("What is your current level") || lastAsst.content.includes("valid level")) {
            wasWaitingForLevel = true;
          }
          if (lastAsst.content.includes("How long do you want your") || lastAsst.content.includes("meant months or years")) {
            wasWaitingForDuration = true;
          }
        }
      }

      const skipFallback = wasWaitingForLevel || wasWaitingForDuration;
      const g = getGoalFromText(text, skipFallback);
      const d = getDuration(text);
      const l = getLevel(text);

      // 2. Cancel roadmap mode if the NEWEST user message has no roadmap data
      if (i === newestUserIndex) {
        if (!g && !d && !l) {
          const isConv = /^(hello|hi|hii|heyy|helo|hlo|hey|what|who|why|how|where|when|thanks?|thx|bye|goodbye|can you|help|ok|okay|yes|no|please|i want|i need|give me|create|make|generate|build|roadmap|learning path|good|morning|evening|you|idk|nothing|not sure|dont know|don't know|whatever|any|random|cancel|stop|never mind|suggest)\b/i.test(text.toLowerCase());
          const isUpdateMsg = /\b(change|update|make it|regenerate|re-generate|instead)\b/i.test(text.toLowerCase());
          
          if (isUpdateMsg) {
            continue;
          }
          
          if (skipFallback && !isConv) {
            continue; 
          }
          return { goal: "", duration: "", level: "" };
        }
        
        // 3. Discard previous roadmap request if the user asks for a new goal
        if (g) {
          return { goal: g, duration: d, level: l };
        }
      }

      if (!goal && g) goal = g;
      if (!duration && d) duration = d;
      if (!level && l) level = l;
    }
  }

  return { goal, duration, level };
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

    const lastUserMessage = messages.slice().reverse().find(m => m.role === "user")?.content || "";
    
    // Fast regex detection for theme/color/template change requests
    const hasThemeKeyword = /\b(theme|tehme|color|colour|template|style|look|visual|design|appearance|poster|image|background)\b/i.test(lastUserMessage);
    const hasChangeKeyword = /\b(change|chnage|chaneg|different|another|other|new|random|update|switch|swap|ugly|bad|weird)\b/i.test(lastUserMessage) || /don'?t like/i.test(lastUserMessage) || /didn'?t like/i.test(lastUserMessage);
    
    // Trigger if both keywords match, OR if they explicitly say they don't like it/want to change it right after generating a roadmap
    const conversationalChange = /\b(something else|another one|try another|different one|next one|one more|do it again|again|once more|change it|chnage it|chaneg it|change the theme|chnage the theme|change tehme|chnage tehme)\b/i.test(lastUserMessage);
    const isThemeChange = (hasThemeKeyword && hasChangeKeyword) || /don'?t like/i.test(lastUserMessage) || /didn'?t like/i.test(lastUserMessage) || /^(change|chnage|chaneg)(\s+it)?$/i.test(lastUserMessage.trim()) || conversationalChange;
    
    if (isThemeChange) {
      return res.json({
        type: "change_theme",
        reply: "I've applied a fresh new look to your roadmap poster! Let me know if you want to try another one."
      });
    }

    const details = getConversationDetails(messages);

    console.log("ROADMAP DETAILS:", details);

    if (details.goal) {
      try {
        const validationCompletion = await groq.chat.completions.create({
          model: MODEL,
          temperature: 0,
          max_tokens: 10,
          messages: [
            { role: "system", content: "You are a validation assistant. Is the following text a valid career, real skill, or field of study? Reply ONLY with YES or NO. Text: " + details.goal }
          ]
        });
        const isValid = validationCompletion.choices[0]?.message?.content?.trim().toUpperCase();
        
        if (isValid && isValid.includes("NO")) {
          // If it's not a valid career, clear the goal so the conversational LLM can handle it gracefully.
          details.goal = ""; 
        }
      } catch (err) {
        console.error("Validation error:", err);
      }
    }

    if (!details.goal) {
      try {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          temperature: 0.7,
          max_tokens: 150,
          messages: [
            {
              role: "system",
              content: `You are a strict, guided Roadmap Assistant. Your ONLY purpose is to help users generate learning roadmaps. You are NOT a general chatbot. Do NOT have long conversations.

RULES FOR RESPONSES:
1. If the user greets you to start a conversation (e.g., Hello, Hi, Hey, Good morning). Do NOT use this for farewells like bye:
   Reply exactly: "👋 Welcome! Tell me the career or skill you want a roadmap for."
2. If the user asks who you are or what you can do (e.g., Who are you?, What can you do?):
   Reply exactly: "I generate personalized learning roadmaps for careers and skills. Tell me the career or skill you want to learn."
3. If the user is confused or asks for help (e.g., I'm confused, Help me, Suggest a career):
   Reply exactly:
   "What field interests you most?

   • Software Development
   • AI / Machine Learning
   • Data Analytics
   • Cybersecurity
   • Cloud Computing
   • Business / MBA
   • Finance / CA
   • UI/UX Design
   • Something else"
4. If the user types random gibberish, punctuation, emojis, or numbers (e.g., abcdef, 123456, 😂😂😂):
   Reply exactly: "I couldn't understand that. Please tell me the career or skill you want a roadmap for."
5. If the user says Cancel, Stop, or Never mind:
   Reply exactly: "Sure! Whenever you're ready, tell me the career or skill you want a roadmap for."
6. If the user provides a valid career or skill (even broadly, like "Data Analyst"), do NOT ask for specializations, areas of interest, or unnecessary follow-up questions. Instead, reply EXACTLY with: "I can help with that! Please tell me just the name of the career or skill you want a roadmap for."
7. Only ask clarifying questions if the user's request is genuinely ambiguous (e.g. "I want to work in tech", "I need career guidance").
8. If the user is ending the conversation, saying bye, goodbye, or thanking you (e.g., Bye, Byee, Goodbye, Thanks, Thank you):
   Reply exactly: "It was nice helping you! Let me know if you need a roadmap for any other career or skill. Have a great day!"
Always prioritize these exact responses. Do not output markdown other than the bulleted list in rule 3.`
            },
            ...messages
          ]
        });
        const reply = completion.choices[0]?.message?.content || "What specific career or skill would you like a roadmap for? (e.g. Data Analyst, AI Engineer, AWS, MBA, CA, Cybersecurity)";
        return res.json({
          type: "question",
          reply: reply,
        });
      } catch (err) {
        return res.json({
          type: "question",
          reply: "What would you like a roadmap for?",
        });
      }
    }

    if (details.duration === "AMBIGUOUS") {
      return res.json({
        type: "question",
        reply: `I caught the number, but I'm not sure if you meant months or years. Could you please clarify? (e.g. 6 months)`,
      });
    }

    if (!details.duration) {
      return res.json({
        type: "question",
        reply: `How long do you want your ${details.goal} roadmap to cover?`,
      });
    }

    if (!details.level) {
      const lastMsg = messages[messages.length - 2];
      const alreadyAsked = lastMsg && lastMsg.role === "assistant" && (lastMsg.content.includes("What is your current level") || lastMsg.content.includes("valid level"));
      
      if (alreadyAsked) {
        return res.json({
          type: "question",
          reply: `Please choose a valid level: Beginner, Intermediate, or Advanced.`,
        });
      }

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
      max_tokens: 8000,
      messages: [
        {
          role: "system",
          content: `
You are an expert roadmap creator.

IMPORTANT VALIDATION:
First, verify if the requested goal is a valid, recognizable career, skill, or learning domain.
If the goal is unclear, gibberish (e.g. "asdf"), or overly broad (e.g. "stuff"), DO NOT GUESS or generate a roadmap.
Instead, return a JSON object with a single "error" field containing a polite message asking the user to clarify. Example: { "error": "I'm not sure what 'asdf' is. Could you please clarify your career goal?" }

If the goal is valid, create a practical roadmap for the exact user goal. Never change the goal into another field.

For example:
- If goal is Prompt Engineer, create Prompt Engineering roadmap.
- If goal is Chartered Accountant, create CA roadmap.
- If goal is Video Editor, create Video Editing roadmap.
- If goal is Blender, create Blender learning roadmap.

Return ONLY valid JSON. No markdown or code fences. Do not add explanations.

Use exactly this structure:
{
  "title": "string (The roadmap title. MUST start with the exact goal name, e.g. 'Data Analyst Roadmap')",
  "duration": "string",
  "summary": "string",
  "phases": [
    {
      "title": "string (Phase name)",
      "emoji": "string",
      "estimatedDuration": "string (e.g. 1 Month)",
      "skills": ["string (Important skill)"],
      "projects": ["string (Mini project)"],
      "learningResources": ["string (Resource links or names)"],
      "milestone": "string (Major milestone)",
      "outcome": "string (Expected outcome)"
    }
  ],
  "highlights": ["string"],
  "nextSteps": ["string"]
}

Create 4 to 6 phases. Each phase should represent a monthly or phase-wise progression. Keep the skills short, practical, and specific.
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

    if (roadmap && roadmap.error) {
      return res.status(400).json({ error: roadmap.error });
    }

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
        estimatedDuration: String(phase.estimatedDuration || ""),
        skills: phase.skills.map((skill) => String(skill)).filter(Boolean),
        projects: Array.isArray(phase.projects) ? phase.projects.map((proj) => String(proj)).filter(Boolean) : [],
        learningResources: Array.isArray(phase.learningResources) ? phase.learningResources.map(r => String(r)).filter(Boolean) : [],
        milestone: String(phase.milestone || ""),
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