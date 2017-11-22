
// returns current datetime and object with todays VDS roster per trip
module.exports = function vdsRosterDuties() {
    const Sequelize = require('sequelize');
    let moment = require('moment-timezone');
    moment().tz('Pacific/Auckland').format();
    // DB of staff names
    let betterStaffNames = require('../Data/betterStaffNames');

    return new Promise((resolve, reject) => {
      let today = moment().format('YYYY-MM-DD');
      let rosterQueryString = `
        DECLARE @ThisDate datetime;
        SET @ThisDate = '`+today+`'
        
        SELECT
        [VDS_TDW].[dbo].[TsTourDate].[Dat] As 'date',
        [VDS_TDW].[dbo].[AfPosition].[Matricule] As 'staffId',
        [VDS_TDW].[dbo].[AgPersonne].[Prenom] As 'fName',
        [VDS_TDW].[dbo].[AgPersonne].[Nom] As 'lName',
        [VDS_TDW].[dbo].[TsTour].[NomTour] As 'shiftName',
        [VDS_TDW].[dbo].[TsTour].[CodCatPersonnel] As 'shiftType',
        [VDS_TDW].[dbo].[TsMission].[LibMission] As 'dutyName',
        [VDS_TDW].[dbo].[TsMission].[TypeTravail] As 'dutyType',
        [VDS_TDW].[dbo].[TsMission].[HreDeb] As 'timeFrom',
        [VDS_TDW].[dbo].[TsMission].[HreFin] As 'timeTo'
        
        FROM [VDS_TDW].[dbo].[TsTourDate]
        
        JOIN [VDS_TDW].[dbo].[TsTour] ON
        [VDS_TDW].[dbo].[TsTourDate].[SeqTour] = [VDS_TDW].[dbo].[TsTour].[SeqTour]
        
        JOIN [VDS_TDW].[dbo].[TsMissionTour] ON
        [VDS_TDW].[dbo].[TsTourDate].[SeqTour] = [VDS_TDW].[dbo].[TsMissionTour].[SeqTour]
        
        JOIN [VDS_TDW].[dbo].[TsMission] ON
        [VDS_TDW].[dbo].[TsMission].[SeqMission] = [VDS_TDW].[dbo].[TsMissionTour].[SeqMission]

        JOIN [VDS_TDW].[dbo].[AfPosition] ON
        [VDS_TDW].[dbo].[AfPosition].[SeqTourReal] = [VDS_TDW].[dbo].[TsMissionTour].[SeqTour]
        
        JOIN [VDS_TDW].[dbo].[AgPersonne] ON
        [VDS_TDW].[dbo].[AgPersonne].[Matricule] = [VDS_TDW].[dbo].[AfPosition].[Matricule]
        
        WHERE [VDS_TDW].[dbo].[TsTourDate].[Dat] = @ThisDate
        AND [VDS_TDW].[dbo].[AfPosition].[DatPosition] = @ThisDate
        
        ORDER BY [VDS_TDW].[dbo].[AfPosition].[Matricule], [VDS_TDW].[dbo].[TsMission].[HreDeb]
      `;

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
            if (response[0][trp].dutyName !== null && response[0][trp].dutyType !== 'REC') {
                serviceRoster = {
                    shiftId: response[0][trp].shiftName.trim(),
                    shiftType: response[0][trp].shiftType.trim(),
                    staffId: response[0][trp].staffId.trim(),
                    staffName: response[0][trp].fName.trim() +
                    ' ' + response[0][trp].lName.trim(),
                    dutyName: response[0][trp].dutyName.trim(),
                    dutyType: response[0][trp].dutyType.trim(),
                    dutyStartTime: mpm2m(response[0][trp].timeFrom),
                    dutyEndTime: mpm2m(response[0][trp].timeTo),
                  };
                  // fix some of the obscure staff names
                  for (sn = 0; sn < betterStaffNames.length; sn++) {
                    if (serviceRoster.staffId == betterStaffNames[sn].staffId) {
                      serviceRoster.staffName = betterStaffNames[sn].staffName;
                      break;
                    };
                  };
                  currentRoster.push(serviceRoster);
                };
          };
          resolve(currentRoster);
        }
      );
    });

  /**
   * Takes a time in min past midnight
   * Converts it into a moment object
   * @param {string} minutesPastMidnight 
   * @return {object} - Moment object
   */
  function mpm2m(minutesPastMidnight) {
    let thisMoment = moment();
    thisMoment.set('hour', 0);
    thisMoment.set('minute', 0);
    thisMoment.set('seconds', 0);
    thisMoment.set('miliseconds', 0);
    thisMoment.add(minutesPastMidnight, 'minutes');
    return thisMoment;
  };
};
