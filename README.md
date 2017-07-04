# beacon-locator-app
A small Android application to track the location of a person in a classroom, using bluetooth beacons.

**For now, the app is built using Evothings Studio, not Cordova** -- This means shorter development cycles and refresh, but building the apk is too complex


---

Later on, we should build the app/apk with Cordova, see https://evothings.com/doc/build/cordova-guide.html :


```
cordova plugin add cordova-plugin-file
cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-device-motion.git

(... add also the accelerometer and ibeacons plugins...)
```

This has two ways of working, to be set in the config.xml file:

... after building (```cordova build android```) and installing the application ipk in the phone...
* The phone is autonomous: 	```<content src="index.html" />```
* The application code is injected from the desktop IDE: ```<content src="http://myipaddress:4042" />```
** Execute ```EvothingsWorkbench```, and drag and drop the index.html file to it
** In the phone, start the app and connect to the IDE
** In the IDE, click Run on the application row

