var http    = require("http");
var irc     = require("./irc.js");
var $       = require('jquery'); 

var server  = http.createServer(function (req, res) {
  res.writeHead(200, {
    "Content-Type":                 "application/json",
    "Access-Control-Allow-Origin":  "*"
  });
}).listen(process.env.PORT || 3000);

var the_bot = new irc.Client("irc.quakenet.org", "soloqueue", { port: 6667, channels: ["#soloqueue"] });
var bot_disconnected = false;
setup_bot_listeners(the_bot);

var statusCheck = setInterval(function () {
  if (bot_disconnected) {
    bot_disconnected = false;
    the_bot = new irc.Client("irc.quakenet.org", "soloqueue", { port: 6667, channels: ["#soloqueue"] });
    setup_bot_listeners(the_bot);
  }
}, 2000);

function search_term (tester) {
  var tmp_search_term = tester;
  
  if (tmp_search_term[0] == "!sq") tmp_search_term.splice(0,1);
  
  tmp_search_term.splice(0, 1);
  
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
  
  if (the_data.data.length == 0) {
    the_bot.say(from, "Sorry, the item or champ you requested data on couldn't be found.");
    return;
  }
  
  switch (command) {
    case "counters":
      the_bot.say(from, the_data.data[0][0] + " counters: " + (the_data.data[0][1] != null ? the_data.data[0][1].counters.join(", ") : "n/a") + " [More on: http://www.soloqueue.com/#" + escape(the_data.data[0][0]) + "]");
                               
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
      
      if (found_champ)  the_bot.say(from, "Champion Name: " + champ_name + response + " [More on: http://www.soloqueue.com/#" + escape(champ_name) + "]");
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
      
      if (found_item) the_bot.say(from, "Item Name: " + item_name + response + " [More on: http://www.soloqueue.com/#" + escape(item_name) + "]");
      else            the_bot.say(from, "Sorry, the item you requested data on couldn't be found, maybe try searching on http://www.soloqueue.com/");
      
      break;
  }
}

function setup_bot_listeners (the_bot) {
  the_bot.addListener("message", function (from, channel, msg) {
    var is_pm = (channel.indexOf("#") == 0 ? false : true);
    
    var message = msg.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(" ");
        
    if (!is_pm && message[0].toLowerCase() != "!sq") return;

    var command = (is_pm ? message[0] : message[1]);
    
    if (command == "help") {
      the_bot.say(from, "The soloqueue bot is a service brought to you by, http://www.soloqueue.com, a League of Legends information hub.");
      the_bot.say(from, "Commands");
      the_bot.say(from, "--------");
      the_bot.say(from, "Item Search: '!sq item ITEM NAME'");
      the_bot.say(from, "Champ Search: '!sq champ CHAMP NAME'");
      the_bot.say(from, "Champ Counters: '!sq counters CHAMP NAME'");
      return;
    }
    
    if (command == "counters" || command == "champ" || command == "item") {
      if ((is_pm ? message[1] : message[2]) == null) the_bot.say(from, "Please complete the command. Ex: Counters '!sq counters Teemo' - Champ Info '!sq champ Alistar' - Item Info '!sq item Doran'");
      else get_data(search_term(message), command, (is_pm ? from : channel));
    }
    else {
      the_bot.say((is_pm ? from : channel), "Sorry, " + from + " I dont recognize that command.");
    }
  });

  the_bot.addListener("bot_disconnected", function () {
    bot_disconnected = true;
  });
}