//  supporting data files
let moment = require('moment-timezone');
moment().tz('Pacific/Auckland').format();
// let StationMeterage = require('../Data/StationMeterage');
let unitRoster = require('../Data/unitRoster');
let stopTimes = require('../Data/stopTimes');
// let StationLatLon = require('../Data/StationLatLon');
let calendarexceptions = require('../Data/calendarexceptions');
let getPaxAtStation = require('./passengerEstimation');

// bus passenger calculations for calc interface
module.exports = function calculateBusPax(time, line, stationA, stationB) {
  let Answer = {};
  let timeA = moment(time);
  let timeB = moment(time).add(1, 'hour');
  let calendarId = calendarIDfromDate(timeA);
//  This code is for later when we have Google maps API working
//   let stationAMeterage;
//   let stationBMeterage;
//   // get meterage of both stations
//   for (st = 0; st < StationMeterage.length; st++) {
//     if (StationMeterage[st].station_id == stationA) {
//       stationAMeterage = StationMeterage[st].meterage;
//     };
//     if (StationMeterage[st].station_id == stationB) {
//       stationBMeterage = StationMeterage[st].meterage;
//     };
//   };
  let relevantServicesUpAtA =
    getAllRelevantServices(stationA, 'UP', timeA, timeB, calendarId, line);
  let relevantServicesUpAtB =
    getAllRelevantServices(stationB, 'UP', timeA, timeB, calendarId, line);
  let relevantServicesDownAtA =
    getAllRelevantServices(stationA, 'DOWN', timeA, timeB, calendarId, line);
  let relevantServicesDownAtB =
    getAllRelevantServices(stationB, 'DOWN', timeA, timeB, calendarId, line);
  // add up total pax for later comparison
  let SumPaxUpAtA = sumPaxFromRelevantServices(relevantServicesUpAtA);
  let BusEstimateUpAtA = Math.ceil(SumPaxUpAtA/50);
  let SumPaxUpAtB = sumPaxFromRelevantServices(relevantServicesUpAtB);
  let BusEstimateUpAtB = Math.ceil(SumPaxUpAtB/50);
  let SumPaxDownAtA = sumPaxFromRelevantServices(relevantServicesDownAtA);
  let BusEstimateDownAtA = Math.ceil(SumPaxDownAtA/50);
  let SumPaxDownAtB = sumPaxFromRelevantServices(relevantServicesDownAtB);
  let BusEstimateDownAtB = Math.ceil(SumPaxDownAtB/50);
  // work out biggest of the 4
  let IndexSumPaxArray =
    indexOfMax([SumPaxUpAtA, SumPaxDownAtA, SumPaxUpAtB, SumPaxDownAtB]);
  // get greater of (Pax Up@A, Pax Up@B, Pax Down@A, Pax Down@B)
  switch (IndexSumPaxArray) {
    case 0:
      Answer = [{SumPax: SumPaxUpAtA, Buses: BusEstimateUpAtA,
                Station: stationA, Direction: 'UP',
                services: relevantServicesUpAtA},
                {SumPax: SumPaxDownAtA, Buses: BusEstimateDownAtA,
                Station: stationB, Direction: 'DOWN',
                services: relevantServicesDownAtB},
                ];
      break;
    case 1:
      Answer = [{SumPax: SumPaxDownAtA, Buses: BusEstimateDownAtA,
                Station: stationB, Direction: 'DOWN',
                services: relevantServicesDownAtB},
                {SumPax: SumPaxUpAtA, Buses: BusEstimateUpAtA,
                Station: stationA, Direction: 'UP',
                services: relevantServicesUpAtA},
                ];
      break;
    case 2:
      Answer = [{SumPax: SumPaxUpAtB, Buses: BusEstimateUpAtB,
                Station: stationA, Direction: 'UP',
                services: relevantServicesUpAtA},
                {SumPax: SumPaxDownAtB, Buses: BusEstimateDownAtB,
                Station: stationB, Direction: 'DOWN',
                services: relevantServicesDownAtB},
            ];
      break;
    case 3:
      Answer = [{SumPax: SumPaxDownAtB, Buses: BusEstimateDownAtB,
                Station: stationB, Direction: 'DOWN',
                services: relevantServicesDownAtB},
                {SumPax: SumPaxUpAtB, Buses: BusEstimateUpAtB,
                Station: stationA, Direction: 'UP',
                services: relevantServicesUpAtA},
                ];
      break;
    }
    return Answer;

/**
 * Convert String in 24+ hour format to moment
 * @param {array} arr
 * - an array with some numbers
 * @return {integer} maxIndex
 * - the index of the largest number in array
 */
  function indexOfMax(arr) {
      if (arr.length === 0) {
          return -1;
      }
      let max = arr[0];
      let maxIndex = 0;

      for (let i = 1; i < arr.length; i++) {
          if (arr[i] > max) {
              maxIndex = i;
              max = arr[i];
          }
      }
      return maxIndex;
  }

/**
 * Convert String in 24+ hour format to moment
 * @param {array} relevantServicesArray
 * - an array of service objects
 * @return {integer} Sum of Passengers
 */
  function sumPaxFromRelevantServices(relevantServicesArray) {
      let SumPax = 0;
      for (rs=0; rs<relevantServicesArray.length; rs++) {
        if (isNaN(relevantServicesArray[rs].PaxEst) == false) {
          SumPax = SumPax + relevantServicesArray[rs].PaxEst;
        };
      };
      return Math.round(SumPax);
  };

/**
 * Convert String in 24+ hour format to moment
 * @param {string} station - 4 char station id
 * @param {string} direction - 'UP' or 'DOWN'
 * @param {object} starttime - Moment datetime object
 * @param {object} endtime - Moment datetime object
 * @param {string} calendarId - 1,2345,6,7
 * @param {string} line - 3 char line id
 * @return {array} array of service objects
 */
  function getAllRelevantServices(station,
                                  direction,
                                  starttime,
                                  endtime,
                                  calendarId,
                                  line) {
    let relevantServices = [];
    for (rs = 0; rs < stopTimes.length; rs++) {
      if (stopTimes[rs].station == station &&
          tfp2m(stopTimes[rs].arrives) > starttime &&
          tfp2m(stopTimes[rs].arrives) < endtime &&
          getdirectionfromserviceid(stopTimes[rs].serviceId) == direction) {
          if (calendarServiceIDMatch(stopTimes[rs].serviceId, calendarId) &&
              getlinefromserviceid(stopTimes[rs].serviceId)[0] == line) {
            let Service = new RelevantService(stopTimes[rs].serviceId,
                                              calendarId,
                                              direction,
                                              station,
                                              stopTimes[rs].arrives);
            relevantServices.push(Service);
         }
      }
    }
    return relevantServices;
  };
  // relevant service constructor
  /**
 * Represents a Rail Service
 * @constructor
 * @param {string} serviceId - identifies service
 * @param {string} calendarId - 1,2345,6,7
 * @param {string} direction - 'UP' or 'DOWN'
 * @param {string} station - 4 char station id
 * @param {string} arrival - string time "HH:MM"
 */
  function RelevantService(serviceId, calendarId, direction, station, arrival) {
    this.serviceId = serviceId.trim();
    this.line = getlinefromserviceid(this.serviceId)[0];
    this.calendar_id = calendarId;
    this.direction = direction;
    this.station = station;
    this.arrival = arrival;
    this.PaxEst = getPaxAtStation(this.calendar_id,
                                 this.serviceId,
                                 this.line,
                                 this.station,
                                 this.direction);
  };
  /**
 * determines if service is valid on date
 * @param {string} serviceId - identifies service
 * @param {string} calendarId - 1,2345,6,7
 * @return {boolean} - true or false
 */
  function calendarServiceIDMatch(serviceId, calendarId) {
    let match = false;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].service_id == serviceId &&
          unitRoster[s].calendar_id == calendarId) {
        match = true;
        break;
      }
    };
    return match;
  }
  /**
 * determines line from a service id
 * @param {string} serviceId - identifies service
 * @return {string} - 3 char line id
 */
  function getlinefromserviceid(serviceId) {
      let numCharId = '';
      let line = [];
      let freightdetect = false;
      // looks for service id's with a random letter on the end
      for (p = 0; p < serviceId.length; p++) {
          if (isNaN(serviceId[p])) {
            numCharId = numCharId + 'C';
          } else {
            numCharId = numCharId + 'N';
          };
      };
      if (numCharId === 'NNNC') {
        serviceId = serviceId.substring(0, 3);
      }

      if (serviceId.length == 4) {
        switch (serviceId.substring(0, 2)) {
          case '12':
            line = ['KPL', true];
            break;
          case '16':
          case 'MA':
            line = ['WRL', false];
            break;
          case '26':
          case '36':
          case '39':
          case '46':
          case '49':
          case 'PT':
          case 'TA':
          case 'TN':
          case 'UH':
          case 'WA':
            line = ['HVL', false];
            break;
          case '56':
          case '59':
          case 'ML':
            line = ['MEL', false];
            break;
          case '60':
          case '62':
          case '63':
          case '69':
          case '72':
          case '79':
          case '82':
          case '89':
          case 'PA':
          case 'PM':
          case 'PU':
          case 'PL':
          case 'TW':
          case 'WK':
            line = ['KPL', false];
            break;
          case '92':
          case '93':
          case '99':
          case 'JV':
            line = ['JVL', false];
            break;
          default:
            line = '';
        };
      } else if (serviceId.length == 3) {
        switch (serviceId.substring(0, 1)) {
          case '2':
            line = ['KPL', true];
            break;
          case '3':
            line = ['KPL', true];
            break;
          case '5':
            line = ['KPL', true];
            break;
          case '6':
            line = ['WRL', true];
            break;
          case 'B':
            if (freightdetect) {
              line = ['KPL', true];
            } else {
              line = ['KPL', false];
            };
            break;
          case 'E':
          if (freightdetect) {
            line = ['KPL', true];
          } else {
            line = ['KPL', false];
          };
            break;
          case 'F':
          if (freightdetect) {
            line = ['WRL', true];
          } else {
            line = ['WRL', false];
          };
            break;
          default:
            line = '';
          };
      };

      return line;
  };
    /**
 * Convert String in 24+ hour format to moment
 * @param {string} TwentyFourPlusString
 * - a string in the format 'HH:MM' or 'HH:MM:SS'
 * @return {object} thisMoment
 * - a moment datetime object
 */
