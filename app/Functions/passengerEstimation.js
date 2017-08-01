// supporting data files
const stopTimes = require('../Data/stopTimes');
const passengerPercentage = require('../Data/passengerPercentage');
const passengerAverage = require('../Data/passengerAverage');

// passenger count calculations
module.exports = function getPaxAtStation(calendar_id,
                                          service_id,
                                          line,
                                          station,
                                          direction) {
  // array to hold list of stations and their sequence number
  var stoppingArray = [];
  var totalCount = getCountAndPeakType(calendar_id,service_id)[0];
  let stationCount = ''
  var peakType = getCountAndPeakType(calendar_id,service_id)[1];
  var addToOne = 0;


  // loop through stopTimes and get all relevant stopTimes
  for (st=0; st<stopTimes.length; st++){
    if(service_id == stopTimes[st].serviceId){
      var percent
      for (spc=0; spc < passengerPercentage.length; spc++){
        if(calendar_id == passengerPercentage[spc].calendarId && line == passengerPercentage[spc].line && peakType == passengerPercentage[spc].peakType && stopTimes[st].station == passengerPercentage[spc].stationId){
          percent = passengerPercentage[spc].percentage
          addToOne = addToOne + percent
        };
      }
      stoppingArray.push({"station":stopTimes[st].station,"sequence":stopTimes[st].stationSequence,"percent":percent,"passengerCount":0})
    }
  };

  for (sta=0; sta<stoppingArray.length;sta++){
    if (stoppingArray[sta].station == "WELL"){
      stoppingArray[sta].passengerCount = 0
    }else{
      stoppingArray[sta].percent = (stoppingArray[sta].percent / addToOne)
      stoppingArray[sta].passengerCount = totalCount * stoppingArray[sta].percent
    }
  };

  if (direction == "UP"){
    stationCount = totalCount;
    for (sta=0; sta<stoppingArray.length;sta++){
      stationCount = stationCount - stoppingArray[sta].passengerCount;
      if (stoppingArray[sta].station == station){break;};
    };
  }else if (direction == "DOWN"){
    stationCount = 0;
    for (sta=0; sta<stoppingArray.length;sta++){
      stationCount = stationCount + stoppingArray[sta].passengerCount;
      if (stoppingArray[sta].station == station){break;};
    };
  };

  // test function
  if(isNaN(stationCount)){
    // console.log(service_id);
    // console.log("station count = " + stationCount)
    // console.log(stoppingArray);
  };

  stationCount = Number(Math.round(stationCount+'e1')+'e-1');

  if(stationCount == null || stationCount == undefined){
    stationCount = "";
  };

  return stationCount;

  function getCountAndPeakType(calendar_id,service_id){
    var peakType
    var count
    for(s=0;s<passengerAverage.length;s++){
      if (passengerAverage[s].serviceId == service_id){
        peakType = passengerAverage[s].peakType;
        count = passengerAverage[s][calendar_id + "count"];
      };
    };
    if (count == undefined || peakType == undefined){
      return ["",""];
    }else{
      return [count,peakType]
    };
  };
};
