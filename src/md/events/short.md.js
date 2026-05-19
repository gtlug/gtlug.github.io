const dayjs = require('dayjs');
module.exports = (event) => `
<table>
 <tr>
  <th>When</th>
  <td>${dayjs(event.start_time).format('dddd, MMMM D, YYYY h:mm A')}</td>
 </tr>
 <tr>
  <th>Topic</th>
  <td>${event.name}</td>
 </tr>
 <tr>
  <th>Description</th>
  <td>
${event.description}
  </td>
 </tr>
</table>
`;