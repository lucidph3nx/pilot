const path = require('path')
const express = require('express')
const request = require('request')
const rp = require('request-promise')
const app = express()
const https = require('https');
const fs = require('fs')
const qs = require('querystring')
var moment = require('moment-timezone');
moment().tz('Pacific/Auckland').format();

//supporting data files
const StationGeoboundaries = require('./Data/StationGeoboundaries')
const StationMeterage = require('./Data/StationMeterage')
const StationLatLon = require('./Data/StationLatLon')
const lineshapes = require('./Data/lineshapes')
const masterRoster = require('./Data/masterRoster')
const dummyCurrentServices = require('./Data/DummyCurrentServices')
const calendarexceptions = require('./Data/calendarexceptions')
const stopTimes = require('./Data/stopTimes')
const tripSheet = require('./Data/tripSheet')
const unitRoster = require('./Data/unitRoster')
const passengerPercentage = require('./Data/passengerPercentage')
const passengerAverage = require('./Data/passengerAverage')
const berthing = require('./Data/shuntberthingM-F')

//supporting functions
var dummydata = require('./Functions/debugMode')[0]
var dummytime = require('./Functions/debugMode')[1]
var Service = require('./Functions/serviceConstructor')
var getPaxAtStation = require('./Functions/passengerEstimation')

//for recording
const MongoClient = require('mongodb').MongoClient;

//for the users project
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

//=======pasport=======

//=======express=======
// Configure Express
app.use(logger('tiny'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});


var options = {
    hostname: 'gis.kiwirail.co.nz',
    port: app.get('port'),
    path: 'https://gis.kiwirail.co.nz/tracker/vehicles?f=jesri',
    method: 'GET',
    json:true
};

var GeVisJSON
var CurrentServices = [];
var CurrentMoment

getnewgevisjson()

function getnewgevisjson(){
  https.get(options, function(response) {
   // console.log("Got response: " + response.statusCode);
  	var body = '';
  	response.on("data", function(chunk) {
  	  body += chunk;
  	});
  	response.on('end',function(){
  		GotResponse = true

      if(body.substring(0,1) == "<"){
        console.log("GeVis returned service unavailable");
      }else{
        if(dummydata){
          GeVisJSON = dummyCurrentServices
        }else{
          GeVisJSON = JSON.parse(body)
        };

        if(body == {"metadata":{"outputSpatialReference":0},"features":[]}){
          console.log("GeVis Vehicles responded empty @" + moment())
        }else{
          console.log("GeVis loaded ok")
      };
  		readresponse(GeVisJSON)
    };
  	});
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });

  setTimeout(getnewgevisjson, 10 * 1000);

};

