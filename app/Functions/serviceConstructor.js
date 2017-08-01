let moment = require('moment-timezone');
moment().tz('Pacific/Auckland').format();
// supporting data files
let StationGeoboundaries = require('../Data/StationGeoboundaries');
let StationMeterage = require('../Data/StationMeterage');
let lineshapes = require('../Data/lineshapes');
let masterRoster = require('../Data/masterRoster');
let calendarexceptions = require('../Data/calendarexceptions');
let stopTimes = require('../Data/stopTimes');
let unitRoster = require('../Data/unitRoster');
// supporting functions
let getPaxAtStation = require('../Functions/passengerEstimation');

// for debuging
let dummydata = require('../Functions/debugMode')[0];

// service constructor Object, represents a single rail service
module.exports = function Service(CurrentMoment,
                                  serviceId,
                                  service_date,
                                  service_description,
                                  linked_unit,
                                  second_unit,
                                  second_unit_lat, second_unit_long,
                                  speed, compass,
                                  locationAge,
                                  varianceKiwirail,
                                  lat, long) {
  this.currenttime = moment(CurrentMoment);
  this.serviceId = serviceId.trim();
  this.service_description = service_description.trim();
  this.service_date = moment(service_date.trim(), 'YYYYMMDD');
  this.calendar_id = calendarIDfromDate(this.service_date);
  this.line = getlinefromserviceid(this.serviceId)[0];
  this.kiwirail = getlinefromserviceid(this.serviceId, service_description)[1];
  this.direction = getdirectionfromserviceid(this.serviceId);
  this.KRline = lineToKiwiRailLine(this.line);
  this.linked_unit = linked_unit.trim();
  this.second_unit = second_unit;
  this.second_unit_lat = second_unit_lat;
  this.second_unit_long = second_unit_long;
  this.cars = getcarsfromtimetable(this.serviceId, this.calendar_id);
  this.journey_id = getjourneyfromtimetable(this.serviceId, this.calendar_id)[0];
  this.journey_order = getjourneyfromtimetable(this.serviceId, this.calendar_id)[1];
  this.speed = speed;
  this.compass = compass;
  this.moving = (speed >= 1);
  this.location_age = locationAge;
  this.location_age_seconds =
    parseInt(this.location_age.toString().split(':')[0]*60) +
    parseInt(this.location_age.toString().split(':')[1]);
  this.varianceKiwirail = gevisvariancefix(varianceKiwirail);
  this.departs = getdepartsfromtimetable(this.service_date,
                                         this.serviceId,
                                         this.calendar_id);
  if (this.departs == '') {
    this.departsString = '';
  } else {
    this.departsString = moment(this.departs).format('HH:mm');
  };
  this.departed = getdepartedornot(this.currenttime, this.departs);
  this.arrives = getarrivesfromtimetable(this.service_date,
                                         this.serviceId,
                                         this.calendar_id);
  if (this.arrives == '') {
    this.arrivesString = '';
  } else {
    this.arrivesString = moment(this.arrives).format('HH:mm');
  };
  this.origin = getorigin(this.serviceId, this.service_description, this.kiwirail, this.calendar_id);
  this.destination = getdestination(this.serviceId, this.service_description, this.kiwirail, this.calendar_id);
  this.lat = lat;
  this.long = long;
  this.meterage = Math.floor(getmeterage(this.lat, this.long, this.KRline, this.line, this.direction));
  this.laststation = getlaststation(this.lat, this.long, this.meterage, this.KRline, this.direction)[0];
  this.laststationcurrent = getlaststation(this.lat, this.long, this.meterage, this.KRline, this.direction)[1];
  // variables needed to calculate own delay
  this.prevTimedStation = getPrevStnDetails(this.service_date, this.meterage, this.direction, this.serviceId)[2];
  this.prevstntime = getPrevStnDetails(this.service_date, this.meterage, this.direction, this.serviceId)[0];
  this.nextstntime = getNextStnDetails(this.service_date, this.meterage, this.direction, this.serviceId)[0];
  this.prevstnmeterage = getPrevStnDetails(this.service_date, this.meterage, this.direction, this.serviceId)[1];
  this.nextstnmeterage = getNextStnDetails(this.service_date, this.meterage, this.direction, this.serviceId)[1];
  // allow for posibility of future fine grained delay calculations
  if (dummydata) {
    this.schedule_variance = this.varianceKiwirail;
    this.schedule_variance_min = this.varianceKiwirail;
    this.varianceFriendly = this.varianceKiwirail;
  } else {
    this.schedule_variance = getScheduleVariance(this.kiwirail, this.currenttime, this.service_date, this.meterage, this.prevstntime, this.nextstntime, this.prevstnmeterage, this.nextstnmeterage, this.location_age_seconds)[1];
    this.schedule_variance_min = getScheduleVariance(this.kiwirail, this.currenttime, this.service_date, this.meterage, this.prevstntime, this.nextstntime, this.prevstnmeterage, this.nextstnmeterage, this.location_age_seconds)[0];
    if (this.schedule_variance_min == '') {
      this.varianceFriendly = this.varianceKiwirail;
    } else {
      this.varianceFriendly = (this.schedule_variance_min).toFixed(0);
      if (this.varianceFriendly == -0) {this.varianceFriendly = 0;};
    }
    };
  // prev service
  this.LastService = getUnitLastService(this.serviceId, this.calendar_id);
  // next service details
  this.NextService = getUnitNextService(this.serviceId, this.calendar_id);
  this.NextTime = getdepartsfromtimetable(this.service_date, this.NextService, this.calendar_id);
  if (this.NextTime == '') {this.NextTimeString = '';} else {this.NextTimeString = moment(this.NextTime).format('HH:mm');};
  this.NextTurnaround = getTurnaroundFrom2Times(this.arrives, this.NextTime);
  // staff next service details
  this.LENextService = getStaffNextService(this.serviceId, this.calendar_id, 'LE');
  this.LENextServiceTime = getdepartsfromtimetable(this.service_date, this.LENextService, this.calendar_id);
  if (this.LENextServiceTime == '') {this.LENextServiceTimeString = '';} else {this.LENextServiceTimeString = moment(this.LENextServiceTime).format('HH:mm');};
  this.LENextTurnaround = getTurnaroundFrom2Times(this.arrives, this.LENextServiceTime);
  this.TMNextService = getStaffNextService(this.serviceId, this.calendar_id, 'TM');
  this.TMNextServiceTime = getdepartsfromtimetable(this.service_date, this.TMNextService, this.calendar_id);
  if (this.TMNextServiceTime == '') {this.TMNextServiceTimeString = '';} else {this.TMNextServiceTimeString = moment(this.TMNextServiceTime).format('HH:mm');};
  this.TMNextTurnaround = getTurnaroundFrom2Times(this.arrives, this.TMNextServiceTime);
  // pax count estimation
  this.passengerEstimation = getPaxAtStation(this.calendar_id, this.serviceId, this.line, this.prevTimedStation, this.direction);
  // generate Status Messages (used to be own method, but needed too many variables)
      let lowestTurnaround;
      let TurnaroundLabel;
      let stopProcessing = false;
      let StatusMessage = '';
      let TempStatus;
      let StatusArray = ['', '', '']; // this will be in the format of [0] = delays, [1] = tracking, [2] = stopped

      // filter out the non metlinks
      if (this.kiwirail) {
        TempStatus = 'Non-Metlink Service';
        StatusArray[0] = TempStatus;
        StatusArray[1] = TempStatus;
        if (StatusMessage == '' && stopProcessing == false) {StatusMessage = TempStatus;};
        stopProcessing = true;
      };
      // filter out things found from timetable
      if (this.linked_unit == '') {
        TempStatus = 'No Linked Unit';
        if (StatusMessage == '' && stopProcessing == false) {StatusMessage = TempStatus;};
        stopProcessing = true;
      };
      // filter already arrived trains
      if (this.laststation == this.destination) {
        TempStatus = 'Arriving';
        if (StatusMessage == '' && stopProcessing == false) {StatusMessage = TempStatus;};
        stopProcessing = true;
      }
      // the early/late status generation
      if (this.varianceFriendly < -1.5 && this.kiwirail == false) {
          TempStatus = 'Running Early';
          StatusArray[0] = TempStatus;
      } else if (this.varianceFriendly <5 && this.kiwirail == false) {
          TempStatus = 'Running Ok';
          StatusArray[0] = TempStatus;
      } else if (this.varianceFriendly <15 && this.kiwirail == false) {
          TempStatus = 'Running Late';
          StatusArray[0] = TempStatus;
      } else if (this.varianceFriendly >=15 && this.kiwirail == false) {
          TempStatus = 'Running Very Late';
          StatusArray[0] = TempStatus;
      };
      if (StatusMessage == '' && stopProcessing == false) {StatusMessage = TempStatus;};
      // compare turnarounds to lateness to look for issues
      if (((this.NextTurnaround != '') && (this.NextTurnaround < this.schedule_variance_min)) || ((this.LENextTurnaround != '') && (this.le_turnaround < this.schedule_variance_min)) || ((this.TMNextTurnaround != '') && (this.TMNextTurnaround < this.schedule_variance_min))) {
        TempStatus = 'Delay Risk:';

        if ((this.NextTurnaround < this.schedule_variance_min)) {
          TempStatus = TempStatus + ' Train';
        };
        if ((this.LENextTurnaround < this.schedule_variance_min)) {
          TempStatus = TempStatus + ' LE';
        };
        if ((this.TMNextTurnaround < this.schedule_variance_min)) {
          TempStatus = TempStatus + ' TM';
        };
        // check for negative turnarounds and just give an error status
        if ((this.NextTurnaround <0) || (this.LENextTurnaround < 0) || (this.TMNextTurnaround < 0)) {
          TempStatus = 'Timetravel Error';
        };
        if (stopProcessing == false) {StatusMessage = TempStatus;};
        stopProcessing = true;
      };
      // look at linking issues
      if (this.location_age_seconds >=180 && this.kiwirail == false) {
          TempStatus = '';
        // identify tunnel tracking issues and provide alternative status message
        if (this.direction == 'UP' && this.laststation == 'MAYM' && (this.location_age_seconds < 900) ) {
          TempStatus = 'In Rimutaka Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'UP' && this.laststation == 'UPPE' && (this.location_age_seconds < 900)) {
          TempStatus = 'In Rimutaka Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'DOWN' && this.laststation == 'FEAT' && (this.location_age_seconds < 900)) {
          TempStatus = 'In Rimutaka Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'DOWN' && this.laststation == 'TAKA' && (this.location_age_seconds < 600) && this.line == 'KPL') {
          TempStatus = 'In Tawa Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'UP' && this.laststation == 'KAIW' && (this.location_age_seconds < 600)  && this.line == 'KPL') {
          TempStatus = 'In Tawa Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'DOWN' && this.laststation == 'T2' && (this.location_age_seconds < 600) && this.line == 'KPL') {
          TempStatus = 'In Tunnel 1';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'UP' && this.laststation == 'T1' && (this.location_age_seconds < 600)  && this.line == 'KPL') {
          TempStatus = 'In Tunnel 2';
          StatusArray[1] = TempStatus;
        } else if (this.departed == false && TempStatus == '') {
          TempStatus = 'Awaiting Departure';
          StatusArray[0] = TempStatus;
          StatusArray[1] = TempStatus;
        } else {
          let first = {latitude: this.lat,
                     longitude: this.long };
          let sec = {latitude: this.second_unit_lat,
                     longitude: this.second_unit_long };
          if (distance(first, sec)>2000) {
            console.log('distance between units exceeds 2km');
            TempStatus = 'GPS Fault';
            StatusArray[1] = TempStatus;
          } else {
            TempStatus = 'Check OMS Linking';
            StatusArray[1] = TempStatus;
        };
        };
        if (stopProcessing == false) {StatusMessage = TempStatus;};
      };
      if (this.departed == false && this.kiwirail == false) {
        TempStatus = 'Awaiting Departure';
        StatusArray[0] = TempStatus;
        StatusArray[1] = TempStatus;
        StatusMessage = TempStatus;
        stopProcessing = true;
      };
      if (this.speed == 0 && this.laststationcurrent == false) {
        if (this.laststation == 'POMA' && this.origin == 'TAIT') {
          this.laststation = 'TAIT';
          TempStatus = 'In Storage Road';
          StatusArray[2] = TempStatus;
        } else if (this.laststation == 'TEHO' && this.origin == 'WAIK') {
          this.laststation = 'WAIK';
          TempStatus = 'In Turn Back Road';
          StatusArray[2] = TempStatus;
        } else {
          TempStatus = 'Stopped between stations';
          StatusArray[2] = TempStatus;
      };
      if (StatusMessage == '' && stopProcessing == false) {StatusMessage = TempStatus;};
      stopProcessing = true;
    };
      if (StatusMessage == 0 || StatusMessage == false || typeof StatusMessage == 'undefined') {
        StatusMessage = '';
      };

    this.statusMessage = StatusMessage;
    this.statusArray = StatusArray;

    this.web = function() {
      // generate slim version of service for transmition over web
      let servicelite = {
        service_id: this.serviceId,
        line: this.line,
        kiwirail: this.kiwirail,
        direction: this.direction,
        linked_unit: this.linked_unit,
        cars: this.cars,
        speed: this.speed,
        location_age: this.location_age,
        location_age_seconds: this.location_age_seconds,
        varianceFriendly: this.varianceFriendly,
        schedule_variance: this.schedule_variance,
        varianceKiwirail: this.varianceKiwirail,
        departs: this.departsString,
        origin: this.origin,
        arrives: this.arrivesString,
        destination: this.destination,
        laststation: this.laststation,
        laststationcurrent: this.laststationcurrent,
        LastService: this.LastService,
        NextService: this.NextService,
        NextTime: this.NextTimeString,
        LENextService: this.LENextService,
        LENextServiceTime: this.LENextServiceTimeString,
        TMNextService: this.TMNextService,
        TMNextServiceTime: this.TMNextServiceTimeString,
        passengerEstimation: this.passengerEstimation,
        statusMessage: this.statusMessage,
        statusArray: this.statusArray,
        lat: this.lat,
        long: this.long,
        meterage: this.meterage,
      };
      return servicelite;
    };

  // timetable lookup functions
  function getcarsfromtimetable(service_id, calendar_id) {
    let cars;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendar_id == calendar_id) {
        if (unitRoster[s].service_id == service_id) {
          cars = unitRoster[s].units * 2;
          break;
        }
      }
    };
    if (cars == '' || cars == 0 || typeof cars == 'undefined') {
      return '';
    } else {
    return cars;
    };
  };
  function getjourneyfromtimetable(service_id, calendar_id) {
    let journey = [];
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendar_id == calendar_id) {
        if (unitRoster[s].service_id == service_id) {
          journey = [unitRoster[s].journey_id, unitRoster[s].journey_order];
          break;
        }
      }
    };
    if (journey == '' || journey == 0 || typeof journey == 'undefined') {
      return ['', ''];
    } else {
    return journey;
    };
  };
  function getdepartsfromtimetable(service_date, service_id, calendar_id) {
    let departs;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (service_id == stopTimes[st].serviceId) {
        // get start and end time
        if (stopTimes[st].stationSequence == 0) {
          departs = TFP2M(stopTimes[st].departs);
          departs.set({'year': service_date.year(), 'month': service_date.month(), 'day': service_date.day()});
          break;
        };
      }};
    if (departs == '' || departs == 0 || typeof departs == 'undefined') {
      return '';
    } else {
    return departs;
    };
  };
  function getdepartedornot(CurrentTime, departuretime) {
    if (CurrentTime > departuretime) {
      return true;
    } else if (CurrentTime < departuretime) {
      return false;
    }
  }
  function getarrivesfromtimetable(service_date, service_id, calendar_id) {
    let arrives;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (service_id == stopTimes[st].serviceId) {
        // get start and end time
        if (st == stopTimes.length) {
          arrives = TFP2M(stopTimes[st].arrives);
          break;
        } else if (stopTimes[st+1] !== undefined && stopTimes[st+1].stationSequence == 0) {
          arrives = TFP2M(stopTimes[st].arrives);
          arrives.set({'year': service_date.year(), 'month': service_date.month(), 'day': service_date.day()});
          break;
        };
      }};
    if (arrives == '' || arrives == 0 || typeof arrives == 'undefined') {
      return '';
    } else {
    return arrives;
    };
  };
  function getorigin(service_id, description, kiwirailboolean, calendar_id) {
    let origin;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (service_id == stopTimes[st].serviceId) {
        // get start and end time
        if (stopTimes[st].stationSequence == 0) {
          origin = stopTimes[st].station;
          break;
        };
      }};
    if (kiwirailboolean && (origin == '' || origin == 0 || typeof origin == 'undefined')) {
      description = description.toUpperCase();
      if (description.substring(0, 8) == 'AUCKLAND') {
        origin = 'AUCK';
      };
      if (description.substring(0, 10) == 'WELLINGTON') {
        origin = 'WELL';
      };
      if (description.substring(0, 16) == 'PALMERSTON NORTH') {
        origin = 'PALM';
      };
      if (description.substring(0, 12) == 'MT MAUNGANUI') {
        origin = 'TAUR';
      };
      if (description.substring(0, 8) == 'HAMILTON') {
        origin = 'HAMI';
      };
      if (description.substring(0, 9) == 'MASTERTON') {
        origin = 'MAST';
      };
    };

    if (origin == '' || origin == 0 || typeof origin == 'undefined') {
      return '';
    } else {
    return origin;
    };
  };
  function getdestination(service_id, description, kiwirailboolean, calendar_id) {
    let destination;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (stopTimes[st].serviceId == service_id) {
        // get start and end time
        if (stopTimes[st+1] !== undefined && stopTimes[st+1].stationSequence == 0) {
          destination = stopTimes[st].station;
          break;
        };
      }};
    if (kiwirailboolean && (destination == '' || destination == 0 || typeof destination == 'undefined')) {

      description = description.toUpperCase();
      description = description.split('-');
      description = description[1].trim();
      if (description.substring(0, 8) == 'AUCKLAND') {
        destination = 'AUCK';
      };
      if (description.substring(0, 10) == 'WELLINGTON') {
        destination = 'WELL';
      };
      if (description.substring(0, 16) == 'PALMERSTON NORTH') {
        destination = 'PALM';
      };
      if (description.substring(0, 12) == 'MT MAUNGANUI') {
        destination = 'TAUR';
      };
      if (description.substring(0, 8) == 'HAMILTON') {
        destination = 'HAMI';
      };
      if (description.substring(0, 9) == 'MASTERTON') {
        destination = 'MAST';
      };
    };
    if (destination == '' || destination == 0 || typeof destination == 'undefined') {
      return '';
    } else {
    return destination;
    };
  };
  function getUnitNextService(service_id, calendar_id) {
    // trying to solve the 5 min to midnight error
    if (service_id == undefined || calendar_id == undefined) {return '';};
    let NextService;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendar_id == calendar_id && unitRoster[s].service_id == (service_id)) {
          if (unitRoster[s+1] !== undefined && unitRoster[s].journey_id == unitRoster[s+1].journey_id) {
            NextService = unitRoster[s+1].service_id;
          } else {
            NextService = '';
          };
      };
    };
    return NextService;
  };
  function getUnitLastService(service_id, calendar_id) {
    let LastService;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendar_id == calendar_id && unitRoster[s].service_id == (service_id)) {
          if (unitRoster[s-1] !== undefined && unitRoster[s].journey_id == unitRoster[s-1].journey_id) {
            LastService = unitRoster[s-1].service_id;
          } else {
            LastService = '';
          };
      };
    };
    return LastService;
  };
  function getStaffNextService(service_id, calendar_id, work_type) {
    let NextService;
    for (s = 0; s <masterRoster.length; s++) {
      if (masterRoster[s].calendarId == calendar_id && masterRoster[s].serviceID == (service_id) && masterRoster[s].workType == (work_type)) {
          if (masterRoster[s+1] !== undefined && masterRoster[s].shiftId == masterRoster[s+1].shiftId) {
            NextService = masterRoster[s+1].serviceID;
          } else {
            NextService = '';
          };
      };
    };
    return NextService;
  };
  function getTurnaroundFrom2Times(EndTime, StartTime) {
    if (EndTime == '' || StartTime == '') {return '';}
    let Turnaround = moment.duration(StartTime.diff(EndTime));
    if (Turnaround == NaN) {
      Turnaround = '';
    };

    return Math.floor(Turnaround);
  }
  // logical functions
  function getcalendaridfromservicedate(service_date) {
    let thisdate = new Date(service_date.substring(0, 4), service_date.substring(4, 6)-1, service_date.substring(6, 8));
    let calendar_id = '';
    for (e = 0; e < calendarexceptions.length; e++) {
      if (calendarexceptions[e].date == service_date) {
        calendar_id = calendarexceptions[e].calendar_id;
        break;
      };
    };
    if (calendar_id == '') {
      switch (thisdate.getDay()) {
        case 0:
          calendar_id = '1';
          break;
        case 1:
        case 2:
        case 3:
        case 4:
          calendar_id = '2345';
          break;
        case 5:
          calendar_id = '6';
          break;
        case 6:
          calendar_id = '7';
          break;
        default:
          calendar_id = '';
      };
    };
    return calendar_id;
  };
  function getlinefromserviceid(service_id, service_description) {
      let numcharId = '';
      let line = [];
      let freightdetect;
      if (typeof service_description !== 'undefined') {
        if (service_description.includes('FREIGHT')) {
          freightdetect = true;
        };
    };
      // looks for service id's with a random letter on the end
      // treat as a 3 digit
      for (p = 0; p < service_id.length; p++) {
          if (isNaN(service_id[p])) {
            numcharId = numcharId + 'C';
          } else {
            numcharId = numcharId + 'N';
          };
      };
      if (numcharId === 'NNNC') {
        service_id = service_id.substring(0, 3);
      }

      if (service_id.length == 4) {
        switch (service_id.substring(0, 2)) {
          case '12':
            line = ['PNL', true];
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
      }
      else if (service_id.length == 3) {
        switch (service_id.substring(0, 1)) {
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
  function getdirectionfromserviceid(serviceId) {
    let numcharId = '';
    // remove characters for odd even purposes
    for (p = 0; p < serviceId.length; p++) {
        if (isNaN(serviceId[p])) {
          numcharId = numcharId + 'C';
        } else {
          numcharId = numcharId + 'N';
        };
    };
    if (numcharId === 'NNNC') {
      serviceId = serviceId.substring(0, 3);
    }
    if (numcharId === 'CCNN') {
      serviceId = serviceId.substring(2, 4);
    }
    if (numcharId === 'CCN') {
      serviceId = serviceId.substring(2, 3);
    }
    if (numcharId === 'CNN') {
      serviceId = serviceId.substring(1, 3);
    }
    if (numcharId === 'CN') {
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
  function lineToKiwiRailLine(line) {
    let KRLine;
    switch (line) {
      case 'PNL':
      case 'KPL':
        KRLine = 'NIMT';
        break;
      case 'HVL':
      case 'WRL':
        KRLine = 'WRL';
        break;
      case 'MEL':
        KRLine = 'MEL';
        break;
      case 'JVL':
        KRLine = 'JVL';
        break;
      default:
        KRLine = '';
    }
    return KRLine;
  };
  function gevisvariancefix(schedule_variance) {
    let fixedvariance;
    if (schedule_variance < 0) {
      fixedvariance = Math.abs(schedule_variance);
    };
    if (schedule_variance == 0) {
      fixedvariance = 0;
    };
    if (schedule_variance > 0) {
      fixedvariance = 0 - schedule_variance;
    };
    return fixedvariance;
  };
  // mathematical functions
  function getmeterage(lat, long, KRline, line) {
    // finds closest and next closest points from records
    let position = {'coords':{'latitude': lat, 'longitude': long}};
    let locations = [];
    let location = {};
    for (l = 0; l < lineshapes.length; l++) {
      if (lineshapes[l].line_id == KRline) {
        location = {'latitude': lineshapes[l].lat, 'longitude': lineshapes[l].long, 'order': lineshapes[l].order, 'meterage':lineshapes[l].meterage};
        locations.push(location);
      };
    };
    if (typeof KRline == 'undefined' || KRline == '') {
      return '';
    }
    let point1 = locations[0];
    let point2 = locations[1];
    let closest;
    let nextclosest;
    let point1_distance = distance(point1, position.coords);
    let point2_distance = distance(point2, position.coords);

    for (i=1;i<locations.length;i++) {
        // cycle component
        // console.log(inbetween(point2,position.coords,point1));
        if (distance(locations[i], position.coords) < point1_distance) {
          // if((inbetween(point2,position.coords,point1) == false)){console.log("not inbetween");};
            // console.log("itterated " + point1.order);
             point2 = point1;
             point2_distance = point1_distance;
             point1 = locations[i];
             point1_distance = distance(locations[i], position.coords);

        // stopping component
        } else if (inbetween(point2, position.coords, point1)) {
          // stop
        } else {
          // keep on cycling
          point2 = point1;
          point2_distance = point1_distance;
          point1 = locations[i];
          point1_distance = distance(locations[i], position.coords);
        };
      };// (distance(locations[i],position.coords)>closest_distance && distance(locations[i],position.coords)<nextclosest_distance && (Math.abs(bearing(position.coords,closest) - bearing(position.coords,nextclosest)) >180)){

      if (distance(point1, position.coords) < distance(point2, position.coords)) {
        closest = point1;
        nextclosest = point2;
      } else {
        closest = point2;
        nextclosest = point1;
      };
      // console.log("closest = " + closest);
      // if(line == "JVL"){console.log(closest.order + " "+ nextclosest.order)};
      // if(line == "WRL" && closest.order > 110){console.log(closest.order + " "+ nextclosest.order)};

    // console.log(closest.order +" " + nextclosest.order);
    // checks the order (direction) of the points selected
    if (closest.order < nextclosest.order) {
      // beyond closest meterage
      var XX = nextclosest.latitude - closest.latitude;
      var YY = nextclosest.longitude - closest.longitude;
      var ShortestLength = ((XX * (position.coords.latitude - closest.latitude)) + (YY * (position.coords.longitude - closest.longitude))) / ((XX * XX) + (YY * YY));
      var Vlocation = {'latitude': (closest.latitude + XX * ShortestLength), 'longitude': (closest.longitude + YY * ShortestLength)};
      meterage = closest.meterage + distance(Vlocation, closest);
    } else {
      // behind closest meterage
      var XX = closest.latitude - nextclosest.latitude;
      var YY = closest.longitude - nextclosest.longitude;
      var ShortestLength = ((XX * (position.coords.latitude - nextclosest.latitude)) + (YY * (position.coords.longitude - nextclosest.longitude))) / ((XX * XX) + (YY * YY));
      var Vlocation = {'latitude': (nextclosest.latitude + XX * ShortestLength), 'longitude': (nextclosest.longitude + YY * ShortestLength)};
      meterage = closest.meterage - distance(Vlocation, closest);
    };
    return meterage;
    };
  function inbetween(position1, position2, position3) {
      // function determines if position 2 is inbetween 1 & 3
      let AB = bearing(position2, position1);
      let BC = bearing(position2, position3);
      let BCZero = BC - AB;
      if (BCZero > -90 && BCZero < 90) {
        return false;
      } else {
        return true;
      }
    };
  function distance(position1, position2) {
    let lat1=position1.latitude;
    let lat2=position2.latitude;
    let lon1=position1.longitude;
    let lon2=position2.longitude;
    let R = 6371000; // radius of earth in metres
    let φ1 = lat1 * Math.PI / 180;
    let φ2 = lat2 * Math.PI / 180;
    let Δφ = (lat2-lat1) * Math.PI / 180;
    let Δλ = (lon2-lon1) * Math.PI / 180;

    let a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    let d = R * c;
    return d;
  };
  function bearing(position1, position2) {
    let lat1=position1.latitude;
    let lat2=position2.latitude;
    let lon1=position1.longitude;
    let lon2=position2.longitude;
    let R = 6371000; // radius of earth in metres
    let φ1 = lat1 * Math.PI / 180;
    let φ2 = lat2 * Math.PI / 180;
    let λ1 = lon1 * Math.PI / 180;
    let λ2 = lon2 * Math.PI / 180;

    let y = Math.sin(λ2-λ1) * Math.cos(φ2);
    let x = Math.cos(φ1)*Math.sin(φ2) -
            Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    let brng = Math.atan2(y, x) * 180 / Math.PI;

    return brng;
  };
  // high level functions
  function getlaststation(lat, lon, meterage, KRLine, direction) {
    // code to check and determine if at stations
  	let thisid, thisnorth, thiswest, thissouth, thiseast;
    let laststation = ['', false];

    // checks lat long for current stations first
    for (j = 0; j < StationGeoboundaries.length; j++) {
      thisid = StationGeoboundaries[j].station_id;
      thisnorth = StationGeoboundaries[j].north;
      thiswest = StationGeoboundaries[j].west;
      thissouth = StationGeoboundaries[j].south;
      thiseast = StationGeoboundaries[j].east;

      if (lon > thiswest & lon < thiseast & lat < thisnorth & lat > thissouth) {
        laststation = [thisid, true];
        break;
      }};
    // works out last station based on line, direction and meterage
    if (!laststation[1]) {
      for (m = 0; m < StationMeterage.length; m++) {
        if (StationMeterage[m].KRLine == KRLine) {
          if (direction == 'UP') {
            if (StationMeterage[m-1] !== undefined && StationMeterage[m].meterage >= meterage) {
              laststation = [StationMeterage[m-1].station_id, false];
              break;
            }
          };
          if (direction == 'DOWN') {
            if (StationMeterage[m].meterage >= meterage) {
              laststation = [StationMeterage[m].station_id, false];
              break;
            }
          };
        };
      }
    };
    return laststation;
    };
  function getPrevStnDetails(service_date, meterage, direction, service_id) {
    let prevstation;
    let prevtime;
    let prevmeterage;
    for (st = 0; st < stopTimes.length; st++) {
      if (direction == 'UP') {
        if (stopTimes[st].serviceId == service_id && getMeterageOfStation(stopTimes[st].station) < meterage) {
          prevstation = stopTimes[st].station;
          prevtime = TFP2M(stopTimes[st].departs);
          prevmeterage = getMeterageOfStation(stopTimes[st].station);
        };
    } else if (direction == 'DOWN') {
          if (stopTimes[st].serviceId == service_id && getMeterageOfStation(stopTimes[st].station) > meterage) {
              prevstation = stopTimes[st].station;
              prevtime = TFP2M(stopTimes[st].departs);
              prevmeterage = getMeterageOfStation(stopTimes[st].station);
          }
      }}
        if (prevtime == undefined) {
          console.log(prevstation + ' ' + service_id);
        }
          return [prevtime, prevmeterage, prevstation];
        };
  function getNextStnDetails(service_date, meterage, direction, service_id) {
    let nextstation;
    let nexttime;
    let nextmeterage;
    for (st = 0; st < stopTimes.length; st++) {
      if (direction == 'UP') {
          if (stopTimes[st].serviceId == service_id && getMeterageOfStation(stopTimes[st].station) > meterage) {
              nextstation = stopTimes[st].station;
              nexttime = TFP2M(stopTimes[st].departs);
              nextmeterage = getMeterageOfStation(stopTimes[st].station);
              break;
          }
      } else {
        if (stopTimes[st].serviceId == service_id && getMeterageOfStation(stopTimes[st].station) < meterage) {
            nextstation = stopTimes[st].station;
            nexttime = TFP2M(stopTimes[st].departs);
            nextmeterage = getMeterageOfStation(stopTimes[st].station);
            break;
        }
      }}
        return [nexttime, nextmeterage, nextstation];
      };
  function getMeterageOfStation(station_id) {
    for (sm = 0; sm < StationMeterage.length; sm++) {
      if (station_id == StationMeterage[sm].station_id) {
        return StationMeterage[sm].meterage;
      }}
    };
  function getScheduleVariance(kiwirail, currenttime, service_date, meterage, prevstntime, nextstntime, prevstnmeterage, nextstnmeterage, location_age_seconds) {
    if (kiwirail == false && prevstntime !== undefined && nextstntime !== undefined && prevstnmeterage !== undefined) {
      let ExpectedTime = moment(prevstntime + (nextstntime-prevstntime) * ((meterage - prevstnmeterage) / (nextstnmeterage - prevstnmeterage)));
      let CurrentDelay = moment(currenttime.diff(ExpectedTime));
      CurrentDelay.subtract(location_age_seconds, 'seconds');
      CurrentDelay = (CurrentDelay /60000);
      return [CurrentDelay, minTommss(CurrentDelay)];
    } else {
      return ['', ''];
    }
  };
  // small time functions
  function minTommss(minutes) {
   let sign = minutes < 0 ? '-' : '';
   let min = Math.floor(Math.abs(minutes));
   let sec = Math.floor((Math.abs(minutes) * 60) % 60);
   return sign + (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function getUTCTodayfromTimeDate(thistime, thisdate) {
    let seconds = parseInt(thistime.split(':')[0])*60*60 + (parseInt(thistime.split(':')[1])*60);
    let now = new Date(thisdate.substring(0, 4), (thisdate.substring(4, 6)-1), thisdate.substring(6, 8));
    let today = now.getTime() + (seconds * 1000);
    return today;
  };
  function calendarIDfromDate(DateMoment) {
      // get current caledar_id for timetable search
      let thisdate = DateMoment;
      let calendar_id = '';
      for (e = 0; e < calendarexceptions.length; e++) {
        if (moment(calendarexceptions[e].date) == thisdate) {
          calendar_id = calendarexceptions[e].calendar_id;
          break;
        };
      };
      if (calendar_id == '') {
        switch (thisdate.weekday()) {
          case 0:
            calendar_id = '1';
            break;
          case 1:
          case 2:
          case 3:
          case 4:
            calendar_id = '2345';
            break;
          case 5:
            calendar_id = '6';
            break;
          case 6:
            calendar_id = '7';
            break;
          default:
            calendar_id = '';
        };
      };
      return calendar_id;
  };
  function TFP2M(TwentyFourPlusString) {
    // TwentyFourPlusStringToMoment
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
    if (isNaN(NewSeconds) == false) {  thisMoment.set('second', NewSeconds); }
    else {thisMoment.set('seconds', 0);
        thisMoment.set('miliseconds', 0);
      };
    return thisMoment;
  }
};
