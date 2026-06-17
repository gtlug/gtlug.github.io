const fs = require("fs");
const path = require("path");
const self = module.exports = {
    db: {
        path: path.join(__dirname, "../data/db.sqlite3")
    },
    fb: {
        graphVersion: "v25.0",
        pageId: 174679149251925,
        pageAcccessToken: "EABBngIj0EzEBRmyLW9RyuYDeQtxzv7F3irwYMp445lS7izCclrSBb24b9jea3yiT4p5gsqqwWXOpSL6ZAuXxnVROoySxHZAFtdATgqMvZAzWkWRVZAnhVZCHV90ZBMK9FynEERq5HFMS3CBGkBjhG6PHdFJ3FWEilE2WdQlSRnMUzYQzZC4rSZBxxY9590VgxDwxKjYVLgjq2BpJZBLnJ8zYiMJFDBQN1C6O0i1MZD"
    },
    sync: {
        fullRefresh: false
    }
};
console.log('db', self.db.path);
