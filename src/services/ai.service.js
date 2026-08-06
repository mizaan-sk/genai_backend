const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")
const { renderResumeHtml } = require("./resume.template")

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEN_API_KEY
})


const interviewReportSchema = z.object({
  matchScore: z.number(),

  technicalQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string()
    })
  ).min(5),

  behavioralQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string()
    })
  ).min(3),

  skillGaps: z.array(
    z.object({
      skill: z.string(),
severity: z.enum(["low", "medium", "high"]).default("medium")    })
  ).min(2),

  preparationPlan: z.array(
    z.object({
      day: z.number(),
      focus: z.string(),
      tasks: z.array(z.string()).min(2)
    })
  ).min(5),

    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


const prompt = `
You are an expert technical interviewer and career coach.

Generate a COMPLETE interview preparation report in STRICT JSON format.

IMPORTANT:
- Return ONLY raw JSON
- No markdown
- No explanation
- No extra text
- No code block

The JSON must EXACTLY follow this structure:

{
  "matchScore": number,
  "title": string,
  "technicalQuestions": [
    {
      "question": string,
      "intention": string,
      "answer": string
    }
  ],
  "behavioralQuestions": [
    {
      "question": string,
      "intention": string,
      "answer": string
    }
  ],
"skillGaps": [
  {
    "skill": string,
    "severity": "low" | "medium" | "high"
  }
]

IMPORTANT:
EVERY object inside skillGaps MUST contain BOTH:
- skill
- severity

severity can ONLY be:
- low
- medium
- high
  "preparationPlan": [
    {
      "day": number,
      "focus": string,
      "tasks": [string]
    }
  ]
}

STRICT REQUIREMENTS:
- Minimum 5 technical questions
- Minimum 3 behavioral questions
- Minimum 2 skill gaps
- Minimum 5 preparation plan days
- Do NOT leave arrays empty

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}
Do NOT omit any fields from objects.
Every object must contain all required properties.
`
  const response = await ai.models.generateContent({
    // model: "gemini-3-flash-preview",
    model: "gemini-2.5-flash", contents: prompt,
    config: {
      responseMimeType: "application/json",
      // responseSchema: zodToJsonSchema(interviewReportSchema),
    }
  })
const rawText = response.text
  console.log("RAW RESPONSE:")
  console.log(rawText)

  const cleaned = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  const jsonData = JSON.parse(cleaned)

  const validatedData =
    interviewReportSchema.parse(jsonData)

  return validatedData

}



/**
 * Calls Gemini, retrying the transient "model overloaded" / rate-limit errors
 * that otherwise surface to the user as a failed download.
 */
async function generateContentWithRetry(request, { retries = 3, delayMs = 1500 } = {}) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(request)
    } catch (error) {
      lastError = error
      const status = error?.status ?? error?.code
      const retryable = status === 503 || status === 429 || /unavailable|overloaded|high demand|rate limit/i.test(error?.message || "")

      if (!retryable || attempt === retries) break

      console.warn(`Gemini call failed (attempt ${attempt + 1}/${retries + 1}), retrying…`, error.message)
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
    }
  }

  throw lastError
}

async function generatePdfFromHtml(htmlContent, margin = {
  top: "20mm",
  bottom: "20mm",
  left: "15mm",
  right: "15mm"
}) {
  const browser = await puppeteer.launch()
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    return await page.pdf({ format: "A4", printBackground: true, margin })
  } finally {
    // always release chromium, even when rendering throws
    await browser.close()
  }
}

/**
 * The AI fills in this structure and nothing else — the visual layout is owned
 * by resume.template.js, so every generated resume looks identical.
 */
