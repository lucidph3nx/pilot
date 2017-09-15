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
                                  serviceDate,
                                  serviceDescription,
                                  linkedUnit,
                                  secondUnit,
                                  secondUnitLat, secondUnitLon,
                                  speed, compass,
                                  locationAge,
                                  varianceKiwirail,
                                  lat, lon,
                                  currentRoster) {
  this.currenttime = moment(CurrentMoment);
  this.serviceId = serviceId.trim();
  this.serviceDescription = serviceDescription.trim();
  this.serviceDate = moment(serviceDate.trim(), 'YYYYMMDD');
  this.calendarId = calendarIdFromDate(this.serviceDate);
  this.line = getlinefromserviceid(this.serviceId)[0];
  this.kiwirail = getlinefromserviceid(this.serviceId, serviceDescription)[1];
  this.direction = getdirectionfromserviceid(this.serviceId);
  this.KRline = lineToKiwiRailLine(this.line);
  this.linkedUnit = linkedUnit.trim();
  // if linked unit is track machine, this.kiwirail is true
  if (this.linkedUnit.substring(0, 3) == 'ETM') {
    this.kiwirail = true;
  };
  this.secondUnit = secondUnit;
  this.secondUnitLat = secondUnitLat;
  this.secondUnitLon = secondUnitLon;
  this.cars = getCarsUnitRoster(this.serviceId, this.calendarId);
  this.journeyId = getJourneyUnitRoster(this.serviceId, this.calendarId)[0];
  this.journeyOrder = getJourneyUnitRoster(this.serviceId, this.calendarId)[1];
  this.speed = speed;
  this.compass = compass;
  this.moving = (speed >= 1);
  this.location_age = locationAge;
  this.location_age_seconds =
    parseInt(this.location_age.toString().split(':')[0]*60) +
    parseInt(this.location_age.toString().split(':')[1]);
  this.varianceKiwirail = gevisvariancefix(varianceKiwirail);
  this.departs = getdepartsfromtimetable(this.serviceDate,
                                         this.serviceId,
                                         this.calendarId);
  if (this.departs == '') {
    this.departsString = '';
  } else {
    this.departsString = moment(this.departs).format('HH:mm');
  };
  this.departed = getdepartedornot(this.currenttime, this.departs);
  this.arrives = getarrivesfromtimetable(this.serviceDate,
                                         this.serviceId,
                                         this.calendarId);
  if (this.arrives == '') {
    this.arrivesString = '';
  } else {
    this.arrivesString = moment(this.arrives).format('HH:mm');
  };
  this.origin = getorigin(this.serviceId,
                          this.serviceDescription,
                          this.kiwirail,
                          this.calendarId);
  this.destination = getdestination(this.serviceId,
                                    this.serviceDescription,
                                    this.kiwirail,
                                    this.calendarId);
  this.lat = lat;
  this.lon = lon;
  this.meterage = getmeterage(this.lat, this.lon,
                              this.KRline,
                              this.line, this.direction);
  let lastStationDetails = getlaststation(this.lat, this.lon,
                                          this.meterage,
                                          this.KRline, this.direction);
  this.laststation = lastStationDetails[0];
  this.laststationcurrent = lastStationDetails[1];
  // variables needed to calculate own delay
  let previousStationDetails = getPrevStnDetails(this.serviceDate,
                                                 this.meterage,
                                                 this.direction,
                                                 this.serviceId);
  let nextStationDetails = getNextStnDetails(this.serviceDate,
                                             this.meterage,
                                             this.direction,
                                             this.serviceId);
  this.prevTimedStation = previousStationDetails[2];
  this.prevstntime = previousStationDetails[0];
  this.nextstntime = nextStationDetails[0];
  this.prevstnmeterage = previousStationDetails[1];
  this.nextstnmeterage = nextStationDetails[1];
  // different setup if we are using dummy data for debug
  if (dummydata) {
    this.schedule_variance = this.varianceKiwirail;
    this.schedule_variance_min = this.varianceKiwirail;
    this.varianceFriendly = this.varianceKiwirail;
  } else {
    let scheduleVariance = getScheduleVariance(this.kiwirail,
                                               this.currenttime,
                                               this.serviceDate,
                                               this.meterage,
                                               this.prevstntime,
                                               this.nextstntime,
                                               this.prevstnmeterage,
                                               this.nextstnmeterage,
                                               this.location_age_seconds);
    this.schedule_variance = scheduleVariance[1];
    this.schedule_variance_min = scheduleVariance[0];
    if (this.schedule_variance_min == '') {
      this.varianceFriendly = this.varianceKiwirail;
    } else {
      this.varianceFriendly = (this.schedule_variance_min).toFixed(0);
      if (this.varianceFriendly == -0) {
        this.varianceFriendly = 0;
      };
    }
    };
  // prev service
  this.LastService = getUnitLastService(this.serviceId, this.calendarId);
  // next service details
  this.NextService = getUnitNextService(this.serviceId, this.calendarId);
  this.NextTime = getdepartsfromtimetable(this.serviceDate,
                                          this.NextService,
                                          this.calendarId);
  if (this.NextTime == '') {
    this.NextTimeString = '';
  } else {
    this.NextTimeString = moment(this.NextTime).format('HH:mm');
  };
  this.NextTurnaround = getTurnaroundFrom2Times(this.arrives, this.NextTime);
  // staff next service details
  this.LENextService = getStaffNextService(this.serviceId,
                                           this.calendarId,
                                           'LE');
  this.LENextServiceTime = getdepartsfromtimetable(this.serviceDate,
                                                   this.LENextService,
                                                   this.calendarId);
  if (this.LENextServiceTime == '') {
    this.LENextServiceTimeString = '';
  } else {
    this.LENextServiceTimeString = moment(this.LENextServiceTime).format('HH:mm');
  };
  this.LENextTurnaround = getTurnaroundFrom2Times(this.arrives, this.LENextServiceTime);
  this.TMNextService = getStaffNextService(this.serviceId, this.calendarId, 'TM');
  this.TMNextServiceTime = getdepartsfromtimetable(this.serviceDate, this.TMNextService, this.calendarId);
  if (this.TMNextServiceTime == '') {
    this.TMNextServiceTimeString = '';
  } else {
    this.TMNextServiceTimeString = moment(this.TMNextServiceTime).format('HH:mm');
  };
  this.TMNextTurnaround = getTurnaroundFrom2Times(this.arrives, this.TMNextServiceTime);
  this.trainManagerShift = getStaffShift(this.serviceId, this.calendarId, 'TM');
  this.locomotiveEngineerShift = getStaffShift(this.serviceId, this.calendarId, 'LE');
  this.trainManager = getStaffFromVDSRoster(this.trainManagerShift, currentRoster);
  this.locomotiveEngineer = getStaffFromVDSRoster(this.locomotiveEngineerShift, currentRoster);
  // pax count estimation
  this.passengerEstimation = getPaxAtStation(this.calendarId, this.serviceId, this.line, this.prevTimedStation, this.direction);

  // generate Status Messages
  // used to be own function, but needed too many variables
      let stopProcessing = false;
      let StatusMessage = '';
      let TempStatus;
      // this will be in the format of [0] = delays,
      //                               [1] = tracking,
      //                               [2] = stopped
      let StatusArray = ['', '', ''];

      // filter out the non metlinks
      if (this.kiwirail) {
        TempStatus = 'Non-Metlink Service';
        StatusArray[0] = TempStatus;
        StatusArray[1] = TempStatus;
        if (StatusMessage == '' && stopProcessing == false) {
          StatusMessage = TempStatus;
        };
        stopProcessing = true;
      };
      // filter out things found from timetable
      if (this.linkedUnit == '') {
        TempStatus = 'No Linked Unit';
        if (StatusMessage == '' && stopProcessing == false) {
          StatusMessage = TempStatus;
        };
        stopProcessing = true;
      };
      // filter already arrived trains
      if (this.laststation == this.destination) {
        TempStatus = 'Arriving';
        if (StatusMessage == '' && stopProcessing == false) {
          StatusMessage = TempStatus;
        };
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
      if (StatusMessage == '' && stopProcessing == false) {
        StatusMessage = TempStatus;
      };
      // compare turnarounds to lateness to look for issues
      if (((this.NextTurnaround != '')
        && (this.NextTurnaround < this.schedule_variance_min))
      || ((this.LENextTurnaround != '')
          && (this.le_turnaround < this.schedule_variance_min))
      || ((this.TMNextTurnaround != '')
          && (this.TMNextTurnaround < this.schedule_variance_min))) {
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
        if ((this.NextTurnaround < 0)
          || (this.LENextTurnaround < 0)
          || (this.TMNextTurnaround < 0)) {
          TempStatus = 'Timetravel Error';
        };
        if (stopProcessing == false) {
          StatusMessage = TempStatus;
        };
        stopProcessing = true;
      };
      // look at linking issues
      if (this.location_age_seconds >=180 && this.kiwirail == false) {
          TempStatus = '';
        // identify tunnel tracking issues
        if (this.direction == 'UP' &&
            this.laststation == 'MAYM' &&
            this.location_age_seconds < 900) {
          TempStatus = 'In Rimutaka Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'UP' &&
                   this.laststation == 'UPPE' &&
                   this.location_age_seconds < 900) {
          TempStatus = 'In Rimutaka Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'DOWN' &&
                   this.laststation == 'FEAT' &&
                   this.location_age_seconds < 900) {
          TempStatus = 'In Rimutaka Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'DOWN' &&
                   this.laststation == 'TAKA' &&
                   this.location_age_seconds < 600 &&
                   this.line == 'KPL') {
          TempStatus = 'In Tawa Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'UP' &&
                   this.laststation == 'KAIW' &&
                   this.location_age_seconds < 600 &&
                   this.line == 'KPL') {
          TempStatus = 'In Tawa Tunnel';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'DOWN' &&
                   this.laststation == 'T2' &&
                   this.location_age_seconds < 600 &&
                   this.line == 'KPL') {
          TempStatus = 'In Tunnel 1';
          StatusArray[1] = TempStatus;
        } else if (this.direction == 'UP' &&
                   this.laststation == 'T1' &&
                   this.location_age_seconds < 600 &&
                   this.line == 'KPL') {
          TempStatus = 'In Tunnel 2';
          StatusArray[1] = TempStatus;
        } else if (this.departed == false && TempStatus == '') {
          TempStatus = 'Awaiting Departure';
          StatusArray[0] = TempStatus;
          StatusArray[1] = TempStatus;
        } else if (secondUnit !== '') {
          let first = {latitude: this.lat,
                     longitude: this.lon};
          let sec = {latitude: this.secondUnitLat,
                     longitude: this.secondUnitLon};
          if (distance(first, sec)>2000) {
            console.log('distance between units exceeds 2km');
            TempStatus = 'GPS Fault';
            StatusArray[1] = TempStatus;
          } else {
            TempStatus = 'Check OMS Linking';
            StatusArray[1] = TempStatus;
        };
        };
        if (stopProcessing == false) {
          StatusMessage = TempStatus;
        };
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
      if (StatusMessage == '' && stopProcessing == false) {
        StatusMessage = TempStatus;
      };
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
        serviceId: this.serviceId,
        line: this.line,
        kiwirail: this.kiwirail,
        direction: this.direction,
        linked_unit: this.linkedUnit,
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
        LE: this.locomotiveEngineer,
        LENextService: this.LENextService,
        LENextServiceTime: this.LENextServiceTimeString,
        TM: this.trainManager,
        TMNextService: this.TMNextService,
        TMNextServiceTime: this.TMNextServiceTimeString,
        passengerEstimation: this.passengerEstimation,
        statusMessage: this.statusMessage,
        statusArray: this.statusArray,
        lat: this.lat,
        long: this.lon,
        meterage: this.meterage,
      };
      return servicelite;
    };

  /**
   *performs a look up of the Unit Roster to get the number of cars
   * @param {string} serviceId 
   * @param {string} calendarId 
   * @return {integer} - number of cars
   */
  function getCarsUnitRoster(serviceId, calendarId) {
    let cars;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendarId == calendarId) {
        if (unitRoster[s].serviceId == serviceId) {
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
  /**
   * performs a look up of the Unit Roster to get the Journey Id and Order
   * @param {string} serviceId 
   * @param {string} calendarId 
   * @return {string}
   */
  function getJourneyUnitRoster(serviceId, calendarId) {
    let journey = [];
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendarId == calendarId) {
        if (unitRoster[s].serviceId == serviceId) {
          journey = [unitRoster[s].journeyId, unitRoster[s].journeyOrder];
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
  /**
   * Looks up timetable for departure time
   * @param {object} serviceDate - Moment Object
   * @param {string} serviceId
   * @param {string} calendarId - 1/2345/6/7
   * @return {object} - departure time moment object
   */
  function getdepartsfromtimetable(serviceDate, serviceId, calendarId) {
    let departs;
    for (st = 0; st < stopTimes.length; st++) {
      if (serviceId == stopTimes[st].serviceId) {
        // get start and end time
        if (stopTimes[st].stationSequence == 0) {
          departs = twp2m(stopTimes[st].departs);
          departs.set({'year': serviceDate.year(),
                       'month': serviceDate.month(),
                       'day': serviceDate.day()});
          // fixes some time travel errors, not an elegant solution
          if (departs.hour() < 3 && serviceDate.day() !== moment().day()) {
            departs.add(1, 'day');
          }
          break;
        };
      };
    };
    if (departs == '' || departs == 0 || typeof departs == 'undefined') {
      return '';
    } else {
    return departs;
    };
  };
  /**
   * finds out if service
   * has departed or not
   * @param {object} CurrentTime - moment Object
   * @param {object} departureTime - moment Object
   * @return {boolean}
   */
  function getdepartedornot(CurrentTime, departureTime) {
    if (CurrentTime > departureTime) {
      return true;
    } else if (CurrentTime < departureTime) {
      return false;
    }
  }
  function getarrivesfromtimetable(serviceDate, serviceId, calendarId) {
    let arrives;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (serviceId == stopTimes[st].serviceId) {
        // get start and end time
        if (st == stopTimes.length) {
          arrives = twp2m(stopTimes[st].arrives);
          break;
        } else if (stopTimes[st+1] !== undefined && stopTimes[st+1].stationSequence == 0) {
          arrives = twp2m(stopTimes[st].arrives);
          arrives.set({'year': serviceDate.year(),
                       'month': serviceDate.month(),
                       'day': serviceDate.day()});
          // fixes some time travel errors, not an elegant solution
          if (arrives.hour() < 3 && serviceDate.day() !== moment().day()) {
            arrives.add(1, 'day');
          }
          break;
        };
      }};
    if (arrives == '' || arrives == 0 || typeof arrives == 'undefined') {
      return '';
    } else {
    return arrives;
    };
  };
  function getorigin(serviceId, description, kiwirailBoolean, calendarId) {
    let origin;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (serviceId == stopTimes[st].serviceId) {
        // get start and end time
        if (stopTimes[st].stationSequence == 0) {
          origin = stopTimes[st].station;
          break;
        };
      }};
    if (kiwirailBoolean && (origin == '' || origin == 0 || typeof origin == 'undefined')) {
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
  function getdestination(serviceId, description, kiwirailBoolean, calendarId) {
    let destination;
    for (st = 0; st < stopTimes.length; st++) {
      // console.log (ts + " & " + st);
      if (stopTimes[st].serviceId == serviceId) {
        // get start and end time
        if (stopTimes[st+1] !== undefined && stopTimes[st+1].stationSequence == 0) {
          destination = stopTimes[st].station;
          break;
        };
      }};
    if (kiwirailBoolean && (destination == '' || destination == 0 || typeof destination == 'undefined')) {

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
  /**
   * searches a current roster object
   * returns actual staff names
   * @param {string} shiftId
   * @param {array} currentRoster
   * @return {string}
   */
  function getStaffFromVDSRoster(shiftId, currentRoster) {
    let staff = '';
    if (currentRoster == undefined || currentRoster.length == 0) {
      return staff;
    };
    for (s = 0; s < currentRoster.length; s++) {
      if (currentRoster[s].shiftId == shiftId) {
        staff = currentRoster[s].staffName;
      };
    };
    return staff;
  };


  function getUnitNextService(serviceId, calendarId) {
    // trying to solve the 5 min to midnight error
    if (serviceId == undefined || calendarId == undefined) {
      return '';
    };
    let NextService;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendarId == calendarId && unitRoster[s].serviceId == (serviceId)) {
          if (unitRoster[s+1] !== undefined && unitRoster[s].journeyId == unitRoster[s+1].journeyId) {
            NextService = unitRoster[s+1].serviceId;
          } else {
            NextService = '';
          };
      };
    };
    return NextService;
  };
  function getUnitLastService(serviceId, calendarId) {
    let LastService;
    for (s = 0; s <unitRoster.length; s++) {
      if (unitRoster[s].calendarId == calendarId && unitRoster[s].serviceId == (serviceId)) {
          if (unitRoster[s-1] !== undefined && unitRoster[s].journeyId == unitRoster[s-1].journeyId) {
            LastService = unitRoster[s-1].serviceId;
          } else {
            LastService = '';
          };
      };
    };
    return LastService;
  };
    /**
     * Takes some details and gets the shiftID from roster
     * @param {string} serviceId 
     * @param {string} calendarId 
     * @param {string} workType - LE/TM/whatever
     * @return {string} - shiftID
     */
    function getStaffShift(serviceId, calendarId, workType) {
    let staffShift = '';
    for (s = 0; s <masterRoster.length; s++) {
      if (masterRoster[s].calendarId == calendarId &&
        masterRoster[s].serviceID == (serviceId) &&
        masterRoster[s].workType == (workType)) {
            staffShift = masterRoster[s].shiftId;
      };
    };
    return staffShift;
  };
  function getStaffNextService(serviceId, calendarId, workType) {
    let NextService;
    for (s = 0; s <masterRoster.length; s++) {
      if (masterRoster[s].calendarId == calendarId && masterRoster[s].serviceID == (serviceId) && masterRoster[s].workType == (workType)) {
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
  function getlinefromserviceid(serviceId, serviceDescription) {
      let numcharId = '';
      let line = [];
      let freightdetect;
      if (typeof serviceDescription !== 'undefined') {
        if (serviceDescription.includes('FREIGHT')) {
          freightdetect = true;
        };
    };
      // looks for service id's with a random letter on the end
      // treat as a 3 digit
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

      if (serviceId.length == 4) {
        switch (serviceId.substring(0, 2)) {
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
   * Take a service Id and extrapolates
   * the direction UP/DOWN
   * @param {string} serviceId 
   * @return {string} 'UP' or 'DOWN'
   */
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

  /**
   * Takes a line and coverts it to
   * the corresponding KiwiRail line
   * @param {string} line 
   * @return {string} - KiwiRail Line
   */
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

  function gevisvariancefix(scheduleVariance) {
    let fixedvariance;
    if (scheduleVariance < 0) {
      fixedvariance = Math.abs(scheduleVariance);
    };
    if (scheduleVariance == 0) {
      fixedvariance = 0;
    };
    if (scheduleVariance > 0) {
      fixedvariance = 0 - scheduleVariance;
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
    let point1Distance = distance(point1, position.coords);
    let point2Distance = distance(point2, position.coords);

    for (i=1; i<locations.length; i++) {
        // cycle component
        // console.log(inbetween(point2,position.coords,point1));
        if (distance(locations[i], position.coords) < point1Distance) {
          // if((inbetween(point2,position.coords,point1) == false)){console.log("not inbetween");};
            // console.log("itterated " + point1.order);
             point2 = point1;
             point2Distance = point1Distance;
             point1 = locations[i];
             point1Distance = distance(locations[i], position.coords);

        // stopping component
        } else if (inbetween(point2, position.coords, point1)) {
          // stop
        } else {
          // keep on cycling
          point2 = point1;
          point2Distance = point1Distance;
          point1 = locations[i];
          point1Distance = distance(locations[i], position.coords);
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
      let XX = nextclosest.latitude - closest.latitude;
      let YY = nextclosest.longitude - closest.longitude;
      let ShortestLength = ((XX * (position.coords.latitude - closest.latitude)) + (YY * (position.coords.longitude - closest.longitude))) / ((XX * XX) + (YY * YY));
      let Vlocation = {'latitude': (closest.latitude + XX * ShortestLength), 'longitude': (closest.longitude + YY * ShortestLength)};
      meterage = closest.meterage + distance(Vlocation, closest);
    } else {
      // behind closest meterage
      let XX = closest.latitude - nextclosest.latitude;
      let YY = closest.longitude - nextclosest.longitude;
      let ShortestLength = ((XX * (position.coords.latitude - nextclosest.latitude)) + (YY * (position.coords.longitude - nextclosest.longitude))) / ((XX * XX) + (YY * YY));
      let Vlocation = {'latitude': (nextclosest.latitude + XX * ShortestLength), 'longitude': (nextclosest.longitude + YY * ShortestLength)};
      meterage = closest.meterage - distance(Vlocation, closest);
    };
    return Math.floor(meterage);
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

  /** looks at location on line and works out
   *  given the direction,
   *  what the previous station would be
   * @param {number} lat - Lattitude
   * @param {number} lon - Longitude
   * @param {number} meterage - meters from origin
   * @param {string} KRLine - the KiwiRail line
   * @param {string} direction - 'UP' or 'DOWN'
   * @return {string} - 4 char station ID
   */
  function getlaststation(lat, lon, meterage, KRLine, direction) {
    // code to check and determine if at stations
    let thisId;
    let thisNorth;
    let thisWest;
    let thisSouth;
    let thisEast;
    let lastStation = ['', false];

    // checks lat long for current stations first
    for (j = 0; j < StationGeoboundaries.length; j++) {
      thisId = StationGeoboundaries[j].station_id;
      thisNorth = StationGeoboundaries[j].north;
      thisWest = StationGeoboundaries[j].west;
      thisSouth = StationGeoboundaries[j].south;
      thisEast = StationGeoboundaries[j].east;

      if (lon > thisWest & lon < thisEast & lat < thisNorth & lat > thisSouth) {
        lastStation = [thisId, true];
        break;
      }
    };
    // works out last station based on line, direction and meterage
    if (!lastStation[1]) {
      for (m = 0; m < StationMeterage.length; m++) {
        if (StationMeterage[m].KRLine == KRLine) {
          if (direction == 'UP') {
            if (StationMeterage[m-1] !== undefined && StationMeterage[m].meterage >= meterage) {
              lastStation = [StationMeterage[m-1].station_id, false];
              break;
            }
          };
          if (direction == 'DOWN') {
            if (StationMeterage[m].meterage >= meterage) {
              lastStation = [StationMeterage[m].station_id, false];
              break;
            }
          };
        };
      }
    };
    return lastStation;
    };
  function getPrevStnDetails(serviceDate, meterage, direction, serviceId) {
    let prevstation;
    let prevtime;
    let prevmeterage;
    for (st = 0; st < stopTimes.length; st++) {
      if (direction == 'UP') {
        if (stopTimes[st].serviceId == serviceId && getMeterageOfStation(stopTimes[st].station) < meterage) {
          prevstation = stopTimes[st].station;
          prevtime = twp2m(stopTimes[st].departs);
          prevmeterage = getMeterageOfStation(stopTimes[st].station);
        };
    } else if (direction == 'DOWN') {
          if (stopTimes[st].serviceId == serviceId && getMeterageOfStation(stopTimes[st].station) > meterage) {
              prevstation = stopTimes[st].station;
              prevtime = twp2m(stopTimes[st].departs);
              prevmeterage = getMeterageOfStation(stopTimes[st].station);
          }
      }
    }
    return [prevtime, prevmeterage, prevstation];
  };
  function getNextStnDetails(serviceDate, meterage, direction, serviceId) {
    let nextstation;
    let nexttime;
    let nextmeterage;
    for (st = 0; st < stopTimes.length; st++) {
      if (direction == 'UP') {
          if (stopTimes[st].serviceId == serviceId && getMeterageOfStation(stopTimes[st].station) > meterage) {
              nextstation = stopTimes[st].station;
              nexttime = twp2m(stopTimes[st].departs);
              nextmeterage = getMeterageOfStation(stopTimes[st].station);
              break;
          }
      } else {
        if (stopTimes[st].serviceId == serviceId && getMeterageOfStation(stopTimes[st].station) < meterage) {
            nextstation = stopTimes[st].station;
            nexttime = twp2m(stopTimes[st].departs);
            nextmeterage = getMeterageOfStation(stopTimes[st].station);
            break;
        }
      }}
        return [nexttime, nextmeterage, nextstation];
      };
  function getMeterageOfStation(stationId) {
    for (sm = 0; sm < StationMeterage.length; sm++) {
      if (stationId == StationMeterage[sm].station_id) {
        return StationMeterage[sm].meterage;
      }}
    };
  function getScheduleVariance(kiwirailBoolean, currentTime, serviceDate, meterage, prevStationTime, nextStationTime, prevStationMeterage, nextStationMeterage, locationAgeSeconds) {
    if (kiwirailBoolean == false && prevStationTime !== undefined && nextStationTime !== undefined && prevStationMeterage !== undefined) {
      let ExpectedTime = moment(prevStationTime + (nextStationTime-prevStationTime) * ((meterage - prevStationMeterage) / (nextStationMeterage - prevStationMeterage)));
      let CurrentDelay = moment(currentTime.diff(ExpectedTime));
      CurrentDelay.subtract(locationAgeSeconds, 'seconds');
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
  function calendarIdFromDate(DateMoment) {
      // get current caledar_id for timetable search
      let thisdate = DateMoment;
      let calendarId = '';
      for (e = 0; e < calendarexceptions.length; e++) {
        if (moment(calendarexceptions[e].date) == thisdate) {
          calendarId = calendarexceptions[e].calendarId;
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
   * Takes a time string in the form HH:mm(:ss)
   * Times can be greater than 24 hour
   * Converts it into a moment object
   * @param {string} TwentyFourPlusString 
   * @return {object} - Moment object
   */
  function twp2m(TwentyFourPlusString) {
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
    };
    thisMoment.set('miliseconds', 0);
    return thisMoment;
  }
};
