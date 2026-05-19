/**
 * Facebook Page Events Sync Script
 * - Fetches all past + UPCOMING events from Graph API v25.0
 * - Supports incremental sync (based on latest event ID in SQLite)
 * - Supports full refresh mode
 * - Performs UPSERT into SQLite
 */

const 
  {log, error} = console,
  config = require('./config'),
  Promise = require('bluebird'),
  axios = require("axios"),
  sqlite3 = require("sqlite3").verbose(),
  DB_PATH = config.db.path,
  PAGE_ID = config.fb.pageId,
  PAGE_ACCESS_TOKEN = config.fb.pageAcccessToken,
  GRAPH_VERSION = config.fb.graphVersion,
  FULL_REFRESH = config.sync.fullRefresh
;

/**
 * Open SQLite connection
 * @returns {sqlite3.Database}
 */
function openDb() {
  const db = new sqlite3.Database(DB_PATH);
  //db.exec("PRAGMA journal_mode = WAL");
  //db.exec("PRAGMA busy_timeout = 5000");
  return db;
}


/**
 * Get the latest event updated_time
 * @param {sqlite3.Database} db
 * @returns {Promise<string|null>}
 */
function getLatestUpdatedTime(db) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT updated_time FROM events ORDER BY updated_time DESC LIMIT 1",
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.updated_time : null);
      }
    );
  });
}

/**
 * Get the latest event ID in the database (for incremental sync).
 * @param {sqlite3.Database} db
 * @returns {Promise<string|null>}
 */
function getLatestEventId(db) {
  return new Promise((resolve, reject) => {
    db.get("SELECT id FROM events ORDER BY id DESC LIMIT 1", (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.id : null);
    });
  });
}

/**
 * Upsert an event into SQLite.
 * @param {sqlite3.Database} db
 * @param {Object} event
 * @returns {Promise<void>}
 */
function upsertEvent(db, event) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO events (
        id, name, description, start_time, end_time, updated_time, created_time,
        place, cover, event_times, owner, category, type, timezone,
        is_online, is_canceled, is_draft, is_page_owned,
        ticket_uri, ticketing_privacy_uri, ticketing_terms_uri,
        attending_count, interested_count, declined_count, maybe_count, noreply_count,
        scheduled_publish_time, publish_time, parent_group, event_host
      ) VALUES (
        $id, $name, $description, $start_time, $end_time, $updated_time, $created_time,
        $place, $cover, $event_times, $owner, $category, $type, $timezone,
        $is_online, $is_canceled, $is_draft, $is_page_owned,
        $ticket_uri, $ticketing_privacy_uri, $ticketing_terms_uri,
        $attending_count, $interested_count, $declined_count, $maybe_count, $noreply_count,
        $scheduled_publish_time, $publish_time, $parent_group, $event_host
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        updated_time = excluded.updated_time,
        created_time = excluded.created_time,
        place = excluded.place,
        cover = excluded.cover,
        event_times = excluded.event_times,
        owner = excluded.owner,
        category = excluded.category,
        type = excluded.type,
        timezone = excluded.timezone,
        is_online = excluded.is_online,
        is_canceled = excluded.is_canceled,
        is_draft = excluded.is_draft,
        is_page_owned = excluded.is_page_owned,
        ticket_uri = excluded.ticket_uri,
        ticketing_privacy_uri = excluded.ticketing_privacy_uri,
        ticketing_terms_uri = excluded.ticketing_terms_uri,
        attending_count = excluded.attending_count,
        interested_count = excluded.interested_count,
        declined_count = excluded.declined_count,
        maybe_count = excluded.maybe_count,
        noreply_count = excluded.noreply_count,
        scheduled_publish_time = excluded.scheduled_publish_time,
        publish_time = excluded.publish_time,
        parent_group = excluded.parent_group,
        event_host = excluded.event_host
    `);

    stmt.run(
      {
        $id: event.id,
        $name: event.name,
        $description: event.description,
        $start_time: event.start_time,
        $end_time: event.end_time,
        $updated_time: event.updated_time,
        $created_time: event.created_time,
        $place: JSON.stringify(event.place || null),
        $cover: JSON.stringify(event.cover || null),
        $event_times: JSON.stringify(event.event_times || null),
        $owner: JSON.stringify(event.owner || null),
        $category: event.category,
        $type: event.type,
        $timezone: event.timezone,
        $is_online: event.is_online ? 1 : 0,
        $is_canceled: event.is_canceled ? 1 : 0,
        $is_draft: event.is_draft ? 1 : 0,
        $is_page_owned: event.is_page_owned ? 1 : 0,
        $ticket_uri: event.ticket_uri,
        $ticketing_privacy_uri: event.ticketing_privacy_uri,
        $ticketing_terms_uri: event.ticketing_terms_uri,
        $attending_count: event.attending_count,
        $interested_count: event.interested_count,
        $declined_count: event.declined_count,
        $maybe_count: event.maybe_count,
        $noreply_count: event.noreply_count,
        $scheduled_publish_time: event.scheduled_publish_time,
        $publish_time: event.publish_time,
        $parent_group: JSON.stringify(event.parent_group || null),
        $event_host: event.event_host
      },
      (err) => {
        if (err) return reject(err);
        stmt.finalize((finalizeErr) => {
          if (finalizeErr) return reject(finalizeErr);
          resolve();
        });
      }
    );
  });
}

/**
 * Fetch a single page of events from the Facebook Graph API,
 * ordered by updated_time descending so incremental sync is reliable.
 * @param {"past" | "upcoming"} timeFilter
 * @param {string|null} afterCursor
 * @returns {Promise<{events: Object[], nextCursor: string|null}>}
 */
async function fetchEventPage(timeFilter, afterCursor = null) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PAGE_ID}/events`;

  const params = {
    access_token: PAGE_ACCESS_TOKEN,
    time_filter: timeFilter,
    order: "updated_time_descending",
    fields: [
      "id","name","description","start_time","end_time","updated_time","created_time",
      "place","cover","event_times","is_online","attending_count","interested_count",
      "declined_count","maybe_count","noreply_count","owner","category","type",
      "timezone","ticket_uri","ticketing_privacy_uri","ticketing_terms_uri",
      "is_canceled","is_draft","is_page_owned","scheduled_publish_time","publish_time",
      "parent_group","event_host"
    ].join(",")
  };

  if (afterCursor) params.after = afterCursor;
  log('Feching Event Page', afterCursor);
  const response = await axios.get(url, { params });

  return {
    events: response.data.data || [],
    nextCursor: response.data.paging?.cursors?.after || null
  };
}

