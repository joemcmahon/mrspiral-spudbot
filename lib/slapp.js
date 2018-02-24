'use strict'

const Slapp = require('slapp')
const Context = require('./context')
const ConvoStore = require('./convo-store')
const YAML = require('js-yaml')
const fs = require('fs')
const _ = require('lodash')
const handleHowAreYou = 'handleHowAreYou'
const handleSweetDreams = 'handleSweetDreams'


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
      numTracks = numTracks + 1;                  // to set a limit on history size we have to count tracks
      previousTrack = currentTrack;               // save the no longer current track as the previous
      currentTrack = track;                       // now store the current track
      trackHistory = _.concat(trackHistory,previousTrack);  // save previous track
      if (numTracks > maxTracks) {
        trackHistory = _.drop(trackHistory);
        numTracks = maxTracks;
      }
    } else {
      console.log('**dupEvent ' + currentTrack + ' is equal to ' + testTrack);

    }

    console.log('previous: ' + previousTrack);    //debugging some more here

    histIndex = numTracks;

    while (histIndex > 0) {
    console.log('track history: ' + trackHistory[histIndex]); //works, backwards I think
      histIndex = histIndex - 1;
    }

//    slapp.use((track, next) => {
//        console.log(track)
//        msg.say('Now playing: ' + track);
//        next()
//    })
   // message.say('Now playing: ' + track);
  });
});


  app
    .event('url_verification', (msg) => {
        //parse for the challenge element and return its value
        msg.respond(msg.challenge, (err) => {})
    })
    .message('strategy', ['mention', 'direct_message'], (msg) => {
        msg.say(_.sample(strategies))
    })
    .message(/(T|t)hank( |s|y|ies)|cheers|ty/i, ['mention', 'direct_message'], (msg) => {
        if (Math.random() < 0.98) {
            msg.say(['No problem!', 'You are welcome!', 'Happy to help!', 'de nada!', 'My pleasure!', ':pray:', ':raised_hands:', 'cool'])
        }
     })
    .message('help', ['mention', 'direct_mention', 'direct_message'], (msg, text) => {
        msg.say(HELP_TEXT)
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
