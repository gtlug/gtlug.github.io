module.exports = (year, events) => `
# ${year} Meetings

${events.map(event => require('./short.md')(event)).join('<hr/>\n')}
`;