function readresponse(GeVisJSON){
  CurrentServices = [];

  if(dummydata){
        CurrentMoment = moment(dummytime);
  }else{CurrentMoment = moment();};

  //console.log(GeVisJSON.features.length);
	//show all active services
	for (gj = 0; gj < GeVisJSON.features.length; gj++) {
		//get those linked to service
		if(GeVisJSON.features[gj].attributes.TrainID != ""){
			//get those south of levin and east of cook strait
      //console.log(GeVisJSON.features[gj].attributes.TrainID);
			if(GeVisJSON.features[gj].attributes.Longitude > 174.5 & GeVisJSON.features[gj].attributes.Latitude < -40.625887 & GeVisJSON.features[gj].attributes.EquipmentDesc != "Rail Ferry     " ){
        //LastTrain.push(GeVisJSON.features[gj].attributes.TrainID + "   " + GeVisJSON.features[gj].attributes.TrainDesc +"   " + GeVisJSON.features[gj].attributes.VehicleID + "   " + GeVisJSON.features[gj].attributes.Station);
        var service_id = GeVisJSON.features[gj].attributes.TrainID
        //console.log(service_id);
        var service_date = GeVisJSON.features[gj].attributes.TrainDate
        var service_description = GeVisJSON.features[gj].attributes.TrainDesc
        var linked_unit = GeVisJSON.features[gj].attributes.VehicleID
        var second_unit = ""
        var second_unit_lat = ""
        var second_unit_long = ""
        if (GeVisJSON.features[gj].attributes.EquipDesc == "Matangi Power Car                       "){
          if (linked_unit.substring(0,2) == "FP"){
            second_unit = "FT" + linked_unit.substring(2,6);
          }else{
            second_unit = "FP" + linked_unit.substring(2,6);
          }
        }
        if (second_unit !== ""){
          for (su = 0; su < GeVisJSON.features.length; su++){
            if (GeVisJSON.features[su].attributes.VehicleID == second_unit) {
              second_unit_lat = GeVisJSON.features[su].attributes.Latitude
              second_unit_long = GeVisJSON.features[su].attributes.Longitude
              break;
            }
          }
        }
        var speed = GeVisJSON.features[gj].attributes.VehicleSpeed
        var compass = GeVisJSON.features[gj].attributes.DirectionCompass
        var location_age = GeVisJSON.features[gj].attributes.PositionAge
        var schedule_variance = GeVisJSON.features[gj].attributes.DelayTime
        var lat = GeVisJSON.features[gj].attributes.Latitude
        var long = GeVisJSON.features[gj].attributes.Longitude

        //new service object
        var service = new Service(CurrentMoment,service_id,service_date,service_description,linked_unit,second_unit,second_unit_lat,second_unit_long,speed,compass,location_age,schedule_variance,lat,long);


        //for debug
        // if(service.service_id == "1604" || service.service_id == "1609"){
        //   //console.log(service);
        //   fs.appendFile('WRLDEBUGLOG.txt', (JSON.stringify(service)+ "\r\n"), 'utf8', function (err){
        //     if (err) {
        //       return console.log(err);
        //   }
        // })
        // };
        //console.log(service);
        CurrentServices.push(service.web())
			};
		};
	};
  //get current caledar_id for timetable search
  var calendar_id = calendarIDfromDate(CurrentMoment);
  //get all timetabled services that are not active
  var match = false;
  var thisdate = new Date()
  var compatibleservicedate = thisdate.toJSON().replace('-','').replace('-','').substring(0,8);



  //cycle through services
  //find fist and last station TIME of services
  for (ts = 0; ts < tripSheet.length; ts++){
    var checkdeparts
    var checkarrives
    if (tripSheet[ts].calendar_id == calendar_id){
    for(st = 0; st < stopTimes.length; st++){
      //console.log (ts + " & " + st);
      if (tripSheet[ts].service_id == stopTimes[st].service_id){
        //get start and end time
        if(stopTimes[st].station_sequence == 0){
          checkdeparts = TFP2M(stopTimes[st].departs)
          checkarrives = ""
        };
        //checking if next entry on stopTimes exists and is zero, indicating end of service
        if(st+1 < stopTimes.length){
          if(stopTimes[st+1] !== undefined && stopTimes[st+1].station_sequence == 0){
            checkarrives = TFP2M(stopTimes[st].arrives)
            //then check if already in active services
            if (checkdeparts < moment(CurrentMoment).subtract(1, 'minutes') && checkarrives > moment(CurrentMoment).add(5, 'minutes')){

              match = false
              //then check if already in active services
              for (cs = 0; cs < CurrentServices.length; cs++){
                if (tripSheet[ts].service_id == CurrentServices[cs].service_id){
                  match = true;
              };};
                if (match == false){
                  var service = new Service(CurrentMoment,tripSheet[ts].service_id,compatibleservicedate,"FROM TIMETABLE","","","","00:00",0,"","");
                  for (csa = 0; csa < CurrentServices.length; csa++){
                    if (CurrentServices[csa].service_id == service.LastService){
                      service.statusMessage = "Previous Service Delayed"
                    }
                  };
                  CurrentServices.push(service.web())
                };
            };
          }};
      }
    };
  }};

    // Connect to the db
    /*
  MongoClient.connect("mongodb://localhost:27017", function(err, db) {
    if(err) { return console.dir(err); }

    var collection = db.collection('pilotdb');
    collection.insert(CurrentServices, {w:1}, function(err, result) {
    if(err) { return console.dir(err); }
    });

    db.close()
  });
  */
};

