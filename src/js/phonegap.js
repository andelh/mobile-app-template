var phonegap = {
	initialized: false,
	apple_watch: null,
	connection: 'Unknown Connection',
	battery: {
		level: null,
		isPlugged: false,
	},
	online: true,
	reload: false,
	status: 'loading',
	bindEvents: function()
	{
		document.addEventListener('deviceready', phonegap.events.deviceReady, false);
		document.addEventListener('pause', phonegap.events.pause, false);
		document.addEventListener('resume', phonegap.events.resume, false);
		document.addEventListener('online', phonegap.events.networkOnline, false);
		document.addEventListener('offline', phonegap.events.networkOffline, false);
	},
	receivedEvent: function(event)
	{
		if(event == 'deviceready')
		{
			// Initialize Database
			if(typeof sqlite !== 'undefined')
			{
				sqlite.init(function(){
					angular.bootstrap(document.body, ['app']);
					phonegap.store.init();
				});
			}
		}
		else if(event == 'manual')
		{
			phonegap.events.deviceReady();
		}
	}
};

phonegap.events = {

	deviceReady: function()
	{
		phonegap.receivedEvent('deviceready');

		// Get Batter Status
		window.addEventListener('batterystatus', phonegap.events.batteryStatus, false);
		window.addEventListener('batterycritical', phonegap.events.batteryStatus, false);
		window.addEventListener('batterylow', phonegap.events.batteryStatus, false);

		setTimeout(init_jquery, 100);

		phonegap.stats.event('App', 'Event', 'Device Ready');

		// Get Network Info
		if(typeof navigator.connection !== 'undefined' && typeof Connection !== 'undefined')
		{
			var networkState = navigator.connection.type;

			var states = {};
				states[Connection.UNKNOWN]  = 'Unknown Connection';
				states[Connection.ETHERNET] = 'Ethernet Connection';
				states[Connection.WIFI]     = 'WiFi Connection';
				states[Connection.CELL_2G]  = 'Cell 2G Connection';
				states[Connection.CELL_3G]  = 'Cell 3G Connection';
				states[Connection.CELL_4G]  = 'Cell 4G Connection';
				states[Connection.CELL]     = 'Cell Connection';
				states[Connection.NONE]     = 'No Network connection';

			phonegap.connection = states[networkState];
		}

		if(typeof cordova !== 'undefined' && cordova.InAppBrowser)
		{
			window.open = cordova.InAppBrowser.open;
		}

		if(typeof navigator.splashscreen !== 'undefined')
		{
			navigator.splashscreen.hide();
		}

		if(typeof cordova.plugins.backgroundMode !== 'undefined')
		{
			cordova.plugins.backgroundMode.setDefaults({ text: 'Allowing Background Communication'});
			cordova.plugins.backgroundMode.enable();

			cordova.plugins.backgroundMode.onactivate = function () {

				setTimeout(function () {
					cordova.plugins.backgroundMode.configure({
						text: 'Allowing Background Communication'
					});
				}, 5000);
			}
		}

		if(typeof StatusBar !== 'undefined')
		{
			if (cordova.platformId == 'android')
			{
				StatusBar.backgroundColorByHexString("#E74C3C");
			}
		}

		if(phonegap.initialized === true)
		{
			return false;
		}

		phonegap.initialized = true;
	},
	batteryStatus: function(info)
	{
		phonegap.battery = info;
		phonegap.stats.event('App', 'Event', 'Battery Status ' + info.level);
	},
	pause: function()
	{
		if(navigator.splashscreen)
		{
			navigator.splashscreen.show();
		}

		phonegap.reload = true;
		phonegap.stats.event('App', 'Event', 'Application Paused');
	},
	resume: function()
	{
		if(navigator.splashscreen)
		{
			navigator.splashscreen.hide();
		}

		phonegap.reload = true;
		phonegap.stats.event('App', 'Event', 'Application Resumed');
	},
	networkOnline: function()
	{
		phonegap.online = true;
		phonegap.stats.event('App', 'Event', 'Device Online');
	},
	networkOffline: function()
	{
		phonegap.online = false;
		phonegap.stats.event('App', 'Event', 'Device Offline');
	}
};

phonegap.stats = {
	initialized: false,
	init: function()
	{
		if( !phonegap.stats.initialized && typeof analytics !== 'undefined')
		{
			if(typeof app_settings !== 'undefined' && app_settings.google.analytics !== '')
			{
				phonegap.util.debug('debug', 'Initializing Analytics');
				analytics.startTrackerWithId(app_settings.google.analytics);
				analytics.trackView('Application Loaded');
				analytics.setUserId(device.uuid);

				phonegap.stats.initialized = true;
			}
		}
	},
	pageView: function(page_name)
	{
		if( !phonegap.stats.initialized)
		{
			phonegap.stats.init();
		}

		if(typeof analytics !== 'undefined')
		{
			analytics.trackView(page_name);
		}
	},
	event: function(category, action, label, value)
	{
		if( !phonegap.stats.initialized)
		{
			phonegap.stats.init();
		}

		label = (typeof label !== 'string')
			? JSON.stringify(label)
			: label;

		if(typeof analytics !== 'undefined')
		{
			analytics.trackEvent(category, action, label, value);
		}

		phonegap.util.debug('debug', category + ' › ' + action + ' › ' + label);
	}
}

