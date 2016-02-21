var express = require('express');
var app = express();

var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

var transformURL = function(url) {
  return url.replace('/blob/', '/').replace('github.com','raw.githubusercontent.com')
}

var getParameterByName = function(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var getCodeFromURL = function(url, callback) {
  var request = require('request');
  request.get(transformURL(url), function (error, response, body) {
      if (!error && response.statusCode == 200) {
          var csv = body;
          // Continue with your processing here.
          callback(csv.split('\n'));
      }
  });
}

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  //response.render('pages/index');
  var code = getParameterByName('code')
  var request = require('request');
  request.get("https://slack.com/api/oauth.access?client_id=22296872241.22374686359&client_secret=1e66456c43b443964919324b6b71f7c4&code=" + code, function (error, response, body) {
      if (!error && response.statusCode == 200) {

      }
  });
});

app.get('/grab', function(req, res) {
  getCodeFromURL("https://github.com/crr/maplefm-watchlist/blob/master/background.js", function(data) {
    res.json({ code: data });
  });
});

var fileURL;
var lines;

app.post('/review', function(req,res) {
  fileURL = req.body.text
  getCodeFromURL(fileURL, function(data) {
    lines = data
    res.json({
      response_type: "in_channel",
      text: "Your codetalk session is now active!",
      attachments: [
        {
            "title": lines.length + " lines of code",
            "title_link": fileURL,
            "text": "Tag people and refer to any line by command /showline",
        }
      ]
    });
  });
})

var createSnippet = function(url, line_number, lines, stop) {
  var start = Math.max(line_number-3, 0)
  var end = Math.min(line_number+3, lines.length)
  if( stop != undefined ) {
    start = line_number-1
    console.log(stop)
    end = stop
  }
  var subarray = lines.slice(start, end)
  var fullfileLink = "<" + url + "#L" + line_number + "|_View file_>"
  if( stop != undefined ) {
    fullfileLink = "<" + url + "#L" + (start+1) + "-L" + stop + "|_View file_>"
  }
  for(var i=0; i<subarray.length; i++) {
    subarray[i] = (start+1+i) + ": " + subarray[i]
  }
  return "Showing line " + (start+1) + " to " + (end) + " _(_" + fullfileLink + "_)_\n" +
    "```" + subarray.join('\n') + "```"
}

app.post('/showline', function(req,res) {
  var text = req.body.text.split('-')
  if( text.length == 1 ) {
    res.json({
      response_type: "in_channel",
      text: createSnippet(fileURL, parseInt(req.body.text), lines)
    })
  } else {
    res.json({
      response_type: "in_channel",
      text: createSnippet(fileURL, parseInt(text[0]), lines, parseInt(text[1]))
    })
  }
})

app.post('/refer', function(req,res){
  var raw = req.body.text.split(" ")
  if(raw.length != 2) {
    res.json({
      response_type: "in_channel",
      text: "To refer a specific snippet of code, please use the command _'/refer <fileurl> <linenumber>'_"
    })
  } else {
    var url = raw[0], line = parseInt(raw[1])
    getCodeFromURL(url, function(data) {
      res.json({
        response_type: "in_channel",
        text: createSnippet(url, line, data)
      })
    })
  }
})

app.post('/search', function(req,res){
  var keyword = req.body.text, matches = []
  for(var i=0;i<lines.length; i++) {
    if(lines[i].indexOf(keyword) > -1) {
      matches.push({
        text: "line " + (i+1) + ": " + lines[i]
      });
    }
  }
  res.json({
    text: "Found " + matches.length + " matches of keyword " + "\"" + keyword + "\" in the current file",
    attachments: matches
  })
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
