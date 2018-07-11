
// returns all services Compass has marked as bus replaced today
module.exports = function busReplacementQuery() {
    const Sequelize = require('sequelize');
    let moment = require('moment-timezone');
    moment().tz('Pacific/Auckland').format();

    return new Promise((resolve, reject) => {
        let today = moment().format('YYYY-MM-DD');
        let timetableQueryString = `
        DECLARE @todaydate datetime;
        SET @todaydate = '`+today+`'
        
        SELECT [TT_TDN] As 'serviceId'
              ,[BusReplacement] AS 'busReplaced'
        FROM [Compass].[COMPASS].[TDW_Daily_Services]
        WHERE [BusReplacement] != 0
        AND [OPERATING_DATE] = @todaydate
        `;
        let sequelize = new Sequelize('Compass', 'TDW-Compass', 'wx38tt2018', {
          host: 'APNZWPCPSQL01',
          dialect: 'mssql',
        });

        let currentBusReplacedList = [];
        let replacementOccurance = {};

        sequelize.query(timetableQueryString)
        .then(function(response) {
          for (tp = 0; tp < response[0].length; tp++) {
            replacementOccurance = {};
            if (response[0][tp].serviceId !== null) {
              replacementOccurance = {
                    serviceId: response[0][tp].serviceId,
                    replacementType: response[0][tp].busReplaced,
                  };
                  currentBusReplacedList.push(replacementOccurance);
                };
          };
          resolve(currentBusReplacedList);
        }
      );
    });
};
