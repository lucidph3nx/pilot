/* eslint-env node */
let path = require('path');
let express = require('express');
let app = express();
let https = require('https');
let moment = require('moment-timezone');
moment().tz('Pacific/Auckland').format();

//  supporting data files
let dummyCurrentServices = require('./Data/DummyCurrentServices');
let calendarexceptions = require('./Data/calendarexceptions');
let stopTimes = require('./Data/stopTimes');
let tripSheet = require('./Data/tripSheet');

//  supporting functions
let dummydata = require('./Functions/debugMode')[0];
let dummytime = require('./Functions/debugMode')[1];
let Service = require('./Functions/serviceConstructor');
let calculateBusPax = require('./Functions/busEstimation');
let timetableQuery = require('./Functions/timetableQuery');
let vdsRosterDuties = require('./Functions/vdsRosterDuties');

//  for the users project
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let methodOverride = require('method-override');
let session = require('express-session');
let passport = require('passport');
//  let LocalStrategy = require('passport-local');

// =======pasport=======

// =======express=======
// Configure Express
app.use(logger('tiny'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next) {
  let err = req.session.error;
  let msg = req.session.notice;
  let success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});


let options = {
    hostname: 'gis.kiwirail.co.nz',
    port: app.get('port'),
    path: 'https://gis.kiwirail.co.nz/tracker/vehicles?f=jesri',
    method: 'GET',
    json: true,
};

let GeVisJSON;
let currentServices = [];
let currentUnitList = [];
let currentTimetable = [];
let currenttripSheet = [];
let currentRosterDuties = [];
let currentMoment;

getnewgevisjson();
getnewVDSRosterDuties();
getCurrentTimetable();
/**
 * retrieve up to date json from GeVis API
 */
function getnewgevisjson() {
  https.get(options, function(response) {
   // console.log("Got response: " + response.statusCode);
  let body = '';
  response.on('data', function(chunk) {
    body += chunk;
  });
  response.on('end', function() {
    GotResponse = true;

      if (body.substring(0, 1) == '<') {
        console.log('GeVis returned service unavailable');
      } else {
        if (dummydata) {
          GeVisJSON = dummyCurrentServices;
        } else {
          GeVisJSON = JSON.parse(body);
        };
        if (body == {'metadata': {'outputSpatialReference': 0},
                     'features': []}) {
          console.log('GeVis Vehicles responded empty @'
                      + moment().format('YYYY-MM-DD HH:mm:ss'));
        } else {
          console.log('GeVis loaded ok @ '
                      + moment().format('YYYY-MM-DD HH:mm:ss'));
      };
      if (currentTimetable !== []) {
      generateCurrentServices(GeVisJSON);
      generateCurrentUnitList(GeVisJSON);
      }
    };
    });
  }).on('error', function(e) {
    console.log('Got error: ' + e.message);
  });

  setTimeout(getnewgevisjson, 10 * 1000);
};
/**
 * retrieve up to date timetable from Compass DB
 */
function getCurrentTimetable() {
  timetableQuery().then((response) => {
    currentTimetable = [];
    currenttripSheet = [];
    currentTimetable = response;
    /* get current trip sheet (list of services)*/
    let tripLine = [];
    if (currentTimetable == []) {
      currenttripSheet = [];
    } else {
      for (tp = 0; tp < currentTimetable.length; tp++) {
        if (currentTimetable[tp].serviceId !== tripLine.serviceId) {
        tripline = {
          serviceId: currentTimetable[tp].serviceId,
          line: currentTimetable[tp].line,
          direction: currentTimetable[tp].direction,
        };
        currenttripSheet.push(tripline);
      }
  }
}
});
  setTimeout(getCurrentTimetable, 3600 * 1000); // every 1 hour
};
/**
 * retrieve up to date staff roster from VDS DB
 */
function getnewVDSRosterDuties() {
  currentRosterDuties = [];
  vdsRosterDuties().then((response) => {
    currentRosterDuties = response;
  });
  setTimeout(getnewVDSRosterDuties, 900 * 1000); // every 15 minutes
};
/**
 * uses currentRosterDuties to generate a list of current asReq periods and their end times
 * @return {Array} asReqReport
 */
