const path = require('path')
const express = require('express')
const app = express()
const https = require('https');
const StationGeoboundaries = require('./Data/StationGeoboundaries')
const StationMeterage = require('./Data/StationMeterage')
const lineshapes = require('./Data/lineshapes')
const Timetable = require('./Data/Timetable')
const masterRoster = require('./Data/masterRoster')
const dummyCurrentServices = require('./Data/DummyCurrentServices')
const calendarexceptions = require('./Data/calendarexceptions')
//for the users project
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')/*
var config = require('./config.js')
var funct = require('./function.js')
*/

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

//for debuging
var dummydata = false
var dummytime = 1497202547000


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

	//show all active services
	for (i = 0; i < GeVisJSON.features.length; i++) {
		//get those linked to service
		if(GeVisJSON.features[i].attributes.TrainID != ""){
			//get those south of levin and east of cook strait
			if(GeVisJSON.features[i].attributes.Longitude > 174.5 & GeVisJSON.features[i].attributes.Latitude < -40.625887 & GeVisJSON.features[i].attributes.EquipmentDesc != "Rail Ferry     " ){
        //LastTrain.push(GeVisJSON.features[i].attributes.TrainID + "   " + GeVisJSON.features[i].attributes.TrainDesc +"   " + GeVisJSON.features[i].attributes.VehicleID + "   " + GeVisJSON.features[i].attributes.Station);
        var service_id = GeVisJSON.features[i].attributes.TrainID
        var service_date = GeVisJSON.features[i].attributes.TrainDate
        var service_description = GeVisJSON.features[i].attributes.TrainDesc
        var linked_unit = GeVisJSON.features[i].attributes.VehicleID
        var speed = GeVisJSON.features[i].attributes.VehicleSpeed
        var compass = GeVisJSON.features[i].attributes.DirectionCompass
        var location_age = GeVisJSON.features[i].attributes.PositionAge
        var schedule_variance = GeVisJSON.features[i].attributes.DelayTime
        var lat = GeVisJSON.features[i].attributes.Latitude
        var long = GeVisJSON.features[i].attributes.Longitude
        //new service object
        var service = new Service(service_id,service_date,service_description,linked_unit,speed,compass,location_age,schedule_variance,lat,long);
        //for debug
        /*
        if(service.service_id == "201"){
          console.log(service);
        };
        */
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
  for (ts = 0; ts < Timetable.length; ts++){
    if (Timetable[ts].calendar_id == calendar_id){
        if (Timetable[ts].departs < CurrentTime && Timetable[ts].arrives > CurrentTime){
          match = false
          //then check if already in active services
            for (cs = 0; cs < CurrentServices.length; cs++){
              if (Timetable[ts].service_id == CurrentServices[cs].service_id){
                match = true;
            };};
              if (match == false){
                var service = new Service(Timetable[ts].service_id,compatibleservicedate,"FROM TIMETABLE","","","","00:00",0,"","");
                CurrentServices.push(service)
              };
        };
    };
  };
};


//service constructor
function Service(service_id,service_date,service_description,linked_unit,speed,compass,location_age,schedule_variance,lat,long){
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
  //allow for posibility of future fine grained delay calculations
  this.schedule_variance = gevisvariancefix(schedule_variance);
  this.departs = getdepartsfromtimetable(this.service_id,this.calendar_id);
  this.departed = getdepartedornot(CurrentTime,this.departs);
  this.arrives = getarrivesfromtimetable(this.service_id,this.calendar_id);
  this.origin = getorigin(this.service_id,this.service_description,this.kiwirail,this.calendar_id);
  this.destination = getdestination(this.service_id,this.service_description,this.kiwirail,this.calendar_id);
  this.lat = lat;
  this.long = long;
  this.meterage = getmeterage(this.lat,this.long,this.KRline);
  this.laststation = getlaststation(this.lat,this.long,this.meterage,this.KRline,this.direction)[0]
  this.laststationcurrent = getlaststation(this.lat,this.long,this.meterage,this.KRline,this.direction)[1]
  //next service details
  this.NextService = getNextDetails(this.arrives,this.journey_id,this.journey_order)[0]
  this.NextTime = getNextDetails(this.arrives,this.journey_id,this.journey_order)[1]
  this.NextDestination = getNextDetails(this.arrives,this.journey_id,this.journey_order)[2]
  this.NextTurnaround = getNextDetails(this.arrives,this.journey_id,this.journey_order)[3]
  //staff next service details
  this.LENextService = getStaffNextService(this.service_id,this.calendar_id,"LE");
  this.LENextServiceTime = getdepartsfromtimetable(this.LENextService,this.calendar_id);
  this.LENextTurnaround = getTurnaroundFrom2Times(this.arrives,this.LENextServiceTime);
  this.TMNextService = getStaffNextService(this.service_id,this.calendar_id,"TM");
  this.TMNextServiceTime = getdepartsfromtimetable(this.TMNextService,this.calendar_id);
  this.TMNextTurnaround = getTurnaroundFrom2Times(this.arrives,this.TMNextServiceTime);
  //status message
  this.statusMessage = getStatusMessage(this.kiwirail,this.linked_unit,this.location_age,this.varianceMinutes,this.NextTurnaround,this.LENextTurnaround,this.TMNextTurnaround,this.laststation,this.laststationcurrent,this.direction,this.line,this.departed,this.destination);

  //timetable lookup functions
  function getcarsfromtimetable(service_id,calendar_id){
    var cars;
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].calendar_id == calendar_id){
        if(Timetable[s].service_id == service_id){
          cars = Timetable[s].units * 2
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
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].calendar_id == calendar_id){
        if(Timetable[s].service_id == service_id){
          journey = [Timetable[s].journey_id,Timetable[s].journey_order]
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
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].calendar_id == calendar_id){
        if(Timetable[s].service_id == service_id){
          departs = Timetable[s].departs
        }
      }
    };
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
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].calendar_id == calendar_id){
        if(Timetable[s].service_id == service_id){
          arrives = Timetable[s].arrives
        }
      }
    };
    if (arrives == "" || arrives == 0 || typeof arrives == "undefined"){
      return ""
    }else{
    return arrives
    };
  };
  function getorigin(service_id,description,kiwirailboolean,calendar_id){
    var origin
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].calendar_id == calendar_id){
        if(Timetable[s].service_id == service_id){
          origin = Timetable[s].origin
        }
      }
    };
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
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].calendar_id == calendar_id){
        if(Timetable[s].service_id == service_id){
          destination = Timetable[s].destination
        }
      }
    };
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
  function getNextDetails(arrives,journey_id,journey_order){

    var Nextdetails = [];
    for(s = 0; s <Timetable.length; s++){
      if (Timetable[s].journey_id == journey_id){
        if(Timetable[s].journey_order == (journey_order+1)){
          var time1 = new Date()
          time1.setHours(Timetable[s].departs.split(":")[0])
          time1.setMinutes(Timetable[s].departs.split(":")[1])
          var time2 = new Date()
          time2.setHours(arrives.split(":")[0])
          time2.setMinutes(arrives.split(":")[1])
          var Turnaround = Math.round((time1 - time2)/1000/60);
          if (typeof Turnaround == "undefined"){
            Turnaround = "";
          };

          Nextdetails = [Timetable[s].service_id,Timetable[s].departs,Timetable[s].destination,Turnaround];
          break;
        }
      }
    };
    if (Nextdetails == "" || Nextdetails == 0 || typeof Nextdetails == "undefined"){
      return ["","","",""];
    }else{
    return Nextdetails;
    };
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
  function getmeterage(lat,long,KRline){
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
    var closest = locations[0];
    var nextclosest
    var closest_distance = distance(closest,position.coords);
    var nextclosest_distance
    for(var i=1;i<locations.length;i++){
        if(distance(locations[i],position.coords)<closest_distance){
             nextclosest = closest;
             nextclosest_distance = closest_distance;
             closest_distance=distance(locations[i],position.coords);
             closest=locations[i];
             //console.log(closest.order + " " + nextclosest.order);
        }else if(distance(locations[i],position.coords)>closest_distance){
          nextclosest = locations[i];
          nextclosest_distance = distance(locations[i],position.coords);
        //checks to make sure next closest shouldnt be next point beyond
        }else if (distance(nextclosest,closest) < distance(nextclosest,position.coords)){
          nextclosest = locations[closest.order+1];
          nextclosest_distance = distance(locations[closest.order+1], position.coords);
        };
    };
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
      meterage = closest.meterage + distance(Vlocation,closest)
    }
    return meterage
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
  }
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
  function getStatusMessage(kiwirail_boolean,linked_unit,location_age,variance_minutes,train_turnaround,le_turnaround,tm_turnaround,last_station,last_station_current,direction,line,departed,destination){
    //(this.kiwirail,this.linked_unit,this.location_age,this.varianceMinutes,this.NextTurnaround,this.LENextTurnaround,this.TMNextTurnaround,this.laststation,this.laststationcurrent,this.direction)
      var location_age_seconds = parseInt(location_age.split(":")[0]*60) + parseInt(location_age.split(":")[1])
      var StatusMessage;
      var lowestTurnaround;
      var TurnaroundLabel;

      //filter out the non metlinks
      if(kiwirail_boolean){
        StatusMessage = "Non-Metlink Service"
        return StatusMessage
      };
      //filter out things found from timetable
      if(linked_unit == ""){
        StatusMessage = "No Linked Unit"
        return StatusMessage
      }
      //filter already arrived trains
      if(last_station == destination){
        StatusMessage = "Arriving"
        return StatusMessage
      }
      //the early/late status generation
      if (variance_minutes < -1){
          StatusMessage = "Running Early";
      }else if (variance_minutes <=4){
          StatusMessage = "Running Ok"
      }else if (variance_minutes <15){
        StatusMessage = "Running Late"
      }else if (variance_minutes >=15){
        StatusMessage = "Running Very Late"
      };
      //compare turnarounds to lateness to look for issues
      if(((train_turnaround != "") && (train_turnaround < variance_minutes)) || ((le_turnaround != "") && (le_turnaround < variance_minutes)) || ((tm_turnaround != "") && (tm_turnaround < variance_minutes))){
        StatusMessage = "Delay Risk:";

        if((train_turnaround < variance_minutes)){
          StatusMessage = StatusMessage + " Train";
        };
        if((le_turnaround < variance_minutes)){
          StatusMessage = StatusMessage + " LE";
        };
        if((tm_turnaround < variance_minutes)){
          StatusMessage = StatusMessage + " TM";
        };
        //check for negative turnarounds and just give an error status
        if((train_turnaround <0) || (le_turnaround < 0) || (tm_turnaround < 0)){
          StatusMessage = "Midnight Error";
        }
        return StatusMessage
      };
      //look at linking issues
      if(location_age_seconds >=300){
        // identify tunnel tracking issues and provide alternative status message
        if(direction == "UP" && last_station == "MAYM" && (location_age_seconds < 900)){
          StatusMessage = "In Rimutaka Tunnel"
        }else if (direction == "DOWN" && last_station == "FEAT" && (location_age_seconds < 900)) {
          StatusMessage = "In Rimutaka Tunnel"
        }else if (direction == "DOWN" && last_station == "TAKA" && (location_age_seconds < 600) && line == "KPL") {
          StatusMessage = "In Tunnel 1/2"
        }else if (direction == "UP" && last_station == "KAIW" && (location_age_seconds < 600)  && line == "KPL") {
          StatusMessage = "In Tunnel 1/2"
        }else if (departed == false){
          StatusMessage = "Awaiting Departure"
        }else{
          StatusMessage = "Check OMS Linking"
        }
      };
      if (departed == false){
        StatusMessage = "Awaiting Departure"
      };


    if (StatusMessage == 0 || StatusMessage == false || typeof StatusMessage == "undefined"){
      StatusMessage = "";
    }
    return StatusMessage;
  }
};

app.use('/public', express.static(path.join(__dirname, 'public')))

app.get('/pilot', (request, response) => {
  response.sendFile(path.join(__dirname, 'index.html'))
})

app.get('/CurrentServices', (request, response) => {
  var Current = {"Time":CurrentUTC, CurrentServices}
  response.writeHead(200, {"Content-Type": "application/json"});
  response.write(JSON.stringify(Current));
  response.end();
})

var port = 3000;
app.listen(port);
console.log("listening on " + port);
