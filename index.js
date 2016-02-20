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
  response.render('pages/index');
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
            "text": "Tag people and refer to any line by command /atline",
        }
      ]
    });
  });
})

app.post('/showline', function(req,res) {
  var line_number = parseInt(req.body.text)
  var start = Math.max(line_number-3, 0)
  var subarray = lines.slice(start, line_number+3)
  var fullfileLink = "<" + fileURL + "|_View file_>"
  for(var i=0; i<subarray.length; i++) {
    subarray[i] = (start+1+i) + ": " + subarray[i]
  }
  res.json({
    response_type: "in_channel",
    text: "Showing line " + (start+1) + " to " + (line_number+3) + " _(_" + fullfileLink + "_)_\n" +
      "```" + subarray.join('\n') + "```"
  })
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