function getLiveAsReqReport() {
  asReqReport = [];
  currentMoment = moment();
  if (currentRosterDuties == []) {
    return asReqReport;
  } else {
    for (s = 0; s < currentRosterDuties.length; s++) {
      if (currentRosterDuties[s].dutyName.substring(0, 6) == 'As Req' && currentRosterDuties[s].dutyEndTime >= currentMoment) {
        asReqEntry = {
          staffId: currentRosterDuties[s].staffId,
          staffName: currentRosterDuties[s].staffName,
          shiftId: currentRosterDuties[s].shiftId,
          shiftType: currentRosterDuties[s].shiftType,
          startTime: currentRosterDuties[s].dutyStartTime.format('HH:mm'),
          endTime: currentRosterDuties[s].dutyEndTime.format('HH:mm'),
        };
        asReqReport.push(asReqEntry);
      };
    };
    return asReqReport;
  };
};
/**
 * Interprets GeVisJSON creates list of all current services
 * @param {object} GeVisJSON - an object from GeVis API
 */
function generateCurrentServices(GeVisJSON) {
  let trains = GeVisJSON.features;
  currentServices = [];
  if (dummydata) {
    currentMoment = moment(dummytime);
  } else {
    currentMoment = moment();
  };
 // itterate through all items in GeVisJSON and use all relevant ones
 for (gj = 0; gj < trains.length; gj++) {
   let train = trains[gj].attributes;
  if (meetsTrainSelectionCriteria(train)) {
        let serviceId = train.TrainID;
        let serviceDate = train.TrainDate;
        let serviceDescription = train.TrainDesc;
        let linkedUnit = train.VehicleID;
        let secondUnit = '';
        let secondUnitLat = '';
        let secondUnitLong = '';
        //  work out what the second half of the train unit is
        if (train.EquipDesc.trim() == 'Matangi Power Car') {
            secondUnit = 'FT' + linkedUnit.substring(2, 6);
        } else if (train.EquipDesc.trim() == 'Matangi Trailer Car') {
            secondUnit = 'FP' + linkedUnit.substring(2, 6);
        }
        if (secondUnit !== '') {
          for (su = 0; su < trains.length; su++) {
            if (trains[su].attributes.VehicleID == secondUnit) {
              secondUnitLat = trains[su].attributes.Latitude;
              secondUnitLong = trains[su].attributes.Longitude;
              break;
            }
          }
        }
        let speed = train.VehicleSpeed;
        let compass = train.DirectionCompass;
        let locationAge = train.PositionAge;
        let varianceKiwirail = train.DelayTime;
        let lat = train.Latitude;
        let long = train.Longitude;
        //  new service object
        let service = new Service(currentMoment,
                                  serviceId,
                                  serviceDate,
                                  serviceDescription,
                                  linkedUnit,
                                  secondUnit,
                                  secondUnitLat,
                                  secondUnitLong,
                                  speed,
                                  compass,
                                  locationAge,
                                  varianceKiwirail,
                                  lat,
                                  long,
                                  currentRosterDuties,
                                  currentTimetable);
        currentServices.push(service.web());
    };
  }
  //  get all timetabled services that are not active
  let alreadyTracking = false;
  let serviceDate = moment().format('YYYYMMDD');

  //  cycle through services
  let servicesToday = currenttripSheet;
  for (st = 0; st < servicesToday.length; st++) {
    let timetabledService = servicesToday[st];
    alreadyTracking = false;
    let serviceTimePoints = stopTimes.filter((stopTimes) => stopTimes.serviceId == timetabledService.serviceId);
    let serviceDeparts = tfp2m(serviceTimePoints[0].departs);
    let serviceArrives = tfp2m(serviceTimePoints[serviceTimePoints.length-1].arrives);
    // find if fits within specified timeband
    if (serviceDeparts < moment(currentMoment).subtract(1, 'minutes') &&
        serviceArrives > moment(currentMoment).add(5, 'minutes')) {
          for (cs = 0; cs < currentServices.length; cs++) {
            if (currentServices[cs].serviceId == timetabledService.serviceId) {
              alreadyTracking = true;
            }
            if (alreadyTracking) break;
          };
          if (alreadyTracking == false) {
            let service = new Service(currentMoment,
              timetabledService.serviceId,
              serviceDate,
              'FROM TIMETABLE',
              '', '', '',
              '00:00',
              0,
              '', '',
              currentRosterDuties);
            // look for previous service and mark if still running
            for (csa = 0; csa < currentServices.length; csa++) {
              if (currentServices[csa].serviceId == service.LastService) {
                service.statusMessage = 'Previous Service Delayed';
              }
            };
            currentServices.push(service.web());
          }
      };
  };
};
/**
 * Interprets GeVisJSON, creates list of Matangi Units
 * @param {object} GeVisJSON - an object from GeVis API
 */
