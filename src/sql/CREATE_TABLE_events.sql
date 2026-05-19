CREATE TABLE events (
    id TEXT PRIMARY KEY,                     -- Event ID
    name TEXT,                               -- Event title
    description TEXT,                        -- Full description
    start_time TEXT,                         -- ISO8601 timestamp
    end_time TEXT,                           -- ISO8601 timestamp
    updated_time TEXT,                       -- ISO8601 timestamp
    created_time TEXT,                       -- ISO8601 timestamp

    -- Complex objects stored as JSON
    place JSON,                              -- Venue object
    cover JSON,                              -- Cover photo object
    event_times JSON,                        -- Recurring event instances
    owner JSON,                              -- Owner object

    -- Event metadata
    category TEXT,                           -- Event category
    type TEXT,                               -- Event type
    timezone TEXT,                           -- Timezone string
    is_online BOOLEAN,                       -- Online event flag
    is_canceled BOOLEAN,                     -- Cancellation flag
    is_draft BOOLEAN,                        -- Draft flag
    is_page_owned BOOLEAN,                   -- Whether the Page owns the event

    -- Ticketing
    ticket_uri TEXT,                         -- Ticket link
    ticketing_privacy_uri TEXT,
    ticketing_terms_uri TEXT,

    -- Engagement counts
    attending_count INTEGER,
    interested_count INTEGER,
    declined_count INTEGER,
    maybe_count INTEGER,
    noreply_count INTEGER,

    -- Publishing metadata
    scheduled_publish_time TEXT,
    publish_time TEXT,

    -- Group / host info
    parent_group JSON,
    event_host TEXT                           -- Host name or Page
);

