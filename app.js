$(document).ready(function() {
	$("#record").hide();
	$("#stop").hide();
    $("#record").click(function(){
        $("#record").hide();
        $("#stop").show();
        startLogging();
    });
    $("#stop").click(function(){
        $("#stop").hide();
        $("#record").show();
        stopLogging();
    });
});

var dataDir;
var logging = false;
var logOb;//object for beacons log
var logOb2;//object for accel log

function initializeLogs(){
	//$("#textexp").append("beforefile");
	//Check that the global file object is available
    console.log(cordova.file);
    //We get the directory where things will go, see http://www.raymondcamden.com/2014/11/05/Cordova-Example-Writing-to-a-file
	window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dir) {
		dataDir = dir; //We store it for later use
		//console.log("got main dir",dir);
		//alert("got main dir "+dir.fullPath);
		$("#record").show();
		//$("#textexp").append("got main dir "+dir.fullPath);
	});

}

function startLogging(){
	logging = true;
	//TODO: Create the log file with timestamp as name and empty data
	var filename = "locator-app-"+Date.now()+".txt";
		dataDir.getFile(filename, {create:true}, function(file) {
		 	//console.log("got the file", file);
		 	//alert("got the file "+file);
			//$("#textexp").append("got the file "+file.fullPath);
		 	logOb = file;
		 	writeLog("[]");
		});
	//We do the same for the accelerometer data
	var filename2 = "accelerometer-app-"+Date.now()+".txt";
		dataDir.getFile(filename2, {create:true}, function(file) {
		 	//console.log("got the file", file);
		 	//alert("got the file "+file);
			//$("#textexp").append("got the file "+file.fullPath);
		 	logOb2 = file;
		 	writeLog2("[]");
		});
}

function stopLogging(){
	logging = false;
	writeLog(JSON.stringify(logRegisters));
	logRegisters = [];

	writeLog2(JSON.stringify(logRegisters2));
	logRegisters2 = [];
}

var logRegisters = [];
var logRegisters2 = [];
var LOGS_PER_WRITE = 30;//Number of log entries to wait in memory before we actually write to file beacons (1/sec)
var LOGS_PER_WRITE2 = 200;//Number of log entries to wait in memory before we actually write to file accelerometer (20/sec)


function fail(e) {
	//console.log("FileSystem Error");
	alert("FileSystem Error");
	console.dir(e);
}

function writeLog(str) {
	if(!logOb){
	 //console.log("Log file not found!");
	 alert("Beacon Log file not found!");
	 return;
	}
	var log = str;
	//console.log("going to log "+log);
	//alert("going to log "+log);
	logOb.createWriter(function(fileWriter) {

		fileWriter.seek(fileWriter.length);

		var blob = new Blob([log], {type:'text/plain'});
		fileWriter.write(blob);
		//$("#textexp").append("ok, in theory i logged");
		//console.log("ok, in theory i worked");
	}, fail);
}

function writeLog2(str) {
	if(!logOb2){
	 //console.log("Log file not found!");
	 alert("Accel Log file not found!");
	 return;
	}
	var log = str;
	//console.log("going to log "+log);
	//alert("going to log "+log);
	logOb2.createWriter(function(fileWriter) {

		fileWriter.seek(fileWriter.length);

		var blob = new Blob([log], {type:'text/plain'});
		fileWriter.write(blob);
		//$("#textexp").append("ok, in theory i logged");
		//console.log("ok, in theory i worked");
	}, fail);
}





