'use strict'

const Slapp = require('slapp')
const Context = require('./context')
const ConvoStore = require('./convo-store')

const YAML = require('js-yaml')
const fs = require('fs')

const _ = require('lodash')

const request = require('request')

const handleHowAreYou = 'handleHowAreYou'
const handleSweetDreams = 'handleSweetDreams'

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

module.exports = (server, db) => {
console.log('initializing Slapp')
  let app = Slapp({
    verify_token: process.env.SLACK_VERIFY_TOKEN,
    context: Context(db),
    convo_store: ConvoStore(db)
  })

var Monitor = require('icecast-monitor');

var monitor = new Monitor({
  host: 'radio.radiospiral.net',
  port: 8000,
  user: process.env.RADIO_USER,
  password: process.env.RADIO_PASSWORD,
});

// Load oblique strategies
var strategies;
try {
  strategies = YAML.safeLoad(fs.readFileSync('strategies.yml', 'utf8'));
  console.log(strategies[0]);
} catch(e) {
  console.log("Failed to load Oblique Strategies: " + e);
}


var HELP_TEXT = `
I will respond to the following messages:
\`help\` - to see this message.
\`track\` - to see what the current track is.
\`peak\` - report on the peak listener count.
\`history\` - to get a list of previously played tracks.
\`strategy\` - to get a random Oblique Strategy.
I am very polite as well.
`

// *********************************************
// Setup different handlers for messages
// *********************************************

const stopper = `I wasn't listening...`
var previousTrack = stopper
var currentTrack = stopper
var testTrack = `Nol`
var numListeners = 0
var trackHistory = []
var numTracks = 0
var maxTracks = 10
var histIndex = 0
var oldMessage = ''
var candidateMessage = ''

monitor.createFeed(function(err, feed) {
  if (err) throw err;

  // Handle wildcard events
  //feed.on('*', function(event, data, raw) {
  //  console.log(event, data, raw);
  // });
  // Handle listener change
  feed.on('mount.listeners', function(listeners, raw) {
    numListeners = raw;
    console.log(listeners, raw);
  });
  // Handle track title change here

  feed.on('mount.title', function(title, track) {
    console.log('Now playing: ' + track);         // for debugging right now. should mean the track has changed
    testTrack = track;                            // not sure what type track is, so force it to a string
    if (currentTrack !== testTrack) {
        //console.log(currentTrack + " is not equal to " + testTrack);    // debug, they aren't equal, so yes
        console.log('Track change to ' + testTrack);
        previousTrack = currentTrack;               // save the no longer current track as the previous
        currentTrack = track;                       // now store the current track
        request({
	        url: process.env.NOW_PLAYING_WEBHOOK,
	        method: 'POST',
	   	    json: { text: currentTrack }
	    }),
        function(error, response, body) {
            if (error || response.statusCode === 200) {
		        console.log('error: '+ error)
	   	    	console.log('code: ' + response.statusCode)
	     	    console.log('status: ' + response.statusText)
	        }
	    }
    }
    trackHistory = _.concat(trackHistory,previousTrack);  // save previous track
    if (trackHistory.length > maxTracks) {
        trackHistory = _.drop(trackHistory);
    } else {
      console.log('**dupEvent ' + currentTrack + ' is equal to ' + testTrack);
    }

    histIndex = numTracks;

    while (histIndex > 0) {
    console.log('track history: ' + trackHistory[histIndex]); //works, backwards I think
      histIndex = histIndex - 1;
    }
  });
});

  app
    .event('url_verification', (msg) => {
        //parse for the challenge element and return its value
        msg.respond(msg.challenge, (err) => {})
    })
	.event('trackswitch', (msg) => {
			console.log('Synthetic trackswitch detected')
	})
    .message(/oblique|strateg(y|ies)/i, ['mention', 'direct_message'], (msg) => {
        msg.say(_.sample(strategies))
    })
	.message(/track|playing|hearing|tune|listening|music/i, ['mention', 'direct_message'], (msg) => {
		msg.say('Now playing: ' + currentTrack + ' (' + numListeners + ' listening)');
		msg.say('Previous: ' + previousTrack);
	})

	.message(/history|played|recent/i, ['mention', 'direct_message'], (msg) => {

	    histIndex = numTracks;
	    if (trackHistory === null) {
	        trackHistory = [stopper]
	    }
	    if (trackHistory.length === 1 && trackHistory[0] === stopper && currentTrack !== null) {
	      trackHistory = [currentTrack]
	    }
	    if (trackHistory > 0) {
	        if (currentTrack != null && _.last(trackHistory) != currentTrack) {
	            trackHistory = _.concat(trackHistory, currentTrack)
	        }
	    }
	    console.log(trackHistory)
	    var sawNonStopper = false
	    var first = true
	    msg.say('What has played recently:')
	    _.eachRight(trackHistory, function(value) {
	      if (value !== stopper) {
	        sawNonStopper = true
	        if (first) {
	            value = value + " (now playing)"
	            first = false
	        }
	        msg.say(value)
	      } else {
	        if (!sawNonStopper) {
	          msg.say(value)
	          return
	        }
	      }
	    })
	})
    .message(/(T|t)hank( |s|y|ies)|cheers|ty/i, ['mention', 'direct_message'], (msg) => {
        if (Math.random() < 0.98) {
            msg.say(['No problem!', 'You are welcome!', 'Happy to help!', 'de nada!', 'My pleasure!', ':pray:', ':raised_hands:', 'cool'])
        }
     })
    .message('help', ['mention', 'direct_mention', 'direct_message'], (msg, text) => {
        msg.say(HELP_TEXT)
    })
    .message(/active/i, ['direct_mention', 'direct_message'], (msg) => {
      request({
          url: 'https://slack.com/api/users.list', //URL to hit
          qs: {token: msg.meta.app_token}, //Query string data
          method: 'GET', //Specify the method
      }, function (error, response, body) {
          if (error) {
              console.log("GET failed:", error);
              msg.say("Slack isn't talking to me. ¯\_(ツ)_/¯");
          } else {
            var j = JSON.parse(body);
            if (j.ok){
              var active_users = _.map(j.members, function(user){
                sleep(9).then(() =>{
                    request({
                      url: 'https://slack.com/api/users.getPresence',
                      qs: {token: msg.meta.app_token, user: user.id},
                      method: 'GET'
                    }, function(error, response, body){
                      if (error) {
                        return null;
                      } else {
                        var j = JSON.parse(body);
                        if (j.ok) {
                          if (j.presence == "active") {
                           msg.say(user.profile.display_name_normalized+" ["+user.profile.first_name + " "+user.profile.last_name+"]");
                          }
                        }
                      }
                    })
                  });
                });
            } else {
              msg.say(_.join(["Something went wrong:", error],' '));
            }
          }
      })
    })
    // Catch-all for any other responses not handled above
   .message('.*', ['mention', 'direct_mention', 'direct_message'], (msg) => {
        // respond 90% of the time
        if (Math.random() < 0.9) {
            msg.say([
                ':wave:',
                ':pray:',
                ':raised_hands:',
                'Word.',
                ':wink:',
                'Did you say something?',
                ':innocent:',
                ':hankey:',
                ':smirk:',
                ':stuck_out_tongue:',
                ':sparkles:',
                ':punch:',
                ':boom:',
                ':smiling imp:',
                ':neckbeard:'
            ])
        }
    })

    .attachToExpress(server)

  return app
}
