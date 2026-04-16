const { Pool, types } = require("pg");
require("dotenv").config();

// pg parses `timestamp without time zone` (OID 1114) using the local system
// timezone, which shifts the value when the server isn't in UTC.
// Override the parser to always treat the raw value as UTC so JSON output
// contains a proper ISO-8601 Z-suffix string that browsers parse correctly.
types.setTypeParser(1114, (val) =>
  val ? new Date(val.replace(" ", "T") + "Z").toISOString() : null,
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set each connection's session timezone to UTC so PostgreSQL formats
// timestamp values in UTC before handing them to the type parser above.
pool.on("connect", (client) => {
  client.query("SET timezone = 'UTC'");
});

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