/**
 * Fetch ALL events for a given time filter ("past" or "upcoming"),
 * automatically paging through all results.
 * Stops early if incremental mode detects an already-synced event.
 *
 * @param {"past" | "upcoming"} timeFilter
 * @param {string|null} latestId - Latest event ID already in SQLite
 * @returns {Promise<Object[]>}
 */
async function fetchAllEvents(timeFilter, latestUpdatedTime = null) {
  let allEvents = [];
  let cursor = null;
  let stop = false;

  while (!stop) {
    const { events, nextCursor } = await fetchEventPage(timeFilter, cursor);

    for (const event of events) {
      // If incremental mode is enabled and this event is older or equal, stop.
      if (latestUpdatedTime && event.updated_time <= latestUpdatedTime) {
        stop = true;
        break;
      }

      allEvents.push(event);
    }

    if (stop || !nextCursor) break;
    cursor = nextCursor;
  }

  return allEvents;
}

/**
 * Main sync function.
 */
async function main() {
  const db = openDb();

  try {
    let latestUpdatedTime = null;

    if (!FULL_REFRESH) {
      latestUpdatedTime = await getLatestUpdatedTime(db);
      console.log("Incremental mode. Latest updated_time in DB:", latestUpdatedTime);
    } else {
      console.log("Full refresh mode enabled.");
    }

    console.log("Fetching upcoming events...");
    const upcomingEvents = await fetchAllEvents("upcoming", latestUpdatedTime);

    console.log("Fetching PAST events...");
    const pastEvents = await fetchAllEvents("past", latestUpdatedTime);

    const allEvents = [...upcomingEvents, ...pastEvents];
    console.log(`Fetched ${allEvents.length} new or updated events.`);

    for (const event of allEvents) {
      await upsertEvent(db, event);
    }

    log("Upsert complete.");
  } catch (err) {
    error("Error during sync:", err.response?.data || err.message);
  } finally {
    db.close();
  }
}


main();

