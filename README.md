# beacon-locator-app
A small Android application to track the location of a person in a classroom, using bluetooth beacons.


It is built using Evothings and Cordova for developing the Android app using HTML and JS.

```
cordova platform add android
cordova plugin add cordova-plugin-file
cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-device-motion.git
```

This has two ways of working, to be set in the config.xml file:

... after building (```cordova build android```) and installing the application ipk in the phone...
* The phone is autonomous: 	```<content src="index.html" />```
* The application code is injected from the desktop IDE: ```<content src="http://myipaddress:4042" />```
** Execute ```EvothingsWorkbench```, and drag and drop the index.html file to it
** In the phone, start the app and connect to the IDE
** In the IDE, click Run on the application row

## First-time Installation (for development)

(for now, tried on Windows)

* Installed EvothingsStudio
* Installed Node.js and Cordova (`npm install -g cordova`) --> 6.2.3
* Installed Android Studio (including paths and other steps detailed in https://cordova.apache.org/docs/en/latest/guide/platforms/android/index.html )