//bus passenger calculations for calc interface
function calculateBusPax(time, line, stationA, stationB){

  var Answer = {};

  var timeA = moment(time);
  var timeB = moment(time).add(1, 'hour');
  var calendar_id = calendarIDfromDate(timeA);
  var stationAMeterage
  var stationBMeterage
  //get meterage of both stations
  for (st = 0; st < StationMeterage.length; st++){
    if (StationMeterage[st].station_id == stationA){
      stationAMeterage = StationMeterage[st].meterage
    };
    if (StationMeterage[st].station_id == stationB){
      stationBMeterage = StationMeterage[st].meterage
    };
  };
  var relevantServicesUpAtA   = getAllRelevantServices(stationA, "UP", timeA, timeB, calendar_id, line);
  var relevantServicesUpAtB   = getAllRelevantServices(stationB, "UP", timeA, timeB, calendar_id, line);
  var relevantServicesDownAtA = getAllRelevantServices(stationA, "DOWN", timeA, timeB, calendar_id, line);
  var relevantServicesDownAtB = getAllRelevantServices(stationB, "DOWN", timeA, timeB, calendar_id, line);
  //add up total pax for later comparison
  var SumPaxUpAtA = SumPaxFromRelevantServices(relevantServicesUpAtA);
  var BusEstimateUpAtA = Math.ceil(SumPaxUpAtA/50)
  var SumPaxUpAtB = SumPaxFromRelevantServices(relevantServicesUpAtB);
  var BusEstimateUpAtB = Math.ceil(SumPaxUpAtB/50)
  var SumPaxDownAtA = SumPaxFromRelevantServices(relevantServicesDownAtA);
  var BusEstimateDownAtA = Math.ceil(SumPaxDownAtA/50)
  var SumPaxDownAtB = SumPaxFromRelevantServices(relevantServicesDownAtB);
  var BusEstimateDownAtB = Math.ceil(SumPaxDownAtB/50)
  var IndexSumPaxArray = indexOfMax([SumPaxUpAtA, SumPaxDownAtA, SumPaxUpAtB, SumPaxDownAtB]);
  //get greater of (Pax Up@A, Pax Up@B, Pax Down@A, Pax Down@B)
  switch(IndexSumPaxArray){
    case 0:
      Answer = [{SumPax: SumPaxUpAtA, Buses: BusEstimateUpAtA, Station: stationA, Direction: "UP", services: relevantServicesUpAtA}, {SumPax: SumPaxDownAtA, Buses: BusEstimateDownAtA, Station: stationB, Direction: "DOWN", services: relevantServicesDownAtB}];
      break;
    case 1:
      Answer = [{SumPax: SumPaxDownAtA, Buses: BusEstimateDownAtA, Station: stationB, Direction: "DOWN", services: relevantServicesDownAtB}, {SumPax: SumPaxUpAtA, Buses: BusEstimateUpAtA, Station: stationA, Direction: "UP", services: relevantServicesUpAtA}];
      break;
    case 2:
      Answer = [{SumPax: SumPaxUpAtB, Buses: BusEstimateUpAtB, Station: stationA, Direction: "UP", services: relevantServicesUpAtA}, {SumPax: SumPaxDownAtB, Buses: BusEstimateDownAtB, Station: stationB, Direction: "DOWN", services: relevantServicesDownAtB}];
      break;
    case 3:
      Answer = [{SumPax: SumPaxDownAtB, Buses: BusEstimateDownAtB, Station: stationB, Direction: "DOWN", services: relevantServicesDownAtB}, {SumPax: SumPaxUpAtB, Buses: BusEstimateUpAtB, Station: stationA, Direction: "UP", services: relevantServicesUpAtA}];
      break;
    }
    return Answer

  function indexOfMax(arr) {
      if (arr.length === 0) {
          return -1;
      }

      var max = arr[0];
      var maxIndex = 0;

      for (var i = 1; i < arr.length; i++) {
          if (arr[i] > max) {
              maxIndex = i;
              max = arr[i];
          }
      }

      return maxIndex;
  }

  function SumPaxFromRelevantServices (relevantServicesObject){
      var SumPax = 0
      for (rs=0; rs<relevantServicesObject.length; rs++){
        if (isNaN(relevantServicesObject[rs].PaxEst) == false){
          // console.log(relevantServicesObject[rs].service_id);
          // console.log(relevantServicesObject[rs].PaxEst);
          SumPax = SumPax + relevantServicesObject[rs].PaxEst;
        };
      };
      // console.log("SUMPAX:");
      // console.log(SumPax);
      return Math.round(SumPax);
  };

  function getAllRelevantServices(station, direction, starttime, endtime, calendar_id, line){
    var relevantServices = [];
     //console.log(station + " " + direction + " " + moment(starttime).format("HH:mm") + " " + moment(endtime).format("HH:mm") + " " + calendar_id);
    for (rs = 0; rs < stopTimes.length; rs++){
      if (stopTimes[rs].station == station && TFP2M(stopTimes[rs].arrives) > starttime && TFP2M(stopTimes[rs].arrives) < endtime){
        if (getdirectionfromserviceid(stopTimes[rs].service_id) == direction){
          if (CalendarServiceIDMatch(stopTimes[rs].service_id,calendar_id) && getlinefromserviceid(stopTimes[rs].service_id)[0] == line){
          var Service = new RelevantService(stopTimes[rs].service_id,calendar_id, direction, station, stopTimes[rs].arrives)
          relevantServices.push(Service)
        }}
      }
    }
    //console.log(relevantServices);
    // console.log(SumPaxFromRelevantServices(relevantServices));
    return relevantServices
  };
  //relevant service constructor
  function RelevantService(service_id, calendar_id, direction, station, arrival){
    this.service_id = service_id.trim();
    this.line = getlinefromserviceid(this.service_id)[0];
    this.calendar_id = calendar_id;
    this.direction = direction;
    this.station = station;
    this.arrival = arrival;
    this.PaxEst = getPaxAtStation(this.calendar_id, this.service_id, this.line, this.station, this.direction);

    if(isNaN(this.PaxEst)){
    console.log(this.calendar_id + " " + this.service_id + " " + this.line + " " + this.station + " " + this.direction);
    console.log(this.PaxEst);
  }
  };

  function CalendarServiceIDMatch(service_id,calendar_id){
    var match = false;
    for(s = 0; s <unitRoster.length; s++){
      if (unitRoster[s].service_id == service_id && unitRoster[s].calendar_id == calendar_id){
        match = true;
        break;
      }
    };
    return match
  }
  function getlinefromserviceid(service_id){
      var numchar_id = "";
      var line = [];
      var freightdetect = false
      //looks for service id's with a random letter on the end, treat as a 3 digit
      for (p = 0; p < service_id.length; p++){
          if (isNaN(service_id[p])){
            numchar_id = numchar_id + "C"
          }else{
            numchar_id = numchar_id + "N"
          };
      };
      if (numchar_id === "NNNC"){
        service_id = service_id.substring(0,3);
      }

      if(service_id.length == 4){
        switch(service_id.substring(0,2)) {
          case "12":
            line = ["PNL",true];
            break;
          case "16":
          case "MA":
            line = ["WRL",false];
            break;
          case "26":
          case "36":
          case "39":
          case "46":
          case "49":
          case "PT":
          case "TA":
          case "TN":
          case "UH":
          case "WA":
            line = ["HVL",false];
            break;
          case "56":
          case "59":
          case "ML":
            line = ["MEL",false];
            break;
          case "60":
          case "62":
          case "63":
          case "69":
          case "72":
          case "79":
          case "82":
          case "89":
          case "PA":
          case "PM":
          case "PU":
          case "PL":
          case "TW":
          case "WK":
            line = ["KPL",false];
            break;
          case "92":
          case "93":
          case "99":
          case "JV":
            line = ["JVL",false];
            break;
          default:
            line = ""
        };
      }
      else if(service_id.length == 3){
        switch(service_id.substring(0,1)){
          case "2":
            line = ["KPL",true];
            break;
          case "3":
            line = ["KPL",true];
            break;
          case "5":
            line = ["KPL",true];
            break;
          case "6":
            line = ["WRL",true];
            break;
          case "B":
            if(freightdetect){
              line = ["KPL",true];
            }else{
              line = ["KPL",false];
            };
            break;
          case "E":
          if(freightdetect){
            line = ["KPL",true];
          }else{
            line = ["KPL",false];
          };
            break;
          case "F":
          if(freightdetect){
            line = ["WRL",true];
          }else{
            line = ["WRL",false];
          };
            break;
          default:
            line = ""
          };
      };

      return line;
  };
  //console.log(time + " " + station1 + " " + station2);
  // var gmapsstations = [];
  // var gmapsstationsstring = "";
  //
  // //get lat and long to query gmaps distance matrix
  // var started = false
  // var stopped = false
  // for (sll = 0; sll < StationLatLon.length; sll++){
  //
  //   if (started == false && stopped == false && (StationLatLon[sll].station_id == station1 || StationLatLon[sll].station_id == station2)){
  //     gmapsstations.push(StationLatLon[sll].lat + ", " + StationLatLon[sll].lon);
  //     started = true
  //   }else if (started == true && stopped == false && (StationLatLon[sll].station_id == station1 || StationLatLon[sll].station_id == station2)){
  //     gmapsstations.push(StationLatLon[sll].lat + ", " + StationLatLon[sll].lon);
  //     stopped = true
  //   }else if(started == true && stopped == false){
  //     gmapsstations.push(StationLatLon[sll].lat + ", " + StationLatLon[sll].lon)
  //   };
  // };
  // for (s=0; s < gmapsstations.length; s++){
  //   gmapsstationsstring = gmapsstationsstring + gmapsstations[s]
  //   if (s < (gmapsstations.length -1)){
  //   gmapsstationsstring = gmapsstationsstring  + "|"
  //   }
  // };
  // console.log(gmapsstationsstring);
  // var GMapOptions = {
  //     origins: gmapsstationsstring,
  //     destinations: gmapsstationsstring,
  //     //traffic_model: 'best_guess',
  //     //departure_time: time,
  //     mode: 'driving',
  //     key: 'AIzaSyBR_gFUCm1tgXrLUKeObS_grVyO3G-Tl24'
  // };
  // var rpOptions = {
  //     method: 'POST',
  //     uri: ("https://maps.googleapis.com/maps/api/distancematrix/json?" + qs.stringify(GMapOptions)),
  //     json: true
  // };
  // var GMapTravelTime = rp(rpOptions);
  //
  //   GMapTravelTime.then(function(response){
  //     var temp = response;//JSON.parse(response)
  //     var elements = temp.rows[0].elements;
  //     console.log(elements); //.rows.elements
  //   }, function (error){
  //     console.error("error: ",error)
  //   });
};


