var http    = require("http");
var server  = http.createServer(function (req, res) {
  res.writeHead(200, {
    "Content-Type":                 "application/json",
    "Access-Control-Allow-Origin":  "*"
  });
}).listen(process.env.PORT || 3000);

var $       = require('jquery'); 

var irc     = require("./irc.js");
var the_bot = new irc.Client("irc.freenode.net", "soloqueue", { port: 6667, channels: ["#mjc"] });

console.log("Soloqueue Bot Running");

function search_term (tester) {
  var tmp_search_term = tester;
  tmp_search_term.splice(0, 2);
  tmp_search_term.join();
  return tmp_search_term.toString().replace(/[,]/g, ' ');
}

function get_data (search_input, command, from) {  
  var options = {
    host:   "www.soloqueue.com",
    path:   "/api/" + search_input.replace(/[ ]/g, "+") + ".json",
    method: "GET"
  };
  	
  var request = http.request(options, function (resp) {
    var data = "";
  
    resp.on('data', function (chunk) {
      data += chunk;
    });
  
    resp.on('end', function () {
      handle_data(data, command, from);
    });
  }).on("error", function (e) {
    console.log("error: " + e.message);
  });
  
  request.end();
}

function handle_data (data, command, from) {
  var the_data  = JSON.parse(data, command);
  var credits   = " [Brought to you by: http://www.soloqueue.com/]"
  
  if (the_data.data.length == 0) {
    the_bot.say("#mjc", "Sorry, the item or champ you requested data on couldn't be found.");
    return;
  }
  
  switch (command) {
    case "counters":
      the_bot.say(from, the_data.data[0][0] + " counters: " + the_data.data[0][1].counters.join(", ") + credits);
      
      break;
    case "champ":
      var html      = $(the_data.data[0][1].wiki);
      var response  = "";
      
      $.each($(html.find("tr")[1]).find("td"), function () {
        response += " " + $(this).text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $(this).next().text().replace(/(\r\n|\n|\r)/gm, "");
      });
      
      the_bot.say(from, "Champion Name: " + the_data.data[0][0] + response + credits);
      
      break;
    case "item":
      var html      = $(the_data.data[0][1].wiki);
      var response  = "";
      
      response += " " + $($(html).find("tr")[2]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[2]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
      response += " " + $($(html).find("tr")[3]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[3]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
      response += " " + $($(html).find("tr")[4]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[4]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
      response += " " + $($(html).find("tr")[5]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[5]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
      response += " " + $($(html).find("tr")[6]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[6]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
      response += " " + $($(html).find("tr")[7]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[7]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
      
      the_bot.say(from, "Item Name: " + the_data.data[0][0] + response + credits);

      break;
  }
}

the_bot.addListener("message", function (from, channel, msg) {
  var tester = msg.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(" ");
  
  if (tester[0].toLowerCase() != "!sq" || tester[1] == null) return;
  
  var command = tester[1];
  
  switch (command) {
    case "counters":
      if (tester[2] == null)  the_bot.say(from, "Please enter a champ you'd like counters for, ex: '!sq counters Temo'");
      else                    get_data(search_term(tester), command, from);
      break;
    case "champ":
      if (tester[2] == null)  the_bot.say(from, "Please enter a champ, ex: '!sq champ Alistar'");
      else                    get_data(search_term(tester), command, from);
      break;
    case "item":
      if (tester[2] == null)  the_bot.say(from, "Please enter a champ, ex: '!sq item Doran's Blade'");
      else                    get_data(search_term(tester), command, from);
      break;
    default:
      the_bot.say("#mjc", "sorry I dont recognize that command");
  }
});