/**
 * render-pages.js
 *
 * Generates Markdown files for GitHub Pages based on events stored in SQLite.
 * Produces:
 *   - /events/YYYY/index.md for each year
 *   - /events/upcoming.md for the next upcoming event
 * Feature Requeests:
 *   - @TODO /index.md update
 */
const 
  {log, error} = console,
  fs = require("fs"),
  path = require("path"),
  config = require('./config'),
  Promise = require('bluebird'),
  sqlite3 = require("sqlite3").verbose(),
  dayjs = require("dayjs"),
  DB_PATH = config.db.path,
  PAGE_ID = config.fb.pageId,
  PAGE_ACCESS_TOKEN = config.fb.pageAcccessToken,
  GRAPH_VERSION = config.fb.graphVersion,
  FULL_REFRESH = config.sync.fullRefresh,
  OUTPUT_DIR = path.join(__dirname, "../events")
;

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
    db.all("SELECT * FROM events ORDER BY start_time DESC", (err, rows) => {
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
  // all events are in desc order, so we want the last event listed
  // because that's the more recent upcoming event
  // usually not a problem if only one upcoming event
  return futureEvents.length > 0 ? futureEvents.pop() : null;
}

/**
 * Write a Markdown file for a given year.
 * @param {string} year
 * @param {Object[]} events
 */
function writeYearPage(year, events) {
  const md = require('./md/events/year.md')(year, events);

  const 
    filePath = path.join(OUTPUT_DIR, `${year}/index.md`)
    dir = path.dirname(filePath)
  ;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  log('Rendered Events Year Page', year);
  fs.writeFileSync(filePath, md, "utf8");
}

/**
 * Write the upcoming event page.
 * @param {Object|null} event
 */
function writeUpcomingPage(event) {
  const 
    filePath = path.join(OUTPUT_DIR, `upcoming.md`),
    dir = path.dirname(filePath)
  ;
  let md;

  if (!event) {
    // @todo move
    md = `---\ntitle: Upcoming Event\nlayout: default\n---\n\n# No upcoming events.\n`
  }
  else {
    md = require('./md/events/upcoming.md')(event);
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  log('Rendered Upcoming Event Page');
  fs.writeFileSync(filePath, md, "utf8");
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

