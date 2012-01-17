var http    = require("http");
var irc     = require("./irc.js");
var $       = require('jquery'); 

var server  = http.createServer(function (req, res) {
  res.writeHead(200, {
    "Content-Type":                 "application/json",
    "Access-Control-Allow-Origin":  "*"
  });
}).listen(process.env.PORT || 3000);

var the_bot = new irc.Client("irc.freenode.net", "soloqueue", { port: 6667, channels: ["#mjc"] });

function search_term (tester, from) {
  var tmp_search_term = tester;
  
  if (from == "channel")  tmp_search_term.splice(0, 2); 
  else                    tmp_search_term.splice(0, 1);
  
  return tmp_search_term.join();
}

function get_data (search_input, command, from) {  
  var options = {
    host:   "www.soloqueue.com",
    path:   "/api/" + search_input.replace(/[,]/g, "%20") + ".json",
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
    the_bot.say(from, "Sorry, the item or champ you requested data on couldn't be found.");
    return;
  }
  
  switch (command) {
    case "counters":
      var the_counters = the_data.data[0][1].counters;
      
      if (the_counters != null) the_bot.say(from, the_data.data[0][0] + " counters: " + the_counters.join(", ") + credits);
      else                      the_bot.say(from, the_data.data[0][0] + " counters: n/a" + credits);
                               
      break;
    case "champ":
      var found_champ = false;
      var html;
      var champ_name  = "";
      var response    = "";
      
      $.each(the_data.data, function () {
        html = this[1].wiki;
        
        if (!found_champ && $(html).size() != 1) {
          found_champ = true;
          
          champ_name = this[0];
          
          $.each($($(html).find("tr")[1]).find("td"), function () {
            response += " " + $(this).text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $(this).next().text().replace(/(\r\n|\n|\r)/gm, "");
          });
        }
      });
      
      if (found_champ)  the_bot.say(from, "Champion Name: " + champ_name + response + credits);
      else              the_bot.say(from, "Sorry, the champion you requested data on couldn't be found.");
      
      break;
    case "item":
      var found_item  = false;
      var html;
      var item_name   = "";
      var response    = "";
      
      $.each(the_data.data, function () {
        html = this[1].wiki;
        
        if (!found_item && $(html).size() == 1) {
          found_item  = true;
          
          item_name   = this[0];
          
          response += " " + $($(html).find("tr")[2]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[2]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
          response += " " + $($(html).find("tr")[3]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[3]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
          response += " " + $($(html).find("tr")[4]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[4]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
          response += " " + $($(html).find("tr")[5]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[5]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
          response += " " + $($(html).find("tr")[6]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[6]).find("td").text().replace(/(\r\n|\n|\r)/gm, "");
          response += " " + $($(html).find("tr")[7]).find("th").text().replace(/(\r\n|\n|\r)/gm, "") + ": " + $($(html).find("tr")[7]).find("td").text().replace(/(\r\n|\n|\r)/gm, ""); 
        }
      });
      
      if (found_item) the_bot.say(from, "Item Name: " + item_name + response + credits);
      else            the_bot.say(from, "Sorry, the item you requested data on couldn't be found.");
      
      break;
  }
}

the_bot.addListener("pm", function (from, msg) {
  var tester = msg.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(" ");
  
  var command = tester[0];
  
  switch (command) {
    case "counters":
      if (tester[1] == null)  the_bot.say(from, "Please enter a champ you'd like counters for, ex: '!sq counters Temo'");
      else                    get_data(search_term(tester, "pm"), command, from);
      break;
    case "champ":
      if (tester[1] == null)  the_bot.say(from, "Please enter a champ, ex: '!sq champ Alistar'");
      else                    get_data(search_term(tester, "pm"), command, from);
      break;
    case "item":
      if (tester[1] == null)  the_bot.say(from, "Please enter a champ, ex: '!sq item Doran's Blade'");
      else                    get_data(search_term(tester, "pm"), command, from);
      break;
    default:
      the_bot.say(from, "sorry I dont recognize that command");
  }
});

the_bot.addListener("message", function (from, channel, msg) {
  if (channel.indexOf("#") != 0) return;
  
  var tester = msg.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(" ");
  
  if (tester[0].toLowerCase() != "!sq" || tester[1] == null) return;
  
  var command = tester[1];
  
  switch (command) {
    // Only need this when testing reconnect shit
    // case "quit":
    //   the_bot.disconnect("later");
    case "counters":
      if (tester[2] == null)  the_bot.say(from, "Please enter a champ you'd like counters for, ex: '!sq counters Temo'");
      else                    get_data(search_term(tester, "channel"), command, from);
      break;
    case "champ":
      if (tester[2] == null)  the_bot.say(from, "Please enter a champ, ex: '!sq champ Alistar'");
      else                    get_data(search_term(tester, "channel"), command, from);
      break;
    case "item":
      if (tester[2] == null)  the_bot.say(from, "Please enter a champ, ex: '!sq item Doran's Blade'");
      else                    get_data(search_term(tester, "channel"), command, from);
      break;
    default:
      the_bot.say("#mjc", "sorry I dont recognize that command");
  }
});

// This is suppose to reconnect the bot... but somethings broke
the_bot.addListener("bot_disconnected", function () {
  //the_bot.connect();
});