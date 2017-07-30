/* eslint-env node */
let path = require('path');
let express = require('express');
let app = express();
let https = require('https');
let moment = require('moment-timezone');
moment().tz('Pacific/Auckland').format();

//  supporting data files
// let StationMeterage = require('./Data/StationMeterage');
let dummyCurrentServices = require('./Data/DummyCurrentServices');
let calendarexceptions = require('./Data/calendarexceptions');
let stopTimes = require('./Data/stopTimes');
let tripSheet = require('./Data/tripSheet');
// let unitRoster = require('./Data/unitRoster');
let berthing = require('./Data/shuntberthingM-F');

//  supporting functions
let dummydata = require('./Functions/debugMode')[0];
let dummytime = require('./Functions/debugMode')[1];
let Service = require('./Functions/serviceConstructor');
// let getPaxAtStation = require('./Functions/passengerEstimation');
let calculateBusPax = require('./Functions/busEstimation');

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
let CurrentServices = [];
let currentMoment;

getnewgevisjson();

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
                      + moment().format('YYYY-MM-DD HH:MM'));
        } else {
          console.log('GeVis loaded ok @ '
                      + moment().format('YYYY-MM-DD HH:MM'));
      };
      readresponse(GeVisJSON);
    };
    });
  }).on('error', function(e) {
    console.log('Got error: ' + e.message);
  });

  setTimeout(getnewgevisjson, 10 * 1000);
};

/**
 * Interprets GeVisJSON
 * @param {object} GeVisJSON - an object from GeVis API
 */
function readresponse(GeVisJSON) {
  let trains = GeVisJSON.features;
  CurrentServices = [];
  if (dummydata) {
    currentMoment = moment(dummytime);
  } else {
    currentMoment = moment();
  };
 // itterate through all items in GeVisJSON and use all relevant ones
 for (gj = 0; gj < trains.length; gj++) {
   let train = trains[gj].attributes;
  //  get those linked to service
  if (train.TrainID != '') {
   //  get those south of levin, east of cook strait and not a ferry
   if (train.Longitude > 174.5
     & train.Latitude < -40.625887
     & train.EquipmentDesc != 'Rail Ferry     ' ) {
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
<<<<<<< HEAD
        let speed = train.VehicleSpeed;
        let compass = train.DirectionCompass;
        let locationAge = train.PositionAge;
        let KiwirailVariance = train.DelayTime;
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
                                  KiwirailVariance,
                                  lat,
                                  long);
        CurrentServices.push(service.web());
  };
 };
};
  //  get current caledar_id for timetable search
  let calendarId = calendarIDfromDate(currentMoment);
  //  get all timetabled services that are not active
  let match = false;
  let serviceDate = moment().format('YYYYMMDD');

  //  cycle through services
  //  find fist and last station Time of services
  for (ts = 0; ts < tripSheet.length; ts++) {
    if (tripSheet[ts].calendar_id == calendarId) {
      for (st = 0; st < stopTimes.length; st++) {
        if (tripSheet[ts].serviceId == stopTimes[st].serviceId) {
          // get start and end time
          if (stopTimes[st].station_sequence == 0) {
            checkdeparts = tfp2m(stopTimes[st].departs);
            checkarrives = '';
          };
          // checking if next entry on stopTimes is zero or doesnt exist
          // this indicates the end of the service
          if (st+1 < stopTimes.length) {
            if (stopTimes[st+1] == undefined ||
                stopTimes[st+1].station_sequence == 0) {
              checkarrives = tfp2m(stopTimes[st].arrives);

              // then check found service within time window
              if (checkdeparts < moment(currentMoment).subtract(1, 'minutes') &&
                  checkarrives > moment(currentMoment).add(5, 'minutes')) {
                match = false;
                // then check if already in active service list
                for (cs = 0; cs < CurrentServices.length; cs++) {
                if (tripSheet[ts].serviceId == CurrentServices[cs].serviceId) {
                  match = true;
                };
                };
                  if (match == false) {
                    let service = new Service(tripSheet[ts].serviceId,
                                              serviceDate,
                                              'FROM TIMETABLE',
                                              '',
                                              '',
                                              '',
                                              '00:00',
                                              0,
                                              '',
                                              '');
                    // look for previous service and mark if still running
                    for (csa = 0; csa < CurrentServices.length; csa++) {
                    if (CurrentServices[csa].serviceId == service.LastService) {
                      service.statusMessage = 'Previous Service Delayed';
                    }
                    };
                    CurrentServices.push(service.web());
                  };
              };
            }
          };
        }
      };
    }
  };
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

app.use('/public', express.static(path.join(__dirname, 'public')));
app.get('/pilot', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/CurrentServices', (request, response) => {
  let Current = {'Time': currentMoment, CurrentServices};
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(Current));
  response.end();
});

app.get('/berthing', (request, response) => {
  response.writeHead(200, {'Content-Type': 'application/json'}, {cache: false});
  response.write(JSON.stringify(berthing));
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