var app = (function()
{
	// Application object.
	var app = {};

	// Specify your beacon 128bit UUIDs here.
	var regions =
	[
		// Estimote Beacon factory UUID.
		{uuid:'B9407F30-F5F8-466E-AFF9-25556B57FE6D'},
		// Sample UUIDs for beacons in our lab.
		{uuid:'F7826DA6-4FA2-4E98-8024-BC5B71E0893E'},
		{uuid:'8DEEFBB9-F738-4297-8040-96668BB44281'},
		{uuid:'A0B13730-3A9A-11E3-AA6E-0800200C9A66'},
		{uuid:'E20A39F4-73F5-4BC4-A12F-17D1AD07A961'},
		{uuid:'A4950001-C5B1-4B44-B512-1370F02D74DE'},
		{uuid:'585CDE93-1B01-42CC-9A13-25009BEDC65E'},	// Dialog Semiconductor.
	];


	var sending=false;


	// Background detection.
	var notificationID = 0;
	var inBackground = false;
	document.addEventListener('pause', function() { inBackground = true });
	document.addEventListener('resume', function() { inBackground = false });

	// Dictionary of beacons.
	var beacons = {};
	var deviceID = null;

	// Timer that displays list of beacons.
	var updateTimer = null;

	// Array of data points, both for accelerometer and beacons
	var accelData = [];
	var beaconData = []; // Gathered relatively less frequently
	var accelSummaries = []; // Less frequent data, fit to send to the server?

	// xAPI stuff
	var lrs = null;

	app.initialize = function()
	{
		document.addEventListener(
			'deviceready',
			function() { evothings.scriptsLoaded(onDeviceReady) },
			false);
	};

	function initialiseDevice(){
		deviceID = device.uuid; //To be logged as actor in the xAPI statement
	}


	function initialiseAccelerometer()
	{
		function onSuccess(acceleration)
		{
			accelerometerHandler(acceleration.x, acceleration.y, acceleration.z)
		}

		function onError(error)
		{
			console.log('Accelerometer error: ' + error)
		}

		navigator.accelerometer.watchAcceleration(
			onSuccess,
			onError,
			{ frequency: 50 })
	}

	function accelerometerHandler(accelerationX, accelerationY, accelerationZ)
	{
		$('#found-accelerometer').empty();


		// Create tag to display beacon data.
		var element = $(
			'<li>'
			+	'X: ' + accelerationX + '<br />'
			+	'Y: ' + accelerationY + '<br />'
			+	'Z: ' + accelerationZ + '<br />'
			+ '</li>'
		);

		$('#found-accelerometer').append(element);

		if(logging){
			//Add timestamp and log registers to the logging variable
			var logEntry = {};
			logEntry.accelerationX = accelerationX;
			logEntry.accelerationY = accelerationY;
			logEntry.accelerationZ = accelerationZ;
			logEntry.timestamp = timestamp
			logRegisters2.push(logEntry);
		}

		//If 5 seconds have passed, we append the variable to the file
		if(logRegisters2.length>=LOGS_PER_WRITE2){
		 writeLog(JSON.stringify(logRegisters2));
		 logRegisters2 = [];
		}
	}

	function onDeviceReady()
	{

		initialiseDevice();

		initialiseAccelerometer();



		// Specify a shortcut for the location manager holding the iBeacon functions.
		window.locationManager = cordova.plugins.locationManager;

		// Start tracking beacons!
		startScan();

		// Display refresh timer.
		updateTimer = setInterval(displayBeaconListAndAccel, 500);
	}

	function startScan()
	{
		// The delegate object holds the iBeacon callback functions
		// specified below.
		var delegate = new locationManager.Delegate();

		// Called continuously when ranging beacons.
		delegate.didRangeBeaconsInRegion = function(pluginResult)
		{
			//console.log('didRangeBeaconsInRegion: ' + JSON.stringify(pluginResult))
			for (var i in pluginResult.beacons)
			{
				// Insert beacon into table of found beacons.
				var beacon = pluginResult.beacons[i];
				beacon.timeStamp = Date.now();
				var key = beacon.uuid + ':' + beacon.major + ':' + beacon.minor;
				beacons[key] = beacon;
			}
		};

		// Called when starting to monitor a region.
		// (Not used in this example, included as a reference.)
		delegate.didStartMonitoringForRegion = function(pluginResult)
		{
			//console.log('didStartMonitoringForRegion:' + JSON.stringify(pluginResult))
		};

		// Called when monitoring and the state of a region changes.
		// If we are in the background, a notification is shown.
		delegate.didDetermineStateForRegion = function(pluginResult)
		{
			if (inBackground)
			{
				// Show notification if a beacon is inside the region.
				// TODO: Add check for specific beacon(s) in your app.
				if (pluginResult.region.typeName == 'BeaconRegion' &&
					pluginResult.state == 'CLRegionStateInside')
				{
					cordova.plugins.notification.local.schedule(
						{
							id: ++notificationID,
							title: 'Beacon in range',
							text: 'iBeacon Scan detected a beacon, tap here to open app.'
						});
				}
			}
		};

		// Set the delegate object to use.
		locationManager.setDelegate(delegate);

		// Request permission from user to access location info.
		// This is needed on iOS 8.
		locationManager.requestAlwaysAuthorization();

		// Start monitoring and ranging beacons.
		for (var i in regions)
		{
			var beaconRegion = new locationManager.BeaconRegion(
				i + 1,
				regions[i].uuid);

			// Start ranging.
			locationManager.startRangingBeaconsInRegion(beaconRegion)
				.fail(console.error)
				.done();

			// Start monitoring.
			// (Not used in this example, included as a reference.)
			locationManager.startMonitoringForRegion(beaconRegion)
				.fail(console.error)
				.done();
		}
	}


	function displayBeaconListAndAccel()
	{
		// Clear device list and display device UUID
		$('#device').empty();
		var deviceElem = $('<li>Device ID: '+deviceID+'<br /></li>')
		$('#device').append(deviceElem);

		// Clear accel list.
		$('#accelerometer').empty();
		// Create tag to display last accelerometer sample
		var lastAcc = accelData.slice(-1)[0];
		var accFreq = calculateAvgDelay(accelData);
		var nsamp = Math.round(1000/accFreq);
		var accChange = calculateAvgChange(accelData, nsamp);
		var accElem = $(
			'<li>'
			+	'X: ' + lastAcc.x + '<br />'
			+	'Y: ' + lastAcc.y + '<br />'
			+	'Z: ' + lastAcc.z + '<br />'
			+	'Avg. change ('+ nsamp +' smp '+accFreq+'ms): ' + accChange + '<br />'
			+ '</li>'
		);
		$('#accelerometer').append(accElem);

		// Clear beacon list.
		$('#found-beacons').empty();

		var timeNow = Date.now();

		// Update beacon list.
		$.each(beacons, function(key, beacon)
		{
			// Only show beacons that are updated during the last 60 seconds.
			if (beacon.timeStamp + 60000 > timeNow)
			{
				// Map the RSSI value to a width in percent for the indicator.
				var rssiWidth = 1; // Used when RSSI is zero or greater.
				if (beacon.rssi < -100) { rssiWidth = 100; }
				else if (beacon.rssi < 0) { rssiWidth = 100 + beacon.rssi; }

				// Create tag to display beacon data.
				var element = $(
					'<li>'
					+	'<strong>UUID: ' + beacon.uuid + '</strong><br />'
					+	'Major: ' + beacon.major + '<br />'
					+	'Minor: ' + beacon.minor + '<br />'
					+	'Proximity: ' + beacon.proximity + '<br />'
					+	'RSSI: ' + beacon.rssi + '<br />'
					+ 	'<div style="background:rgb(255,128,64);height:20px;width:'
					+ 		rssiWidth + '%;"></div>'
					+ '</li>'
				);

				$('#warning').remove();
				$('#found-beacons').append(element);

				if(logging){
					//Add timestamp and log registers to the logging variable
					var logEntry = {};
					logEntry.timestamp = beacon.timeStamp;
					logEntry.beaconID = beacon.major+"-"+beacon.minor;
					logEntry.proximity = beacon.proximity;
					logEntry.rssi = beacon.rssi;
					logRegisters.push(logEntry);
				}

			}
		});

		//If 5 seconds have passed, we append the variable to the file
		if(logRegisters.length>=LOGS_PER_WRITE){
		 writeLog(JSON.stringify(logRegisters));
		 logRegisters = [];
		}



	}


	return app;
})();

app.initialize();
