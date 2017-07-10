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
		// Update the data array with the timestamped data
		var sample = {
			timestamp: Date.now(),
			x: accelerationX,
			y: accelerationY,
			z: accelerationZ
		};
		accelData.push(sample);
	}

	function onDeviceReady()
	{

		initialiseDevice();

		initialiseAccelerometer();


		try {
			lrs = new TinCan.LRS(
				{
					endpoint: "https://htk.tlu.ee/lrs/data/xAPI",
					username: "4da0d771a634c608ff4c4730ba17fd8d9bc8ba8a",
					password: "d753b5bf345d2c19e535f848cd350c0e9482f990",
					allowFail: false
				}
			);
		}
		catch (ex) {
			console.log("Failed to setup LRS object: " + ex);
			// TODO: do something with error, can't communicate with LRS
		}

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

	// Original function: TODELETE!
	function displayBeaconList()
	{
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
			}
		});
	}

	function calculateAvgChange(data, nsamp=null){
		var changes = [];
		if(!nsamp || nsamp>data.length){ //If we don't say number of samples, or there are not enough, we just take all the data available
			if(data.length>1){
				for(var i=1; i<data.length;i++){
					var change = Math.sqrt(Math.pow((data[i].x)-(data[i-1].x),2)+Math.pow((data[i].y)-(data[i-1].y),2)+Math.pow((data[i].z)-(data[i-1].z),2));
					changes.push(change);
				}
				var total=0;
				for(var j=0; j<changes.length; j++) {
					total += changes[j]; 
				}
				return total/changes.length;
			}else{
				return 0;
			}
		}else{ // We set a number of samples, smaller than the available data
			if(data.length>1){
				for(var i=(data.length-nsamp+1); i<data.length;i++){
					var change = Math.sqrt(Math.pow((data[i].x)-(data[i-1].x),2)+Math.pow((data[i].y)-(data[i-1].y),2)+Math.pow((data[i].z)-(data[i-1].z),2));
					changes.push(change);
				}
				var total=0;
				for(var j=0; j<changes.length; j++) {
					total += changes[j]; 
				}
				return total/changes.length;
			}else{
				return 0;
			}
		}


	}

	function calculateAvgDelay(data){
		var changes = [];
		if(data.length>1){
			for(var i=1; i<data.length;i++){
				var change = (data[i].timestamp)-(data[i-1].timestamp);
				changes.push(change);
			}
			var total=0;
			for(var j=0; j<changes.length; j++) {
				total += changes[j]; 
			}
			return Math.round(total/changes.length);
		}else{
			return 0;
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

		accelSummaries.push({
			timestamp: timeNow,
			change: accChange
		})

		beaconData.push({
			timestamp: timeNow,
			beacons: beacons
		});

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
			}
		});

		sendCleanupData();


	}

	function sendPayload(payload){
		//console.log("about to send payload "+JSON.stringify(payload));

		var statement = new TinCan.Statement(
			{
				"actor": {
					"name": "ClassroomTrackerApp for device "+deviceID,
					"account": {
						"homePage": "https://github.com/lprisan/classroom-tracker-app/",
						"name": deviceID
					},
					"objectType": "Agent"
				},
				"verb": {
					"id": "http://adlnet.gov/expapi/verbs/experienced",
					"display": { 
						"en-US": "experienced"
					}
				},
				"object": {
					"id": "https://github.com/lprisan/classroom-tracker-app/tree/modern-redo",
					"definition": {
						"type": "http://adlnet.gov/expapi/activities/interaction",
						"name": {
							"en-US": "Classroom Tracker App multimodal data"
						},
						"extensions": {
							"https://github.com/lprisan/classroom-tracker-app/": payload
						}
						
					}
				}
			}
		);

		$('#networkmsg').empty();
		var nwElem = $('<li>Sending payload '+payload.accelData[0].timestamp+'...<br /></li>')
		$('#networkmsg').append(nwElem);


		lrs.saveStatement(
			statement,
			{
				callback: function (err, xhr) {
					if (err !== null) {
						if (xhr !== null) {
							console.log("Failed to save statement: " + xhr.responseText + " (" + xhr.status + ")");
							// TODO: do something with error, didn't save statement
							var nwElem = $('<li>Failed to save statement: ' + xhr.responseText + ' (' + xhr.status + ')<br /></li>')
							$('#networkmsg').append(nwElem);

							return;
						}

						console.log("Failed to save statement: " + err);
						// TODO: do something with error, didn't save statement
						var nwElem = $('<li>Failed to save statement: ' + err +'<br /></li>')
						$('#networkmsg').append(nwElem);
						
						return;
					}

					console.log("Statement saved");
					var nwElem = $('<li>Statement saved! <br /></li>')
					$('#networkmsg').append(nwElem);
				}
			}
		);

	}


	function sendCleanupData()
	{
		//Number of registries to be sent to LRS each time
		var N_PAYLOAD = 20;
		if(accelSummaries.length>=N_PAYLOAD){
			var payload = {
				beaconData: beaconData.slice(0,N_PAYLOAD),
				accelData: accelSummaries.slice(0,N_PAYLOAD)
			};
			beaconData = beaconData.slice(N_PAYLOAD);
			accelSummaries = accelSummaries.slice(N_PAYLOAD);
			sendPayload(payload);
		}

		var N_REGS = 100; //How many data points we keep locally temporally e.g., the last 100
		if(accelData.length>N_REGS)
		{
			accelData = accelData.slice(-N_REGS);
		}
		if(accelSummaries.length>N_REGS)
		{
			accelSummaries = accelSummaries.slice(-N_REGS);
		}
		if(beaconData.length>N_REGS)
		{
			beaconData = beaconData.slice(-N_REGS);
		}
		
	}


	return app;
})();

app.initialize();