function tfp2m(TwentyFourPlusString) {
  let tomorrow = false;
  let NewHours = parseInt(TwentyFourPlusString.split(':')[0]);
  if (NewHours >= 24) {
    tomorrow = true;
    NewHours = NewHours - 24;
  };
  let thisMoment = moment();
  if (tomorrow & (moment().hour() < 3)) {
    thisMoment = moment();
  } else if (tomorrow) {
    thisMoment = moment().add(1, 'day');
  };

  let NewMinutes = parseInt(TwentyFourPlusString.split(':')[1]);
  let NewSeconds = parseInt(TwentyFourPlusString.split(':')[2]);
  thisMoment.set('hour', NewHours);
  thisMoment.set('minute', NewMinutes);
  if (isNaN(NewSeconds) == false) {
    thisMoment.set('second', NewSeconds);
} else {
    thisMoment.set('seconds', 0);
    thisMoment.set('miliseconds', 0);
    };
  return thisMoment;
}
/**
 * finds calendar id from current date
 * @param {object} DateMoment
 * - a string in the format 'HH:MM' or 'HH:MM:SS'
 * @return {string} 
 * - a calendarId ether 1,2345,6,7
 */
function calendarIDfromDate(DateMoment) {
    let thisdate = DateMoment;
    let calendarId = '';
    for (e = 0; e < calendarexceptions.length; e++) {
      if (moment(calendarexceptions[e].date) == thisdate) {
        calendarId = calendarexceptions[e].calendar_id;
        break;
      };
    };
    if (calendarId == '') {
      switch (thisdate.weekday()) {
        case 0:
          calendarId = '1';
          break;
        case 1:
        case 2:
        case 3:
        case 4:
          calendarId = '2345';
          break;
        case 5:
          calendarId = '6';
          break;
        case 6:
          calendarId = '7';
          break;
        default:
          calendarId = '';
      };
    };
    return calendarId;
};
  /**
 * determines direction from a service id
 * @param {string} serviceId - identifies service
 * @return {string} - 'UP' or 'DOWN'
 */
