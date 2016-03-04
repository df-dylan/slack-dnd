'use strict';

var http = require('http');
var https = require('https');
var url = require('url');
var minimist = require('minimist');
var argv;
var port = 3000;
var slackToken;
var groupRestrict;

function rollDie(max){
  return Math.floor(Math.random() * (max - 1 + 1)) + 1;
}

function startRollServer(port, slackToken, groupRestrict){
  var server = http.createServer(function(req, res){
    var parsed = url.parse(req.url, true);
    if (slackToken !== parsed.query.token) {
      console.log("Invalid verification token");
      return res.end('');
    } 

    if(typeof groupRestrict !== 'undefined'  && parsed.query.team_id !== groupRestrict){
      return res.end('');
    }

    if(parsed.pathname === '/roll'){
      var diceData = parsed.query.text.split('d');
      var echoChannel = parsed.query.channel_id;
      var numDice = parseInt(diceData[0] || 1, 10);
      var diceType = parseInt(diceData[1], 10);
      var results = [];
      var roll = 0;

      console.log('request', req.url);

      if(!isNaN(numDice) && !isNaN(diceType)){
        console.log('valid request, rolling dice');
        numDice = numDice > 10 ? 10 : numDice;
        diceType = diceType > 100 ? 100 : diceType;
        for(var i = 0; i < numDice; i++){
          roll = rollDie(diceType);
          results.push(roll);
        }
      }

      var total = results.reduce(function(a,r){ return a += r}, 0);

      var output = JSON.stringify({
        text: parsed.query.user_name + " rolled " + 
        diceData.join('d')+ ' for ' 
        + total + (numDice > 1 ? ' (' + results.join(', ') + ')' : ''),
        response_type: 'ephemeral'
      });

      console.log('sending to webhook', output);
      
      var responseUrl = url.parse(parsed.query.response_url);
      var post = https.request({
        host: responseUrl.host,
        path: responseUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': output.length
        }
      }, function(res){
        res.setEncoding('utf8');
        res.on('data', function(chunk){
          console.log('response', chunk);
        });
      });

      post.write(output);
      post.end();

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
  groupRestrict = process.env.SLACK_GROUP || argv.group || groupRestrict;
  slackToken = process.env.SLACK_TOKEN || argv.token || slackToken;

  if(typeof slackToken === 'undefined'){
    console.log('You need a slack token and a slack hostname to continue');
  }

  startRollServer(port, slackToken, groupRestrict);
}
