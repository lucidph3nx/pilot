// returns current datetime and object with todays VDS roster per trip
module.exports = function vdsRoster() {
const Sequelize = require('sequelize');
let moment = require('moment-timezone');
moment().tz('Pacific/Auckland').format();

return new Promise((resolve, reject) => {
  let today = moment().format('YYYY-MM-DD');
  let rosterQueryString = "SELECT "+
"[dbo].[v_AgPosition].Matricule AS 'staffId', "+
"[dbo].[v_AgPosition].CodPosition  AS 'shiftId', "+
"[dbo].[FiltreGrilleGrpAgentValidite].Nom As 'nameLast', "+
"[dbo].[FiltreGrilleGrpAgentValidite].Prenom As 'nameFirst' "+
"FROM [dbo].[v_AgPosition] "+
"JOIN [dbo].[FiltreGrilleGrpAgentValidite] ON "+
"[dbo].[v_AgPosition].Matricule = [dbo].[FiltreGrilleGrpAgentValidite].Matricule "+
"WHERE "+
"[dbo].[v_AgPosition].Dat = '"+today+"' AND "+
"[dbo].[v_AgPosition].TypPosition = 'T';"

  let sequelize = new Sequelize('VDS_TDW', 'WEBSN', 'TDW@2017', {
    host: 'APAUPVDSSQL01',
    dialect: 'mssql',
    dialectOptions: {
      instanceName: 'TDW',
    },
  });

  let currentRoster = [];
  let serviceRoster = {};

  sequelize.query(rosterQueryString)
    .then(function(response) {
      for (trp = 0; trp < response[0].length; trp++) {
        serviceRoster = {};
        serviceRoster = {
          shiftId: response[0][trp].shiftId.trim(),
          staffId: response[0][trp].staffId.trim(),
          staffName: response[0][trp].nameFirst.trim() +
          ' ' + response[0][trp].nameLast.trim(),
        };
        currentRoster.push(serviceRoster);
      };
      resolve(currentRoster);
    }
  );

    // /**
    //  *  function to extract the shift type from shift string
    //  * @param {string} shiftID - VDs shift code
    //  * @return {string} - TM,LE,PO etc
    //  */
    // function getShiftType(shiftID) {
    //   if (shiftID.length > 4) {
    //     switch (shiftID.substring(4, 6)) {
    //       case 'TM':
    //         return 'TM';
    //       case 'PO':
    //         return 'TM';
    //     }
    //   } else {
    //     return 'LE';
    //   }
    // }
  });
};
