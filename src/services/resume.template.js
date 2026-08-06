/**
 * Renders structured resume data into a single-column, LaTeX-style HTML
 * document ready for Puppeteer.
 *
 * The AI only supplies the *content*; the layout lives here so every generated
 * resume comes out with the same tight, ATS-friendly formatting instead of
 * whatever markup the model felt like inventing that day.
 */

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")

/** Strips the scheme so links read like "linkedin.com/in/name" on paper. */
const displayUrl = (url = "") => String(url).replace(/^https?:\/\//i, "").replace(/\/$/, "")

/** Looks like "example.com/x" or "https://example.com" rather than free text. */
const isUrl = (value = "") => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(String(value).trim())

const link = (url) => {
    if (!url) return ""
    // The model sometimes returns a label ("Live Demo") instead of a URL —
    // rendering that as an anchor would produce a dead link.
    if (!isUrl(url)) return escapeHtml(url)

    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    return `<a href="${escapeHtml(href)}">${escapeHtml(displayUrl(url))}</a>`
}

const bullets = (items = []) => {
    const list = items.filter(Boolean)
    if (!list.length) return ""
    return `<ul>${list.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
}

const section = (title, body) =>
    body ? `<section class="section"><h2>${escapeHtml(title)}</h2>${body}</section>` : ""

const dateRange = (start, end) =>
    [ start, end ].filter(Boolean).join(" – ")

/** Header: name, headline and the pipe-separated contact line. */
const renderHeader = ({ name, title, contact = {} }) => {
    const parts = [
        escapeHtml(contact.phone),
        escapeHtml(contact.location),
        contact.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : "",
        link(contact.linkedin),
        link(contact.github),
        link(contact.portfolio),
    ].filter(Boolean)

    return `
    <header class="header">
      <h1>${escapeHtml(name)}</h1>
      ${title ? `<p class="headline">(${escapeHtml(title)})</p>` : ""}
      ${parts.length ? `<p class="contact">${parts.join(' <span class="sep">|</span> ')}</p>` : ""}
    </header>`
}

const renderSkills = (skills = []) => {
    const rows = skills
        .filter(group => group?.category && group?.items)
        .map(group => `<p class="skill-row"><span class="skill-label">${escapeHtml(group.category)}</span> : ${escapeHtml(group.items)}</p>`)
        .join("")
    return rows ? `<div class="indent">${rows}</div>` : ""
}

const renderExperience = (experience = []) => {
    const rows = experience
        .filter(job => job?.role || job?.company)
        .map(job => `
      <div class="entry">
        <div class="entry-line">
          <span class="entry-primary">${escapeHtml(job.role)}</span>
          <span class="entry-meta">${escapeHtml(dateRange(job.startDate, job.endDate))}</span>
        </div>
        <div class="entry-line">
          <span class="entry-secondary">${escapeHtml(job.company)}</span>
          <span class="entry-meta entry-secondary">${escapeHtml(job.location || "")}</span>
        </div>
        ${bullets(job.highlights)}
      </div>`)
        .join("")
    return rows ? `<div class="indent">${rows}</div>` : ""
}

const renderProjects = (projects = []) => {
    const rows = projects
        .filter(project => project?.name)
        .map(project => {
            const meta = [
                project.techStack ? `<span class="entry-secondary">${escapeHtml(project.techStack)}</span>` : "",
                project.link ? link(project.link) : "",
            ].filter(Boolean).join(' <span class="sep">|</span> ')

            return `
      <div class="entry">
        <div class="entry-title">
          <span class="entry-primary">${escapeHtml(project.name)}</span>${meta ? ` <span class="sep">|</span> ${meta}` : ""}
        </div>
        ${bullets(project.highlights)}
      </div>`
        })
        .join("")
    return rows ? `<div class="indent">${rows}</div>` : ""
}

const renderEducation = (education = []) => {
    const rows = education
        .filter(item => item?.degree || item?.institution)
        .map(item => {
            const left = [
                `<span class="entry-primary">${escapeHtml(item.degree)}</span>`,
                escapeHtml(item.institution),
                escapeHtml(item.score || ""),
            ].filter(Boolean).join(' <span class="sep">|</span> ')

            return `
      <div class="entry-line education-line">
        <span>${left}</span>
        <span class="entry-meta">${escapeHtml(item.date || "")}</span>
      </div>`
        })
        .join("")
    return rows ? `<div class="indent">${rows}</div>` : ""
}

const styles = `
  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
  }

  body {
    /* Times clones — closest match to the LaTeX look on a headless box. */
    font-family: "Nimbus Roman", "Liberation Serif", "Times New Roman", Times, serif;
    font-size: 9.7pt;
    line-height: 1.34;
    color: #000;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: #000;
    text-decoration: underline;
  }

  .sep {
    padding: 0 1px;
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .header {
    text-align: center;
    margin-bottom: 7pt;
  }

  .header h1 {
    margin: 0;
    font-size: 23pt;
    font-weight: 400;
    font-variant: small-caps;
    letter-spacing: 0.6pt;
    line-height: 1.1;
  }

  .headline {
    margin: 1pt 0 0;
    font-size: 10.5pt;
  }

  .contact {
    margin: 3pt 0 0;
    font-size: 9.3pt;
  }

  /* ── Sections ───────────────────────────────────────────────────────── */
  .section {
    margin-top: 6pt;
  }

  .section h2 {
    margin: 0 0 3pt;
    padding-bottom: 1.5pt;
    border-bottom: 0.6pt solid #000;
    font-size: 11pt;
    font-weight: 400;
    font-variant: small-caps;
    letter-spacing: 0.4pt;
  }

  .section > p {
    margin: 0;
  }

  /* Content sits slightly inside the rule, like the reference. */
  .indent {
    padding-left: 6pt;
  }

  /* ── Entries ────────────────────────────────────────────────────────── */
  .entry {
    margin-bottom: 4pt;
  }

  .entry:last-child {
    margin-bottom: 0;
  }

  .entry-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10pt;
  }

  .entry-primary {
    font-weight: 700;
  }

  .entry-secondary {
    font-style: italic;
  }

  .entry-meta {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .entry-title {
    margin-bottom: 0.5pt;
  }

  .education-line {
    margin-bottom: 1.5pt;
  }

  .skill-row {
    margin: 0 0 1.5pt;
  }

  .skill-label {
    font-weight: 700;
  }

  /* ── Bullets ────────────────────────────────────────────────────────── */
  ul {
    margin: 1.5pt 0 0;
    padding-left: 11pt;
  }

  li {
    margin-bottom: 1.2pt;
    padding-left: 1pt;
  }

  /* Never split an entry across a page break. */
  .entry, .education-line, .header {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .section h2 {
    break-after: avoid;
    page-break-after: avoid;
  }
`

/**
 * @param {object} data structured resume content produced by the AI
 * @returns {string} full HTML document
 */
function renderResumeHtml(data = {}) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.name || "Resume")}</title>
    <style>${styles}</style>
  </head>
  <body>
    ${renderHeader(data)}
    ${section("Professional Summary", data.summary ? `<p class="indent">${escapeHtml(data.summary)}</p>` : "")}
    ${section("Technical Skills", renderSkills(data.skills))}
    ${section("Work Experience", renderExperience(data.experience))}
    ${section("Projects", renderProjects(data.projects))}
    ${section("Education", renderEducation(data.education))}
  </body>
</html>`
}

module.exports = { renderResumeHtml }