function TFP2M(TwentyFourPlusString){
  //TwentyFourPlusStringToMoment
  var tomorrow = false
  var NewHours = parseInt(TwentyFourPlusString.split(":")[0]);
  if (NewHours >= 24){
    tomorrow = true
    NewHours = NewHours - 24
  };
  var thisMoment = moment()
  if (tomorrow & (moment().hour() < 3)){
    thisMoment = moment()
  }else if (tomorrow){
    thisMoment = moment().add(1, 'day')
  };

  var NewMinutes = parseInt(TwentyFourPlusString.split(":")[1]);
  var NewSeconds = parseInt(TwentyFourPlusString.split(":")[2]);
  thisMoment.set('hour', NewHours);
  thisMoment.set('minute', NewMinutes);
  if (isNaN(NewSeconds) == false){  thisMoment.set('second',NewSeconds) }
  else{thisMoment.set('seconds', 0);
      thisMoment.set('miliseconds', 0)
    };
  return thisMoment;
}
function calendarIDfromDate(DateMoment){
    //get current caledar_id for timetable search
    var thisdate = DateMoment
    var calendar_id = "";
    for (e = 0; e < calendarexceptions.length; e++){
      if (moment(calendarexceptions[e].date) == thisdate){
        calendar_id = calendarexceptions[e].calendar_id;
        break;
      };
    };
    if (calendar_id == ""){
      switch(thisdate.weekday()){
        case 0:
          calendar_id = "1";
          break;
        case 1:
        case 2:
        case 3:
        case 4:
          calendar_id = "2345";
          break;
        case 5:
          calendar_id = "6";
          break;
        case 6:
          calendar_id = "7";
          break;
        default:
          calendar_id = "";
      };
    };
    return calendar_id
};

