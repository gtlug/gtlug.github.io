const fs = require("fs");
const path = require("path");
const self = module.exports = {
    db: {
        path: path.join(__dirname, "../data/db.sqlite3")
    },
    fb: {
        graphVersion: "v25.0",
        pageId: 174679149251925,
        pageAcccessToken: "EABBngIj0EzEBSO0Yd3DCKBnGt6dUJSHNl3PmOC5R2FkYn80bqIFfDW33FWfepIk4fKkx8GWD3m29TALlwgKBQviRKZByZBh1p02OUBwxsxIljzZALNIEiJNh0cl30YrQlds8MgREYb3jlXr5T9jifqrTsWcGFHXmdMiR14Bnue1nzepixd1ZASodzo1NrJWahrjUi5ZCqdFtojnH9rr2dQ5uNHiu3Qr8tZCbukKoMZD"
    },
    sync: {
        fullRefresh: false
    }
};
console.log('db', self.db.path);
