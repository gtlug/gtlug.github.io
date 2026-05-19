/**
 * render-pages.js
 *
 * Generates Markdown files for GitHub Pages based on events stored in SQLite.
 * Produces:
 *   - /events/YYYY.md for each year
 *   - /events/upcoming.md for the next upcoming event
 *
 * Requirements:
 *   npm install sqlite3 dayjs
 */

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dayjs = require("dayjs");

/** @type {string} Path to SQLite DB */
const DB_PATH = path.join(__dirname, "../data/db.sqlite");

/** @type {string} Output directory for Markdown pages */
const OUTPUT_DIR = path.join(__dirname, "../events");

/**
 * Ensure output directory exists.
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Open SQLite connection.
 * @returns {sqlite3.Database}
 */
function openDb() {
  return new sqlite3.Database(DB_PATH);
}

/**
 * Fetch all events from SQLite.
 * @param {sqlite3.Database} db
 * @returns {Promise<Object[]>}
 */
function getAllEvents(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM events ORDER BY start_time ASC", (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Group events by year.
 * @param {Object[]} events
 * @returns {Record<string, Object[]>}
 */
function groupEventsByYear(events) {
  const groups = {};
  for (const event of events) {
    const year = dayjs(event.start_time).year();
    if (!groups[year]) groups[year] = [];
    groups[year].push(event);
  }
  return groups;
}

/**
 * Find the next upcoming event.
 * @param {Object[]} events
 * @returns {Object|null}
 */
function findUpcomingEvent(events) {
  const now = dayjs();
  const futureEvents = events.filter(e => dayjs(e.start_time).isAfter(now));
  return futureEvents.length > 0 ? futureEvents[0] : null;
}

/**
 * Convert an event object into Markdown.
 * @param {Object} event
 * @returns {string}
 */
function eventToMarkdown(event) {
  const start = dayjs(event.start_time).format("MMMM D, YYYY h:mm A");
  const end = event.end_time
    ? dayjs(event.end_time).format("MMMM D, YYYY h:mm A")
    : null;

  return `
## ${event.name}

**Date:** ${start}  
${end ? `**Ends:** ${end}  ` : ""}

${event.description || ""}

${event.ticket_uri ? `**Tickets:** ${event.ticket_uri}` : ""}
`;
}

/**
 * Write a Markdown file for a given year.
 * @param {string} year
 * @param {Object[]} events
 */
function writeYearPage(year, events) {
  const md = [
    `---`,
    `title: Events for ${year}`,
    `layout: default`,
    `---`,
    ``,
    `# Events for ${year}`,
    ``
  ];

  for (const event of events) {
    md.push(eventToMarkdown(event));
  }

  const filePath = path.join(OUTPUT_DIR, `${year}.md`);
  fs.writeFileSync(filePath, md.join("\n"), "utf8");
}

/**
 * Write the upcoming event page.
 * @param {Object|null} event
 */
function writeUpcomingPage(event) {
  const filePath = path.join(OUTPUT_DIR, `upcoming.md`);

  if (!event) {
    fs.writeFileSync(
      filePath,
      `---\ntitle: Upcoming Event\nlayout: default\n---\n\n# No upcoming events.\n`,
      "utf8"
    );
    return;
  }

  const md = [
    `---`,
    `title: Upcoming Event`,
    `layout: default`,
    `---`,
    ``,
    `# Next Upcoming Event`,
    ``,
    eventToMarkdown(event)
  ];

  fs.writeFileSync(filePath, md.join("\n"), "utf8");
}

/**
 * Main build function.
 */
async function main() {
  ensureOutputDir();
  const db = openDb();

  try {
    const events = await getAllEvents(db);

    // Group by year
    const groups = groupEventsByYear(events);

    // Write year pages
    for (const year of Object.keys(groups)) {
      writeYearPage(year, groups[year]);
    }

    // Write upcoming event page
    const upcoming = findUpcomingEvent(events);
    writeUpcomingPage(upcoming);

    console.log("Markdown pages generated successfully.");
  } catch (err) {
    console.error("Error generating pages:", err);
  } finally {
    db.close();
  }
}

main();