function getdirectionfromserviceid(service_id){
    var numchar_id = "";
    //remove characters for odd even purposes
    for (p = 0; p < service_id.length; p++){
        if (isNaN(service_id[p])){
          numchar_id = numchar_id + "C"
        }else{
          numchar_id = numchar_id + "N"
        };
    };
    if (numchar_id === "NNNC"){
      service_id = service_id.substring(0,3);
    }
    if (numchar_id === "CCNN"){
      service_id = service_id.substring(2,4);
    }
    if (numchar_id === "CCN"){
      service_id = service_id.substring(2,3);
    }
    if (numchar_id === "CNN"){
      service_id = service_id.substring(1,3);
    }
    if (numchar_id === "CN"){
      service_id = service_id.substring(1,2);
    }

    if(service_id % 2 == 0){
      return "UP"
    }else if(service_id % 2 == 1){
      return "DOWN"
    }else {
      return ""
    }
};

app.use('/public', express.static(path.join(__dirname, 'public')))
app.get('/pilot', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/CurrentServices', (request, response) => {
  var Current = {"Time":CurrentMoment, CurrentServices}
  response.writeHead(200, {"Content-Type": "application/json"},{cache:false});
  response.write(JSON.stringify(Current));
  response.end();
})

app.get('/berthing', (request, response) => {
  response.writeHead(200, {"Content-Type": "application/json"},{cache:false});
  response.write(JSON.stringify(berthing));
  response.end();
})

app.post('/busCalc', function(request, response) {
  var busCalcData = request.body;
  var Answer = calculateBusPax(busCalcData.Time, busCalcData.Line, busCalcData.Station1, busCalcData.Station2);
  //console.log(busCalcData);
  response.writeHead(200, {"Content-Type": "application/json"},{cache:false});
  response.write(JSON.stringify(Answer));
  response.end();
})

var port = 3000;
app.listen(port);
console.log("listening on " + port);