function generateCurrentUnitList(GeVisJSON) {
  let trains = GeVisJSON.features;
  currentUnitList = [];

 // itterate through all items in GeVisJSON and use all relevant ones
 for (gj = 0; gj < trains.length; gj++) {
  let train = trains[gj].attributes;
  if (train.EquipDesc.trim() == 'Matangi Power Car' || train.EquipDesc.trim() == 'Matangi Trailer Car') {
      unit = {
        UnitId: train.VehicleID,
        location: train.Latitude + ' ' + train.Longitude,
        positionAge: train.PositionAge,
        positionAgeSeconds: parseInt(train.PositionAge.toString().split(':')[0]*60) + parseInt(train.PositionAge.toString().split(':')[1]),
        vehicleSpeed: train.VehicleSpeed,
        serviceId: train.TrainID,
      };
      currentUnitList.push(unit);
    };
  };
};
/**
 * decides if train meets selection criteria
 * @param {object} train
 * - a train object from GeVis API
 * @return {boolean} 
 */
function meetsTrainSelectionCriteria(train) {
  const northernBoundary = -40.625887; // Levin
  const westernBoundary = 174.5; // cook strait 
  if (train.TrainID !== '' &&
    train.Longitude > westernBoundary &&
    train.Latitude < northernBoundary &&
    train.EquipmentDesc.trim() !== 'Rail Ferry' ) {
      return true;
  } else {
    return false;
  }
}

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
  // if no seconds are included
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
 * takes a shiftId and retuns all of the duties for the day
 * 
 * @param {any} shiftId 
 * @return {Array} list of duties for a shift
 */
function getDayRosterFromShift(shiftId) {
  let dayRoster = [];
  if (currentRosterDuties == undefined || currentRosterDuties.length == 0) {
    return dayRoster;
  };
  for (s = 0; s < currentRosterDuties.length; s++) {
    if (currentRosterDuties[s].shiftId == shiftId) {
      serviceRoster = {
        shiftId: currentRosterDuties[s].shiftId,
        shiftType: currentRosterDuties[s].shiftType,
        staffId: currentRosterDuties[s].staffId,
        staffName: currentRosterDuties[s].staffName,
        dutyName: currentRosterDuties[s].dutyName,
        dutyType: currentRosterDuties[s].dutyType,
        dutyStartTime: currentRosterDuties[s].dutyStartTime.format('HH:mm'),
        dutyEndTime: currentRosterDuties[s].dutyEndTime.format('HH:mm'),
      };
      dayRoster.push(serviceRoster);
    };
  };
  return dayRoster;
};

app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/pilot', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/CurrentServices', (request, response) => {
  let Current = {'Time': currentMoment, currentServices};
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(Current));
  response.end();
});

app.get('/CurrentUnitList', (request, response) => {
  let Current = {'Time': currentMoment, currentUnitList};
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(Current));
  response.end();
});

app.get('/CurrentRoster', (request, response) => {
  let Current = {'Time': currentMoment, currentRosterDuties};
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(Current));
  response.end();
});

app.get('/dayRoster', (request, response) => {
  let requestedShift = request.query.shiftId;
  let dayRosterResponse = getDayRosterFromShift(requestedShift);
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(dayRosterResponse));
  response.end();
});

app.get('/asReqReport', (request, response) => {
  let asReqResponse = getLiveAsReqReport();
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(asReqResponse));
  response.end();
});

app.post('/busCalc', function(request, response) {
  let busCalcData = request.body;
  let Answer = calculateBusPax(busCalcData.Time,
                               busCalcData.Line,
                               busCalcData.Station1,
                               busCalcData.Station2);
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(Answer));
  response.end();
});

let port = 3000;
app.listen(port);
console.log('listening on ' + port);
