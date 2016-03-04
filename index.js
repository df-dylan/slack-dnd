'use strict';

let http = require('http');
let https = require('https');
let url = require('url');
let minimist = require('minimist');
let argv;
let port = 3000;
let slackToken;
let random = require("random-js")();

function rollDie(max){
  return random.integer(1, max);
}

function startRollServer(port, slackToken){
  let server = http.createServer(function(req, res){
    let parsed = url.parse(req.url, true);
    if (slackToken !== parsed.query.token) {
      console.log("Invalid verification token");
      return res.end('');
    }

    if(parsed.pathname === '/roll'){
      let diceData = parsed.query.text.split('d');
      let echoChannel = parsed.query.channel_id;
      let numDice = parseInt(diceData[0] || 1, 10);
      let diceType = parseInt(diceData[1], 10);
      let results = [];
      let roll = 0;
      let output;

      if(!isNaN(numDice) && !isNaN(diceType) 
        && numDice > 0 && diceType > 1 && diceData.length === 2){
        console.log('valid request, rolling dice');
        numDice = numDice > 10 ? 10 : numDice;
        diceType = diceType > 100 ? 100 : diceType;
        for(let i = 0; i < numDice; i++){
          roll = rollDie(diceType);
          results.push(roll);
        }
        let total = results.reduce(function(a,r){ return a += r}, 0);

        output = JSON.stringify({
          text: parsed.query.user_name + " rolled " + 
          diceData.join('d')+ ' for ' +
          total + (numDice > 1 ? ' (' + results.join(', ') + ')' : ''),
          response_type: 'in_channel'
        });
      } else {
        output = JSON.stringify({
          text: 'do you think this a game???',
          response_type: 'ephemeral'
        })
      }

      console.log('sending to webhook', output);
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.write(output);
      res.end('');
    } else {
      res.end('nope');
    }
  });
  server.listen(port);
  console.log('listening on: ' + port)
}

if(!module.parent){
  argv = minimist(process.argv.slice(2));
  port = process.env.PORT || argv.port || port;
  slackToken = process.env.SLACK_TOKEN || argv.token || slackToken;

  if(typeof slackToken === 'undefined'){
    console.log('You need a slack token and a slack hostname to continue');
  }

  startRollServer(port, slackToken);
}
