'use strict'

console.log('loading slapp')
const Slapp = require('slapp')
console.log('loading context')
const Context = require('./context')
console.log('loading conversation store')
const ConvoStore = require('./convo-store')

module.exports = (server, db) => {
console.log('initializing Slapp')
  let app = Slapp({
    verify_token: process.env.SLACK_VERIFY_TOKEN,
    context: Context(db),
    convo_store: ConvoStore(db)
  })

console.log('infrastructure loaded')
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
  strategies = yaml.safeLoad(fs.readFileSync('strategies.yml', 'utf8'));
  console.log(strategies[0]);
} catch(e) {
  console.log("Failed to load Oblique Strategies: " + e);
}


var HELP_TEXT = `
I will respond to the following messages:
\`help\` - to see this message.
\`track\` - to see what the current track is.
\`peak\` - report on the peak listener count.
\`strategy\` - to get a random Oblique Strategy.
`

  app
    .message('help', ['direct_mention', 'direct_message'], (msg, text) => {
        msg.say(HELP_TEXT)
    })
    .message(/\btrack\b/i, ['mention', 'direct_message'], (msg, text) => {
        monitor.createStatsXmlStream('/admin/stats', function(err, xmlStream) {
            if (err) throw err;

            var xmlParser = new Monitor.XmlStreamParser();

            xmlParser.on('error', function(err) {
                console.log('error', err);
            });

            var xmlParser = new Monitor.XmlStreamParser();

            xmlParser.on('source', function(source) {
                msg.say('Now playing: ' + source.title + ' (' + source.listeners + ' listening)');
            });

            // Finish event is being piped from xmlStream
            xmlParser.on('finish', function() {
                //console.log('all sources are processed');
            });

            xmlStream.pipe(xmlParser);
        })
    })
    .message(/oblique|strateg(y|ies)/i, ['mention', 'direct_message'], (msg) => {
         msg.say(_.sample(strategies))
    })
    .message('peak', ['mention', 'direct_message'], (msg) => {
        monitor.createStatsXmlStream('/admin/stats', function(err, xmlStream) {
            if (err) throw err;

            var xmlParser = new Monitor.XmlStreamParser();

            xmlParser.on('error', function(err) {
                console.log('error', err);
            });

            var xmlParser = new Monitor.XmlStreamParser();

            xmlParser.on('source', function(source) {
                msg.say('Listener peak was ' + source.listenerPeak + ' since ' + source.streamStart);
            });

            // Finish event is being piped from xmlStream
            xmlParser.on('finish', function() {
                //console.log('all sources are processed');
            });

            xmlStream.pipe(xmlParser);
        });
    })

    // Catch-all for any other responses not handled above
   .message('.*', ['mention', 'direct_mention', 'direct_message'], (msg) => {
        // respond only 40% of the time
        if (Math.random() < 0.4) {
            msg.say([':wave:', ':pray:', ':raised_hands:'])
        }
    })


    .attachToExpress(server)

  return app
}
