module.exports = (event) => `# Upcoming Meeting
${require('./short.md')(event)}
`;