// returns current datetime and object with todays VDS roster per trip
// module.exports = function vdsRoster() {
let mysql = require('mysql');

let con = mysql.createConnection({
  host: 'APAUPVDSSQL01', // '10.44.0.236:49807', // 'APAUPVDSSQL01',
  port: '49807',
  user: 'WEBSN',
  password: 'TDW@2017',
  database: 'VDS_TDW',
});

con.connect(function(err) {
  if (err) throw err;
  con.query('SELECT 1', function(err, result, fields) {
    if (err) throw err;
    console.log(result);
  });
});
// };