function getdirectionfromserviceid(serviceId) {
    let numCharId = '';
    // NZ rail services are even for up, odd for down
    // remove characters for odd even purposes
    for (p = 0; p < serviceId.length; p++) {
        if (isNaN(serviceId[p])) {
          numCharId = numCharId + 'C';
        } else {
          numCharId = numCharId + 'N';
        };
    };
    if (numCharId === 'NNNC') {
      serviceId = serviceId.substring(0, 3);
    }
    if (numCharId === 'CCNN') {
      serviceId = serviceId.substring(2, 4);
    }
    if (numCharId === 'CCN') {
      serviceId = serviceId.substring(2, 3);
    }
    if (numCharId === 'CNN') {
      serviceId = serviceId.substring(1, 3);
    }
    if (numCharId === 'CN') {
      serviceId = serviceId.substring(1, 2);
    }

    if (serviceId % 2 == 0) {
      return 'UP';
    } else if (serviceId % 2 == 1) {
      return 'DOWN';
    } else {
      return '';
    }
};
//   console.log(time + " " + station1 + " " + station2);
//   var gmapsstations = [];
//   var gmapsstationsstring = "";
//   //get lat and long to query gmaps distance matrix
//   var started = false
//   var stopped = false
//   for (sll = 0; sll < StationLatLon.length; sll++){
//     if (started == false && stopped == false &&
//        (StationLatLon[sll].station_id == station1 ||
//         StationLatLon[sll].station_id == station2)){
//       gmapsstations.push(StationLatLon[sll].lat + ",
//                      " + StationLatLon[sll].lon);
//       started = true
//     }else if (started == true && stopped == false &&
//              (StationLatLon[sll].station_id == station1 ||
//               StationLatLon[sll].station_id == station2)){
//       gmapsstations.push(StationLatLon[sll].lat + ",
//                      " + StationLatLon[sll].lon);
//       stopped = true
//     }else if(started == true && stopped == false){
//       gmapsstations.push(StationLatLon[sll].lat + ",
//                      " + StationLatLon[sll].lon)
//     };
//   };
//   for (s=0; s < gmapsstations.length; s++){
//     gmapsstationsstring = gmapsstationsstring + gmapsstations[s]
//     if (s < (gmapsstations.length -1)){
//     gmapsstationsstring = gmapsstationsstring  + "|"
//     }
//   };
//   console.log(gmapsstationsstring);
//   var GMapOptions = {
//       origins: gmapsstationsstring,
//       destinations: gmapsstationsstring,
//       //traffic_model: 'best_guess',
//       //departure_time: time,
//       mode: 'driving',
//       key: 'AIzaSyBR_gFUCm1tgXrLUKeObS_grVyO3G-Tl24'
//   };
//   var rpOptions = {
//       method: 'POST',
//       uri: ("https://maps.googleapis.com/maps/api/distancematrix/json?" + qs.stringify(GMapOptions)),
//       json: true
//   };
//   var GMapTravelTime = rp(rpOptions);
//     GMapTravelTime.then(function(response){
//       var temp = response;//JSON.parse(response)
//       var elements = temp.rows[0].elements;
//       console.log(elements); //.rows.elements
//     }, function (error){
//       console.error("error: ",error)
//     });
};
