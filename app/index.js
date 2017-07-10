const path = require('path')
const express = require('express')
const app = express()
const https = require('https');
const fs = require('fs')
const StationGeoboundaries = require('./Data/StationGeoboundaries')
const StationMeterage = require('./Data/StationMeterage')
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
app.use(logger('combined'));
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
var CurrentTime
var CurrentUTC
var CurrentDate

//for debuging
var dummydata = false
var dummytime = 1497202547000 + (10 * 60000)

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

      if(dummydata){
        GeVisJSON = dummyCurrentServices
      }else{
        GeVisJSON = JSON.parse(body)
      };

      if(body == {"metadata":{"outputSpatialReference":0},"features":[]}){
        console.log("GeVis Vehicles responded empty @" + Date(CurrentUTC).toJSON().substring(10,19).replace('T',' ').trim())
      }else{
        console.log("GeVis loaded ok")
      };

  		readresponse(GeVisJSON)
  	});
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });

  setTimeout(getnewgevisjson, 10 * 1000);

};

function readresponse(GeVisJSON){
  CurrentServices = [];
  //work out current time
  CurrentUTC = (new Date().getTime() + 43200000); //+12 timezone
  if(dummydata){CurrentUTC = dummytime};
  CurrentTime = new Date(CurrentUTC).toJSON().substring(10,19).replace('T',' ').trim();
  CurrentDate = new Date(CurrentUTC).toJSON().substring(0,10).replace('-','').trim();

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
        var speed = GeVisJSON.features[gj].attributes.VehicleSpeed
        var compass = GeVisJSON.features[gj].attributes.DirectionCompass
        var location_age = GeVisJSON.features[gj].attributes.PositionAge
        var schedule_variance = GeVisJSON.features[gj].attributes.DelayTime
        var lat = GeVisJSON.features[gj].attributes.Latitude
        var long = GeVisJSON.features[gj].attributes.Longitude

        //var otherunit
        //var otherunitlat
        //var otherunitlong

        //if(GeVisJSON.features[i].attributes.EquipmentDesc == "Matangi Power Car                       "){
        //  linked_unit
        //}


        //new service object
        var service = new Service(service_id,service_date,service_description,linked_unit,speed,compass,location_age,schedule_variance,lat,long);


        //for debug
        // if(service.service_id == "1604" || service.service_id == "1609"){
        //   //console.log(service);
        //   fs.appendFile('WRLDEBUGLOG.txt', (JSON.stringify(service)+ "\r\n"), 'utf8', function (err){
        //     if (err) {
        //       return console.log(err);
        //   }
        // })
        // };
        //console.log(service.linked_unit);
        CurrentServices.push(service)
			};
		};
	};
  //get current caledar_id for timetable search
  var thisdate = new Date();
  var calendar_id = "";
  for (e = 0; e < calendarexceptions.length; e++){
    if (calendarexceptions[e].date == thisdate){
      calendar_id = calendarexceptions[e].calendar_id;
      break;
    };
  };
  if (calendar_id == ""){
    switch(thisdate.getDay()){
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
  //get all timetabled services that are not active
  var match = false;
  var compatibleservicedate = thisdate.toJSON().replace('-','').replace('-','').substring(0,8);

  var CurrentTimeMinus1 = new Date(CurrentUTC - (1 * 60000) ).toJSON().substring(10,19).replace('T',' ').trim();
  var CurrentTimePlus5 = new Date(CurrentUTC + (5 * 60000) ).toJSON().substring(10,19).replace('T',' ').trim();


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
          checkdeparts = stopTimes[st].departs
          checkarrives = ""
        };
        //checking if next entry on stopTimes exists and is zero, indicating end of service
        if(st+1 < stopTimes.length){
          if(stopTimes[st+1].station_sequence == 0){
            checkarrives = stopTimes[st].arrives
            //then check if already in active services
            if (checkdeparts < CurrentTimeMinus1 && checkarrives > CurrentTimePlus5 ){

              match = false
              //then check if already in active services
              for (cs = 0; cs < CurrentServices.length; cs++){
                if (tripSheet[ts].service_id == CurrentServices[cs].service_id){
                  match = true;
              };};
                if (match == false){
                  var service = new Service(tripSheet[ts].service_id,compatibleservicedate,"FROM TIMETABLE","","","","00:00",0,"","");
                  for (csa = 0; csa < CurrentServices.length; csa++){
                    if (CurrentServices[csa].service_id == service.LastService){
                      service.statusMessage = "Previous Service Delayed"
                    }
                  };
                  CurrentServices.push(service)
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

//service constructor
function Service(service_id,service_date,service_description,linked_unit,speed,compass,location_age,schedule_variance,lat,long){
  this.currenttime = CurrentUTC
  this.service_id = service_id.trim();
  this.service_description = service_description.trim();
  this.service_date = service_date.trim();
  this.calendar_id = getcalendaridfromservicedate(this.service_date);
  this.line = getlinefromserviceid(this.service_id)[0];
  this.kiwirail = getlinefromserviceid(this.service_id,service_description)[1];
  this.direction = getdirectionfromserviceid(this.service_id,service_description);
  this.KRline = KRlinefromline(this.line);
  this.linked_unit = linked_unit.trim();
  this.cars = getcarsfromtimetable(this.service_id,this.calendar_id);
  this.journey_id = getjourneyfromtimetable(this.service_id,this.calendar_id)[0];
  this.journey_order = getjourneyfromtimetable(this.service_id,this.calendar_id)[1];
  this.speed = speed;
  this.compass = compass;
  this.moving = (speed >= 1);
  this.location_age = location_age;
  this.location_age_seconds = parseInt(location_age.split(":")[0]*60) + parseInt(location_age.split(":")[1]);
  this.varianceMinutes = gevisvariancefix(schedule_variance);
  this.departs = getdepartsfromtimetable(this.service_id,this.calendar_id);
  this.departed = getdepartedornot(CurrentTime,this.departs);
  this.arrives = getarrivesfromtimetable(this.service_id,this.calendar_id);
  this.origin = getorigin(this.service_id,this.service_description,this.kiwirail,this.calendar_id);
  this.destination = getdestination(this.service_id,this.service_description,this.kiwirail,this.calendar_id);
  this.lat = lat;
  this.long = long;
  this.meterage = Math.floor(getmeterage(this.lat,this.long,this.KRline,this.line,this.direction));
  this.laststation = getlaststation(this.lat,this.long,this.meterage,this.KRline,this.direction)[0]
  this.laststationcurrent = getlaststation(this.lat,this.long,this.meterage,this.KRline,this.direction)[1]
  //variables needed to calculate own delay
  this.prevTimedStation = getPrevStnDetails(this.meterage,this.direction,this.service_id)[2]
  this.prevstntime = getPrevStnDetails(this.meterage,this.direction,this.service_id)[0]
  this.nextstntime = getNextStnDetails(this.meterage,this.direction,this.service_id)[0]
  this.prevstnmeterage = getPrevStnDetails(this.meterage,this.direction,this.service_id)[1]
  this.nextstnmeterage = getNextStnDetails(this.meterage,this.direction,this.service_id)[1]
  //allow for posibility of future fine grained delay calculations
  if(dummydata){
    this.schedule_variance = this.varianceMinutes
    this.schedule_variance_min = this.varianceMinutes
    this.varianceFriendly = this.varianceMinutes
  }else{
    //console.log(this.service_id);
    this.schedule_variance = getScheduleVariance(this.kiwirail, this.currenttime,this.service_date,this.meterage,this.prevstntime,this.nextstntime,this.prevstnmeterage,this.nextstnmeterage,this.location_age_seconds)[1];
    this.schedule_variance_min = getScheduleVariance(this.kiwirail, this.currenttime,this.service_date,this.meterage,this.prevstntime,this.nextstntime,this.prevstnmeterage,this.nextstnmeterage,this.location_age_seconds)[0];
    if(this.schedule_variance_min == ""){
      this.varianceFriendly = this.varianceMinutes
    }else{
      this.varianceFriendly = (this.schedule_variance_min).toFixed(0)
      if(this.varianceFriendly == -0){this.varianceFriendly = 0};
    }
    };
  //prev service
  this.LastService = getUnitLastService(this.service_id,this.calendar_id);
  //next service details
  this.NextService = getUnitNextService(this.service_id,this.calendar_id);
  this.NextTime = getdepartsfromtimetable(this.NextService,this.calendar_id);
  this.NextTurnaround = getTurnaroundFrom2Times(this.arrives,this.NextTime);
  //staff next service details
  this.LENextService = getStaffNextService(this.service_id,this.calendar_id,"LE");
  this.LENextServiceTime = getdepartsfromtimetable(this.LENextService,this.calendar_id);
  this.LENextTurnaround = getTurnaroundFrom2Times(this.arrives,this.LENextServiceTime);
  this.TMNextService = getStaffNextService(this.service_id,this.calendar_id,"TM");
  this.TMNextServiceTime = getdepartsfromtimetable(this.TMNextService,this.calendar_id);
  this.TMNextTurnaround = getTurnaroundFrom2Times(this.arrives,this.TMNextServiceTime);
  //pax count estimation
  this.passengerEstimation = getPaxAtStation(this.calendar_id, this.service_id, this.line, this.prevTimedStation, this.direction);
  //status message
  //this.statusMessage = getStatusMessage(this.kiwirail,this.linked_unit,this.location_age,this.varianceMinutes,this.NextTurnaround,this.LENextTurnaround,this.TMNextTurnaround,this.laststation,this.laststationcurrent,this.direction,this.line,this.departed,this.destination,this.speed,this.schedule_variance_min,this.origin);

  //generate Status Messages
      var location_age_seconds = parseInt(location_age.split(":")[0]*60) + parseInt(location_age.split(":")[1])
      var lowestTurnaround;
      var TurnaroundLabel;
      var stopProcessing = false;

      var StatusMessage = "";
      var TempStatus;
      var StatusArray = ["","",""]; //this will be in the format of [0] = delays, [1] = tracking, [2] = stopped

      //filter out the non metlinks
      if(this.kiwirail){
        TempStatus = "Non-Metlink Service";
        StatusArray[0] = TempStatus;
        StatusArray[1] = TempStatus;
        if(StatusMessage == "" && stopProcessing == false){StatusMessage = TempStatus};
        stopProcessing = true;
      };
      //filter out things found from timetable
      if(this.linked_unit == ""){
        TempStatus = "No Linked Unit";
        if(StatusMessage == "" && stopProcessing == false){StatusMessage = TempStatus};
        stopProcessing = true;
      };
      //filter already arrived trains
      if(this.laststation == this.destination){
        TempStatus = "Arriving";
        if(StatusMessage == "" && stopProcessing == false){StatusMessage = TempStatus};
        stopProcessing = true;
      }
      //the early/late status generation
      if (this.varianceFriendly < -1.5 && this.kiwirail == false){
          TempStatus = "Running Early";
          StatusArray[0] = TempStatus;
      }else if (this.varianceFriendly <5 && this.kiwirail == false){
          TempStatus = "Running Ok";
          StatusArray[0] = TempStatus;
      }else if (this.varianceFriendly <15 && this.kiwirail == false){
          TempStatus = "Running Late";
          StatusArray[0] = TempStatus;
      }else if (this.varianceFriendly >=15 && this.kiwirail == false){
          TempStatus = "Running Very Late";
          StatusArray[0] = TempStatus;
      };
      if(StatusMessage == "" && stopProcessing == false){StatusMessage = TempStatus};
      //compare turnarounds to lateness to look for issues
      if(((this.NextTurnaround != "") && (this.NextTurnaround < this.schedule_variance_min)) || ((this.LENextTurnaround != "") && (this.le_turnaround < this.schedule_variance_min)) || ((this.TMNextTurnaround != "") && (this.TMNextTurnaround < this.schedule_variance_min))){
        TempStatus = "Delay Risk:";

        if((this.NextTurnaround < this.schedule_variance_min)){
          TempStatus = TempStatus + " Train";
        };
        if((this.LENextTurnaround < this.schedule_variance_min)){
          TempStatus = TempStatus + " LE";
        };
        if((this.TMNextTurnaround < this.schedule_variance_min)){
          TempStatus = TempStatus + " TM";
        };
        //check for negative turnarounds and just give an error status
        if((this.NextTurnaround <0) || (this.LENextTurnaround < 0) || (this.TMNextTurnaround < 0)){
          TempStatus = "Midnight Error";
        };
        if(stopProcessing == false){StatusMessage = TempStatus};
        stopProcessing = true;
      };
      //look at linking issues
      if(this.location_age_seconds >=180){
          TempStatus = "";
        // identify tunnel tracking issues and provide alternative status message
        if(this.direction == "UP" && this.laststation == "MAYM" && (this.location_age_seconds < 900)){
          TempStatus = "In Rimutaka Tunnel";
          StatusArray[1] = TempStatus;
        }else if (this.direction == "UP" && this.laststation == "UPPE" && (this.location_age_seconds < 900)) {
          TempStatus = "In Rimutaka Tunnel";
          StatusArray[1] = TempStatus;
        }else if (this.direction == "DOWN" && this.laststation == "FEAT" && (this.location_age_seconds < 900)) {
          TempStatus = "In Rimutaka Tunnel";
          StatusArray[1] = TempStatus;
        }else if (this.direction == "DOWN" && this.laststation == "TAKA" && (this.location_age_seconds < 600) && this.line == "KPL") {
          TempStatus = "In Tawa Tunnel";
          StatusArray[1] = TempStatus;
        }else if (this.direction == "UP" && this.laststation == "KAIW" && (this.location_age_seconds < 600)  && this.line == "KPL") {
          TempStatus = "In Tawa Tunnel";
          StatusArray[1] = TempStatus;
        }else if (this.direction == "DOWN" && this.laststation == "T2" && (this.location_age_seconds < 600) && this.line == "KPL") {
          TempStatus = "In Tunnel 1";
          StatusArray[1] = TempStatus;
        }else if (this.direction == "UP" && this.laststation == "T1" && (this.location_age_seconds < 600)  && this.line == "KPL") {
          TempStatus = "In Tunnel 2";
          StatusArray[1] = TempStatus;
        }else if (this.departed == false && TempStatus == ""){
          TempStatus = "Awaiting Departure";
          StatusArray[0] = TempStatus;
          StatusArray[1] = TempStatus;
        }else{
          TempStatus = "Check OMS Linking";
          StatusArray[1] = TempStatus;
        };
        if(stopProcessing == false){StatusMessage = TempStatus};
      };
      if (this.departed == false && this.kiwirail == false){
        TempStatus = "Awaiting Departure";
        StatusArray[0] = TempStatus;
        StatusArray[1] = TempStatus;
        StatusMessage = TempStatus;
        stopProcessing = true;
      };
      if(this.speed == 0 && this.laststationcurrent == false){
        if(this.laststation == "POMA" && this.origin == "TAIT"){
          TempStatus = "In Storage Road";
          StatusArray[2] = TempStatus;
        }else if(this.laststation == "TEHO" && this.origin == "WAIK"){
          TempStatus = "In Turn Back Road";
          StatusArray[2] = TempStatus;
        }else{
          TempStatus = "Stopped between stations";
          StatusArray[2] = TempStatus;
      };
      if(StatusMessage == "" && stopProcessing == false){StatusMessage = TempStatus};
      stopProcessing = true;
    };
      if (StatusMessage == 0 || StatusMessage == false || typeof StatusMessage == "undefined"){
        StatusMessage = "";
      };

    this.statusMessage = StatusMessage;
    this.statusArray = StatusArray;


  //timetable lookup functions
  function getcarsfromtimetable(service_id,calendar_id){
    var cars;
    for(s = 0; s <unitRoster.length; s++){
      if (unitRoster[s].calendar_id == calendar_id){
        if(unitRoster[s].service_id == service_id){
          cars = unitRoster[s].units * 2
          break;
        }
      }
    };
    if (cars == "" || cars == 0 || typeof cars == "undefined"){
      return "";
    }else{
    return cars;
    };
  };
  function getjourneyfromtimetable(service_id,calendar_id){
    var journey = [];
    for(s = 0; s <unitRoster.length; s++){
      if (unitRoster[s].calendar_id == calendar_id){
        if(unitRoster[s].service_id == service_id){
          journey = [unitRoster[s].journey_id,unitRoster[s].journey_order]
          break;
        }
      }
    };
    if (journey == "" || journey == 0 || typeof journey == "undefined"){
      return ["",""];
    }else{
    return journey;
    };
  };
  function getdepartsfromtimetable(service_id,calendar_id){
    var departs
    for(st = 0; st < stopTimes.length; st++){
      //console.log (ts + " & " + st);
      if (service_id == stopTimes[st].service_id){
        //get start and end time
        if(stopTimes[st].station_sequence == 0){
          departs = stopTimes[st].departs
          break;
        };
      }};
    if (departs == "" || departs == 0 || typeof departs == "undefined"){
      return ""
    }else{
    return departs
    };
  };
  function getdepartedornot(CurrentTime,departuretime){
    if(CurrentTime > departuretime){
      return true
    }else if (CurrentTime < departuretime) {
      return false
    }
  }
  function getarrivesfromtimetable(service_id,calendar_id){
    var arrives
    for(st = 0; st < stopTimes.length; st++){
      //console.log (ts + " & " + st);
      if (service_id == stopTimes[st].service_id){
        //get start and end time
        if (st == stopTimes.length){
          arrives = stopTimes[st].arrives
          break;
        }else if(stopTimes[st+1].station_sequence == 0){
          arrives = stopTimes[st].arrives
          break;
        };
      }};
    if (arrives == "" || arrives == 0 || typeof arrives == "undefined"){
      return ""
    }else{
    return arrives
    };
  };
  function getorigin(service_id,description,kiwirailboolean,calendar_id){
    var origin
    for(st = 0; st < stopTimes.length; st++){
      //console.log (ts + " & " + st);
      if (service_id == stopTimes[st].service_id){
        //get start and end time
        if(stopTimes[st].station_sequence == 0){
          origin = stopTimes[st].station
          break;
        };
      }};
    if(kiwirailboolean && (origin == "" || origin == 0 || typeof origin == "undefined")){
      description = description.toUpperCase();
      if(description.substring(0,8) == "AUCKLAND"){
        origin = "AUCK";
      };
      if(description.substring(0,10) == "WELLINGTON"){
        origin = "WELL";
      };
      if(description.substring(0,16) == "PALMERSTON NORTH"){
        origin = "PALM";
      };
      if(description.substring(0,12) == "MT MAUNGANUI"){
        origin = "TAUR";
      };
      if(description.substring(0,8) == "HAMILTON"){
        origin = "HAMI";
      };
      if(description.substring(0,9) == "MASTERTON"){
        origin = "MAST";
      };
    };

    if (origin == "" || origin == 0 || typeof origin == "undefined"){
      return ""
    }else{
    return origin
    };
  };
  function getdestination(service_id,description,kiwirailboolean,calendar_id){
    var destination
    for(st = 0; st < stopTimes.length; st++){
      //console.log (ts + " & " + st);
      if (stopTimes[st].service_id == service_id){
        //get start and end time
        if(stopTimes[st+1].station_sequence == 0){
          destination = stopTimes[st].station;
          break;
        };
      }};
    if(kiwirailboolean && (destination == "" || destination == 0 || typeof destination == "undefined")){

      description = description.toUpperCase();
      description = description.split("-");
      description = description[1].trim();
      if(description.substring(0,8) == "AUCKLAND"){
        destination = "AUCK";
      };
      if(description.substring(0,10) == "WELLINGTON"){
        destination = "WELL";
      };
      if(description.substring(0,16) == "PALMERSTON NORTH"){
        destination = "PALM";
      };
      if(description.substring(0,12) == "MT MAUNGANUI"){
        destination = "TAUR";
      };
      if(description.substring(0,8) == "HAMILTON"){
        destination = "HAMI";
      };
      if(description.substring(0,9) == "MASTERTON"){
        destination = "MAST";
      };
    };
    if (destination == "" || destination == 0 || typeof destination == "undefined"){
      return ""
    }else{
    return destination
    };
  };
  function getUnitNextService(service_id,calendar_id){
    var NextService;
    for(s = 0; s <unitRoster.length; s++){
      if (unitRoster[s].calendar_id == calendar_id && unitRoster[s].service_id == (service_id)){
          if(unitRoster[s].journey_id == unitRoster[s+1].journey_id){
            NextService = unitRoster[s+1].service_id
          } else{
            NextService = ""
          };
      };
    };
    return NextService;
  };
  function getUnitLastService(service_id,calendar_id){
    var LastService;
    for(s = 0; s <unitRoster.length; s++){
      if (unitRoster[s].calendar_id == calendar_id && unitRoster[s].service_id == (service_id)){
          if(unitRoster[s].journey_id == unitRoster[s-1].journey_id){
            LastService = unitRoster[s-1].service_id
          } else{
            LastService = ""
          };
      };
    };
    return LastService;
  };
  function getStaffNextService(service_id,calendar_id,work_type){
    var NextService;
    for(s = 0; s <masterRoster.length; s++){
      if (masterRoster[s].calendarId == calendar_id && masterRoster[s].serviceID == (service_id) && masterRoster[s].workType == (work_type)){
          if(masterRoster[s].shiftId == masterRoster[s+1].shiftId){
            NextService = masterRoster[s+1].serviceID
          } else{
            NextService = ""
          };
      };
    };
    return NextService;
  };
  function getTurnaroundFrom2Times(EndTime,StartTime){
    var time1 = new Date()
    time1.setHours(EndTime.split(":")[0])
    time1.setMinutes(EndTime.split(":")[1])
    var time2 = new Date()
    time2.setHours(StartTime.split(":")[0])
    time2.setMinutes(StartTime.split(":")[1])
    var Turnaround = Math.round((time2 - time1)/1000/60);
    if (typeof Turnaround == "undefined"){
      Turnaround = "";
    };
    return Turnaround;
  }
  //logical functions
  function getcalendaridfromservicedate(service_date){
    var thisdate = new Date(service_date.substring(0,4),service_date.substring(4,6)-1,service_date.substring(6,8));
    var calendar_id = "";
    for (e = 0; e < calendarexceptions.length; e++){
      if (calendarexceptions[e].date == service_date){
        calendar_id = calendarexceptions[e].calendar_id;
        break;
      };
    };
    if (calendar_id == ""){
      switch(thisdate.getDay()){
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
    return calendar_id;
  };
  function getlinefromserviceid(service_id,service_description){
      var numchar_id = "";
      var line = [];
      var freightdetect
      if (typeof service_description !== "undefined"){
        if(service_description.includes('FREIGHT')){
          freightdetect = true
        };
    };
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
  function KRlinefromline(line){
    var KRLine
    switch(line){
      case "PNL":
      case "KPL":
        KRLine = "NIMT";
        break;
      case "HVL":
      case "WRL":
        KRLine = "WRL";
        break;
      case "MEL":
        KRLine = "MEL";
        break;
      case "JVL":
        KRLine = "JVL";
        break;
      default:
        KRLine = "";
    }
    return KRLine
  };
  function gevisvariancefix(schedule_variance){
    var fixedvariance
    if(schedule_variance < 0){
      fixedvariance = Math.abs(schedule_variance)
    };
    if(schedule_variance == 0){
      fixedvariance = 0
    };
    if(schedule_variance > 0){
      fixedvariance = 0 - schedule_variance
    };
    return fixedvariance
  };
  //mathematical functions
  function getmeterage(lat,long,KRline,line){
    //finds closest and next closest points from records
    var position = {"coords":{"latitude": lat,"longitude": long}};
    var locations = [];
    var location = {};
    for (l = 0; l < lineshapes.length; l++){
      if(lineshapes[l].line_id == KRline){
        location = {"latitude": lineshapes[l].lat,"longitude": lineshapes[l].long, "order": lineshapes[l].order, "meterage":lineshapes[l].meterage};
        locations.push(location);
      };
    };
    if(typeof KRline == 'undefined' || KRline == ""){
      return ""
    }
    var point1 = locations[0];
    var point2 = locations[1];
    var closest
    var nextclosest
    var point1_distance = distance(point1,position.coords);
    var point2_distance = distance(point2,position.coords);

    for(i=1;i<locations.length;i++){
        //cycle component
        //console.log(inbetween(point2,position.coords,point1));
        if(distance(locations[i],position.coords) < point1_distance){
          //if((inbetween(point2,position.coords,point1) == false)){console.log("not inbetween");};
            //console.log("itterated " + point1.order);
             point2 = point1;
             point2_distance = point1_distance;
             point1 = locations[i];
             point1_distance = distance(locations[i] , position.coords);

        //stopping component
        }else if (inbetween(point2,position.coords,point1)){
          //stop
        }else{
          //keep on cycling
          point2 = point1;
          point2_distance = point1_distance;
          point1 = locations[i];
          point1_distance = distance(locations[i],position.coords);
        };
      };//(distance(locations[i],position.coords)>closest_distance && distance(locations[i],position.coords)<nextclosest_distance && (Math.abs(bearing(position.coords,closest) - bearing(position.coords,nextclosest)) >180)){

      if(distance(point1,position.coords) < distance(point2,position.coords)){
        closest = point1;
        nextclosest = point2;
      } else {
        closest = point2;
        nextclosest = point1;
      };
      //console.log("closest = " + closest);
      //if(line == "JVL"){console.log(closest.order + " "+ nextclosest.order)};
      //if(line == "WRL" && closest.order > 110){console.log(closest.order + " "+ nextclosest.order)};

    //console.log(closest.order +" " + nextclosest.order);
    //checks the order (direction) of the points selected
    if (closest.order < nextclosest.order){
      //beyond closest meterage
      var XX = nextclosest.latitude - closest.latitude
      var YY = nextclosest.longitude - closest.longitude
      var ShortestLength = ((XX * (position.coords.latitude - closest.latitude)) + (YY * (position.coords.longitude - closest.longitude))) / ((XX * XX) + (YY * YY))
      var Vlocation = {"latitude": (closest.latitude + XX * ShortestLength),"longitude": (closest.longitude + YY * ShortestLength)};
      meterage = closest.meterage + distance(Vlocation,closest)
    }else{
      //behind closest meterage
      var XX = closest.latitude - nextclosest.latitude
      var YY = closest.longitude - nextclosest.longitude
      var ShortestLength = ((XX * (position.coords.latitude - nextclosest.latitude)) + (YY * (position.coords.longitude - nextclosest.longitude))) / ((XX * XX) + (YY * YY))
      var Vlocation = {"latitude": (nextclosest.latitude + XX * ShortestLength),"longitude": (nextclosest.longitude + YY * ShortestLength)};
      meterage = closest.meterage - distance(Vlocation,closest)
    };
    return meterage
    };

  function inbetween(position1,position2,position3){
      //function determines if position 2 is inbetween 1 & 3
      var AB = bearing(position2,position1);
      var BC = bearing(position2,position3);
      //console.log(BC + " - " + AB);
      var BCZero = BC - AB
      //console.log(BCZero);
      //console.log((BCZero > -90 && BCZero < 90));
      if (BCZero > -90 && BCZero < 90){
        return false
      }else{
        return true
      }
    };
  function distance(position1,position2){
    var lat1=position1.latitude;
    var lat2=position2.latitude;
    var lon1=position1.longitude;
    var lon2=position2.longitude;
    var R = 6371000; // metres
    var φ1 = lat1 * Math.PI / 180;
    var φ2 = lat2 * Math.PI / 180;
    var Δφ = (lat2-lat1) * Math.PI / 180;
    var Δλ = (lon2-lon1) * Math.PI / 180;

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    var d = R * c;
    return d;
  };
  function bearing(position1,position2){
    var lat1=position1.latitude;
    var lat2=position2.latitude;
    var lon1=position1.longitude;
    var lon2=position2.longitude;
    var R = 6371000; // metres
    var φ1 = lat1 * Math.PI / 180;
    var φ2 = lat2 * Math.PI / 180;
    var λ1 = lon1 * Math.PI / 180;
    var λ2 = lon2 * Math.PI / 180;

    var y = Math.sin(λ2-λ1) * Math.cos(φ2);
    var x = Math.cos(φ1)*Math.sin(φ2) -
            Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    var brng = Math.atan2(y, x) * 180 / Math.PI;

    //if (brng < 0 ){brng = brng+360};
    return brng
  };
  //high level functions
  function getlaststation(lat,lon,meterage,KRLine,direction){
    //code to check and determine if at stations
  	var thisid,thisnorth,thiswest,thissouth,thiseast
    var laststation = ["",false];

    //checks lat long for current stations first
    for (j = 0; j < StationGeoboundaries.length; j++) {
      thisid = StationGeoboundaries[j].station_id;
      thisnorth = StationGeoboundaries[j].north;
      thiswest = StationGeoboundaries[j].west;
      thissouth = StationGeoboundaries[j].south;
      thiseast = StationGeoboundaries[j].east;

      if(lon > thiswest & lon < thiseast & lat < thisnorth & lat > thissouth){
        laststation = [thisid, true];
        break;
      }};
    //works out last station based on line, direction and meterage
    if(!laststation[1]){
      for (m = 0; m < StationMeterage.length; m++){
        if(StationMeterage[m].KRLine == KRLine){
          if(direction == "UP"){
            if(StationMeterage[m].meterage >= meterage){
              laststation = [StationMeterage[m-1].station_id, false];
              break;
            }
          };
          if(direction == "DOWN"){
            if(StationMeterage[m].meterage >= meterage){
              laststation = [StationMeterage[m].station_id, false];
              break;
            }
          };
        };
      }
    };
    return laststation
    };
  function getPrevStnDetails(meterage,direction,service_id){
    var prevstation
    var prevtime
    var prevmeterage
    for (st = 0; st < stopTimes.length; st++){
      if (direction == "UP"){
        if(stopTimes[st].service_id == service_id && getMeterageOfStation(stopTimes[st].station) < meterage){
          prevstation = stopTimes[st].station
          prevtime = stopTimes[st].departs
          prevmeterage = getMeterageOfStation(stopTimes[st].station)
        };
        }else{
          if(stopTimes[st].service_id == service_id && getMeterageOfStation(stopTimes[st].station) > meterage){
              prevstation = stopTimes[st].station
              prevtime = stopTimes[st].departs
              prevmeterage = getMeterageOfStation(stopTimes[st].station)
          }
        }}
        if(prevtime == undefined){
          //console.log(prevstation + " " + service_id)
        }
          return [prevtime,prevmeterage,prevstation]
        };
  function getNextStnDetails(meterage,direction,service_id){
    var nextstation
    var nexttime
    var nextmeterage
    for (st = 0; st < stopTimes.length; st++){
      if (direction == "UP"){
          if(stopTimes[st].service_id == service_id && getMeterageOfStation(stopTimes[st].station) > meterage){
              nextstation = stopTimes[st].station
              nexttime = stopTimes[st].departs
              nextmeterage = getMeterageOfStation(stopTimes[st].station)
              break;
          }
      }else{
        if(stopTimes[st].service_id == service_id && getMeterageOfStation(stopTimes[st].station) < meterage){
            nextstation = stopTimes[st].station
            nexttime = stopTimes[st].departs
            nextmeterage = getMeterageOfStation(stopTimes[st].station)
            break;
        }
      }}
        return [nexttime,nextmeterage,nextstation]
      };
  function getMeterageOfStation(station_id){
    for (sm = 0; sm < StationMeterage.length; sm++){
      if (station_id == StationMeterage[sm].station_id){
        return StationMeterage[sm].meterage
      }}
    };

  function getScheduleVariance(kiwirail,currenttime,service_date,meterage,prevstntime,nextstntime,prevstnmeterage,nextstnmeterage,location_age_seconds){
    if (kiwirail == false && prevstntime !== undefined && nextstntime !== undefined && prevstnmeterage !== undefined){

      var ExpectedTime = getUTCTodayfromTimeDate(prevstntime,service_date) + ((getUTCTodayfromTimeDate(nextstntime,service_date)-getUTCTodayfromTimeDate(prevstntime,service_date)) * ((meterage - prevstnmeterage) / (nextstnmeterage - prevstnmeterage)));
      //console.log (getUTCTodayfromTimeDate(prevstntime,service_date)+" - "+getUTCTodayfromTimeDate(nextstntime,service_date) + " = " + (getUTCTodayfromTimeDate(prevstntime,service_date)-getUTCTodayfromTimeDate(nextstntime,service_date))/60000);
      //console.log( (meterage - prevstnmeterage) / (nextstnmeterage - prevstnmeterage) );
      var CurrentDelay = ((Math.round(((currenttime -43200000) - Math.floor(ExpectedTime))/1000))/60) - (location_age_seconds /60);
      //console.log(CurrentDelay/60000);
      //console.log(ExpectedTime +" "+currenttime +" = "+ CurrentDelay);
      return [CurrentDelay,minTommss(CurrentDelay)]
    }else{
      return ["",""]
    }
  };

  function minTommss(minutes){
   var sign = minutes < 0 ? "-" : "";
   var min = Math.floor(Math.abs(minutes));
   var sec = Math.floor((Math.abs(minutes) * 60) % 60);
   return sign + (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
  }
  function getUTCTodayfromTimeDate(thistime,thisdate){
    var seconds = parseInt(thistime.split(":")[0])*60*60 + (parseInt(thistime.split(":")[1])*60);
    var now = new Date(thisdate.substring(0,4),(thisdate.substring(4,6)-1),thisdate.substring(6,8));
    var today = now.getTime() + (seconds * 1000)
    return today
  };

};
//passenger count calculations
function getPaxAtStation(calendar_id, service_id, line, station, direction){

  //array to hold list of stations and their sequence number
  var stoppingArray = [];
  var totalCount = getCountAndPeakType(calendar_id,service_id)[0];
  var peakType = getCountAndPeakType(calendar_id,service_id)[1];
  var addToOne = 0;

  //loop through stopTimes and get all relevant stopTimes
  for (st=0; st<stopTimes.length; st++){
    if(service_id == stopTimes[st].service_id){
      var percent
      for (spc=0; spc < passengerPercentage.length; spc++){
        if(calendar_id == passengerPercentage[spc].calendar_id && line == passengerPercentage[spc].line && peakType == passengerPercentage[spc].peak_type && stopTimes[st].station == passengerPercentage[spc].station_id){
          percent = passengerPercentage[spc].percentage
          addToOne = addToOne + percent
        };
      }
      stoppingArray.push({"station":stopTimes[st].station,"sequence":stopTimes[st].station_sequence,"percent":percent,"passengerCount":0})
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
    stationCount = totalCount
    for (sta=0; sta<stoppingArray.length;sta++){
      stationCount = stationCount - stoppingArray[sta].passengerCount;
      if (stoppingArray[sta].station == station){break;};
    };
  }else if (direction == "DOWN"){
    stationCount = 0
    for (sta=0; sta<stoppingArray.length;sta++){
      stationCount = stationCount + stoppingArray[sta].passengerCount;
      if (stoppingArray[sta].station == station){break;};
    };
  };

  //test function
  //console.log(service_id);
  //console.log("station count = " + stationCount)
  //console.log(stoppingArray);

  stationCount = Number(Math.round(stationCount+'e1')+'e-1');

  if(stationCount == null || stationCount == undefined){
    stationCount = "";
  };

  return stationCount

  function getCountAndPeakType(calendar_id,service_id){
    var peakType
    var count
    for(s=0;s<passengerAverage.length;s++){
      if (passengerAverage[s].service_id == service_id){
        peakType = passengerAverage[s].peak_type;
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

app.use('/public', express.static(path.join(__dirname, 'public')))
app.get('/pilot', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/CurrentServices', (request, response) => {
  var Current = {"Time":CurrentUTC, CurrentServices}
  response.writeHead(200, {"Content-Type": "application/json"},{cache:false});
  response.write(JSON.stringify(Current));
  response.end();
})

app.get('/berthing', (request, response) => {
  response.writeHead(200, {"Content-Type": "application/json"},{cache:false});
  response.write(JSON.stringify(berthing));
  response.end();
})

var port = 3000;
app.listen(port);
console.log("listening on " + port);
