
// returns current timetable stop times from Compass DB
module.exports = function timetableQuery() {
    const Sequelize = require('sequelize');
    let moment = require('moment-timezone');
    moment().tz('Pacific/Auckland').format();

    return new Promise((resolve, reject) => {
        let today = moment().format('YYYY-MM-DD');
        let timetableQueryString = `
        DECLARE @todaydate datetime;
        SET @todaydate = '`+today+`'
        DECLARE @dayType varchar(2);
        
        /* determines which timetable to look for - day of week */
        SET @dayType = CASE DATEPART(weekday, @todaydate)
             WHEN '1' THEN '7'
             WHEN '2' THEN '5'
             WHEN '3' THEN '5'
             WHEN '4' THEN '5'
             WHEN '5' THEN '5'
             WHEN '6' THEN '55'
             WHEN '7' THEN '6'
        END
        /* selects that tometable - prioritises single day timetables*/
        DECLARE @timetableId int;
        SET @timetableId = (
            SELECT TOP (1) [TT_ID]
            FROM [Compass].[COMPASS].[TDW_Timetables]
            WHERE [TT_EFFECTIVE_DATE] <= @todaydate
            AND [IS_ARCHIVED] = 0
            AND [TT_DAY_TYPE] = @dayType
            ORDER BY [TT_SINGLE_DAY_ONLY] DESC)
        
            SELECT [TT_TDN] As 'serviceId'
            ,a.serviceDeparts AS 'serviceDeparts'
            ,[Compass].[COMPASS].[TDW_LOOKUPS4].[DESCRIPTION] As 'line'
            ,[TT_DIRECTION] As 'direction'
            ,[TT_BLOCK] As 'blockId'
            ,[TT_PLANNED_TRAIN_TYPE] As 'units'
            ,[TT_TRAFFIC_TYPE] As 'serviceType'
            ,[TT_TIME_ARRIVAL] As 'arrives'
            ,[TT_TIME_DEPART] As 'departs'
            ,[TT_LOCATION] As 'station'
            ,[TT_SEQUENCE] As 'stationSequence'
            ,@dayType As 'dayType'
        FROM [Compass].[COMPASS].[TDW_Timetables_Detail]
        /* needs to join this lookup table to get real line names*/
        JOIN [Compass].[COMPASS].[TDW_LOOKUPS4] ON
        [Compass].[COMPASS].[TDW_LOOKUPS4].[CODE] = [Compass].[COMPASS].[TDW_Timetables_Detail].[TT_LINE]
        /* gets the departure time for the service for later sorting */
        LEFT JOIN 
        (SELECT [TT_TDN] AS 'ATDN', [TT_TIME_ARRIVAL] AS 'serviceDeparts'
            FROM [Compass].[COMPASS].[TDW_Timetables_Detail]
            WHERE [TT_ID] = @timetableId
            AND [TT_SEQUENCE] = 1
        ) AS a
        ON [Compass].[COMPASS].[TDW_Timetables_Detail].[TT_TDN] = a.ATDN
    WHERE [Compass].[COMPASS].[TDW_LOOKUPS4].[TABLEID] = 44
    AND [Compass].[COMPASS].[TDW_Timetables_Detail].[TT_ID] = @timetableId
    ORDER BY blockId, serviceDeparts, serviceId, stationSequence
        `;

        let sequelize = new Sequelize('Compass', 'TDW-Compass', 'wx38tt2018', {
          host: 'APNZWPCPSQL01',
          dialect: 'mssql',
        });

        let currentTimetable = [];
        let timingPoint = {};

        sequelize.query(timetableQueryString)
        .then(function(response) {
          for (tp = 0; tp < response[0].length; tp++) {
            timingPoint = {};
            if (response[0][tp].serviceId !== null) {
              timingPoint = {
                    serviceId: response[0][tp].serviceId,
                    line: response[0][tp].line,
                    direction: response[0][tp].direction,
                    blockId: response[0][tp].blockId,
                    units: response[0][tp].units,
                    arrives: cps2m(response[0][tp].arrives),
                    departs: cps2m(response[0][tp].departs),
                    station: response[0][tp].station,
                    stationSequence: (response[0][tp].stationSequence -1),
                    dayType: response[0][tp].dayType,
                  };
                  currentTimetable.push(timingPoint);
                };
          };
          resolve(currentTimetable);
        }
      );
    });
  /**
   * Takes a time Compass format
   * Converts it into a moment object
   * @param {string} compasstime 
   * @return {object} - Moment object
   */
  function cps2m(compasstime) {
    let thisMoment = moment();
    thisMoment.set('hour', compasstime.substring(0, 2));
    thisMoment.set('minute', compasstime.substring(2, 4));
    thisMoment.set('second', compasstime.substring(4, 6));
    thisMoment.set('miliseconds', 0);
    return thisMoment;
  };
};
