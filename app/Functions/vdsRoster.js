// returns current datetime and object with todays VDS roster per trip
module.exports = function vdsRoster() {
let mysql = require('mysql');

let con = mysql.createConnection({
  host: 'APAUPVDSSQL01',
  user: 'WEBSN',
  password: 'TDW@2017',
  database: 'VDS_TDW',
});

con.connect(function(err) {
  if (err) throw err;
  con.query('SELECT * FROM customers', function(err, result, fields) {
    if (err) throw err;
    console.log(result);
  });
});
};