phonegap.notification = {

	counter: 0,
	alert: function(message, callback, title, button_label)
	{
		phonegap.stats.event('Notification', 'Alert', message);

		if(navigator && typeof navigator.notification !== 'undefined')
		{
			return navigator.notification.alert(message, callback, title, button_label);
		}
		// polyfill for browser development
		else
		{
			alert(message);

			if(callback && typeof callback == 'function')
			{
				return callback();
			}
		}
	},
	confirm: function(message, callback, title, button_labels)
	{
		phonegap.stats.event('Notification', 'Alert', message);

		if(navigator && typeof navigator.notification !== 'undefined')
		{
			return navigator.notification.confirm(message, callback, title, button_labels);
		}
		// polyfill for browser development
		else
		{
			var choice = confirm(message);
			var button_index = (choice) ? 2 : 1;

			if(callback && typeof callback == 'function')
			{
				return callback(button_index);
			}
		}
	},
	prompt: function(message, callback, title, button_labels, default_text)
	{
		phonegap.stats.event('Notification', 'Alert', message);

		if(navigator && typeof navigator.notification !== 'undefined')
		{
			return navigator.notification.prompt(message, callback, title, button_labels, default_text);
		}
		// polyfill for browser development
		else
		{
			var person = prompt(message, default_text);
			var button_index = (person !== null) ? 2 : 1;
			var results = {
				buttonIndex: button_index,
				input1: person
			};

			if(callback && typeof callback == 'function')
			{
				return callback(results);
			}
		}
	},
	beep: function(times)
	{
		phonegap.stats.event('Notification', 'Beep', 'Vibrating Device');

		if(navigator && typeof navigator.notification !== 'undefined')
		{
			return navigator.notification.beep(times);
		}
	},
	center: function(title, text, data, callback, error)
	{
		if(typeof cordova !== 'undefined' && typeof cordova.plugins !== 'undefined' && typeof cordova.plugins.notification !== 'undefined')
		{
			phonegap.notification.counter++;
			var sound = ( device.platform == 'Android' )
				? 'file://assets/sound/beep.caf'
				: 'file://assets/sound/beep.mp3';

			cordova.plugins.notification.local.schedule({
				id: phonegap.notification.counter,
				title: title,
				text: text,
				sound: sound,
				data: data
			});
		}

		if(typeof window.plugins !== 'undefined' && typeof window.plugins.toast !== 'undefined')
		{
			window.plugins.toast.show( text, 'long', 'center',
				function(response){
					if(typeof callback == 'function')
					{
						callback(response);
					}
				},
				function(response){
					if(typeof error == 'function')
					{
						error(response);
					}
				}
			)
		}
	}
};

phonegap.util = {
	enableDebug: true,
	backlog: [],
	debug: function(level, message)
	{
		var text, node, debug_output;
		var console_message = (typeof message !== 'string')
			? JSON.stringify(message)
			: message;

		debug_output = document.getElementById('debug-output');

		if(debug_output)
		{
			if(phonegap.util.backlog.length > 0)
			{
				for(var i=0; i<phonegap.util.backlog.length; i++)
				{
					text = document.createTextNode(phonegap.util.backlog[i].console_message);
					node = document.createElement('li');
					node.className = phonegap.util.backlog[i].level;
					node.appendChild(text);

					debug_output.appendChild(node);
				}

				phonegap.util.backlog = [];
			}

			text = document.createTextNode(console_message);
			node = document.createElement('li');
			node.className = level;
			node.appendChild(text);

			debug_output.appendChild(node)
		}
		else
		{
			phonegap.util.backlog.push({
				level: level,
				console_message: console_message
			});
		}

		if(phonegap.util.enableDebug)
		{
			switch(level)
			{
				case 'log':
					console.log(message);
					break;

				case 'info':
					console.info(message);
					break;

				case 'debug':
					console.debug(message);
					break;

				case 'warn':
					console.warn(message);
					break;

				case 'error':
					console.error(message);
					break;
			}
		}
	}
};

phonegap.store = {
	initialized: false,
	products: [],
	init: function(){

		if(phonegap.store.initialized)
		{
			phonegap.util.debug('warn', 'App Store already Initialized');
			return;
		}

		if (!window.store)
		{
			return;
		}

		phonegap.store.initialized = true;

		// Enable maximum logging level
		store.verbosity = store.QUIET;

		/*

		// EXAMPLE CODE USAGE:

		// Setup Product we sell
		store.register({
			id: 'your_in_app_id',
			alias: 'Your In App Purchase Name',
			type: store.NON_CONSUMABLE
		});

		// Listen for Purchase
		store.when('your_in_app_id').approved(function (order) {
			phonegap.notification.center('Purchase Complete', 'Some Message.');
			order.finish();
		});

		store.refresh();

		*/
	}
};

var CordovaInit = function() {

	if (window.cordova !== undefined)
	{
		phonegap.bindEvents();
	}
	else
	{
		phonegap.receivedEvent('manual');
	}
};

window.onload = function(){
	new CordovaInit();
};