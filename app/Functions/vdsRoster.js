// returns current datetime and object with todays VDS roster per trip
module.exports = function vdsRoster() {
const Sequelize = require('sequelize');

let rosterQueryString = "SELECT "+ 
  "[dbo].[v_TsCoursesDate].NomTour AS 'shift',"+
  "[dbo].[v_TsCoursesDate].CodServiceVoiture AS 'service_id',"+
  "[dbo].[v_TsCoursesDate].CodLigne AS 'line',"+
  "[dbo].[v_AgPosition].Matricule  AS 'staff_id',+"
  "[dbo].[FiltreGrilleGrpAgentValidite].Nom As 'name_last',"+
  "[dbo].[FiltreGrilleGrpAgentValidite].Prenom As 'name_first'"+
"FROM"+
  "[dbo].[v_TsCoursesDate]"+
"JOIN [dbo].[v_AgPosition] ON"+
  "[dbo].[v_AgPosition].CodPosition = [dbo].[v_TsCoursesDate].NomTour"+
"JOIN [dbo].[FiltreGrilleGrpAgentValidite] ON"+
  "[dbo].[v_AgPosition].Matricule = [dbo].[FiltreGrilleGrpAgentValidite].Matricule"+
"WHERE"+
 "[dbo].[v_TsCoursesDate].Dat = '2017-07-29' AND"+
 "[dbo].[v_AgPosition].Dat = '2017-07-29' AND"+
 "[dbo].[v_TsCoursesDate].CodServiceVoiture IS NOT NULL;";

let currentRoster = {};

let sequelize = new Sequelize('VDS_TDW', 'WEBSN', 'TDW@2017', {
  host: 'APAUPVDSSQL01',
  dialect: 'mssql',
  dialectOptions: {
    instanceName: 'TDW',
  },
});

sequelize.query(rosterQueryString)
  .then(function(response) {
    currentRoster = response;
  }
);
return currentRoster;
};