const resumeContentSchema = z.object({
  name: z.string().describe("The candidate's full name"),
  title: z.string().describe("Short professional headline, e.g. 'Full Stack Developer'"),
  contact: z.object({
    phone: z.string(),
    location: z.string().describe("City, State"),
    email: z.string(),
    linkedin: z.string().describe("LinkedIn URL without the scheme, or an empty string"),
    github: z.string().describe("GitHub URL without the scheme, or an empty string"),
    portfolio: z.string().describe("Portfolio URL without the scheme, or an empty string")
  }),
  summary: z.string().describe("2-3 sentence professional summary tailored to the job description"),
  skills: z.array(z.object({
    category: z.string().describe("e.g. Frontend, Backend, Database, Tools"),
    items: z.string().describe("Comma separated skills for this category")
  })).min(3).max(7),
  experience: z.array(z.object({
    role: z.string(),
    company: z.string().describe("Company name plus employment type, e.g. 'Acme Ltd (Full-time, On-site)'"),
    location: z.string(),
    startDate: z.string().describe("e.g. 'Apr 2025'"),
    endDate: z.string().describe("e.g. 'Present'"),
    highlights: z.array(z.string()).min(2).max(4).describe("Achievement bullets, each one line, starting with an action verb and quantified where possible")
  })),
  projects: z.array(z.object({
    name: z.string(),
    techStack: z.string().describe("Comma separated technologies"),
    link: z.string().describe("Live demo or repo URL without the scheme, or an empty string"),
    highlights: z.array(z.string()).min(2).max(4)
  })).max(3),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    score: z.string().describe("e.g. 'CGPI: 9.93' or '82%', or an empty string"),
    date: z.string().describe("e.g. 'Mar 2025'")
  }))
})

/**
 * Converts a zod schema into the JSON Schema subset Gemini accepts.
 *
 * NOTE: this project is on zod v4, and the `zod-to-json-schema` package only
 * understands zod v3 — it silently returns `{}`, which makes Gemini invent its
 * own response shape. zod v4 ships its own converter, so use that.
 */
function toGeminiSchema(zodSchema) {
  const jsonSchema = z.toJSONSchema(zodSchema, { io: "input" })

  const clean = (node) => {
    if (Array.isArray(node)) return node.map(clean)
    if (!node || typeof node !== "object") return node

    const result = {}
    for (const [ key, value ] of Object.entries(node)) {
      if ([ "$schema", "additionalProperties", "definitions", "$ref", "default" ].includes(key)) continue
      result[ key ] = clean(value)
    }
    return result
  }

  return clean(jsonSchema)
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

  const prompt = `You are an expert technical resume writer. Rewrite the candidate's resume so it is tailored to the target job description.

CANDIDATE'S CURRENT RESUME:
${resume}

CANDIDATE'S SELF DESCRIPTION:
${selfDescription}

TARGET JOB DESCRIPTION:
${jobDescription}

Rules:
- Return ONLY the structured JSON fields requested. Do NOT return HTML, markdown or styling of any kind — the layout is handled separately.
- Use ONLY facts present in the candidate's resume and self description. Never invent employers, dates, degrees, or metrics that are not there.
- Reorder and reword the real content so the experience most relevant to the job description comes first and mirrors the job's terminology.
- Every highlight bullet must start with a strong past-tense action verb, fit on ONE line (roughly 120-165 characters), and quantify impact where the source material supports it.
- Keep it ATS friendly: plain language, real skill keywords from the job description, no tables, no icons, no special characters.
- Be concise. The rendered result must fit on ONE A4 page: at most 3 skill-to-6 skill categories, at most 4 bullets per role, and at most 2-3 projects.
- Write like an experienced human wrote it. Avoid AI-sounding filler such as "leveraged synergies" or "passionate about cutting-edge technologies".
- If a field genuinely has no source data, return an empty string for it rather than making something up.`

  // gemini-3-flash-preview kept returning 503 "high demand" and killed the
  // download — use the same stable model the interview report already uses.
  const response = await generateContentWithRetry({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(resumeContentSchema),
    }
  })

  const resumeContent = JSON.parse(response.text)

  if (!resumeContent?.name) {
    throw new Error("The AI response did not contain any resume content.")
  }

  // Tighter margins than the default — the template controls its own spacing.
  return generatePdfFromHtml(renderResumeHtml(resumeContent), {
    top: "12mm",
    bottom: "12mm",
    left: "13mm",
    right: "13mm"
  })
}

module.exports = { generateInterviewReport, generateResumePdf }