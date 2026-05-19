const fs = require("fs");
const path = require("path");
module.exports = {
    db: {
        path: path.join(__dirname, "../data/db.sqlite")
    },
    fb: {
        graphVersion: "v25.0",
        pageId: "", // @TODO: Get from Facebook grpup "transparency" page
        pageAcccessToken: "" // @TODO: Get from Facebook Graph Explorer /me/accounts access_token
    },
    sync: {
        fullRefresh: false
    }
};