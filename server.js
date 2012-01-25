var http  = require("http");

var server  = http.createServer(function (req, res) {	  	
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("PONG");
}).listen(process.env.PORT || 3000);

var irc   = require("./lib/irc/irc.js");

var the_bot           = null;
var bot_disconnected  = false;

start_bot();

function start_bot () {
  the_bot = new irc.Client("irc.freenode.net", "soloqueue", { port: 6667, channels: ["#mjc"] });
  bot_disconnected = false;
  setup_bot_listeners(the_bot);  
}

var statusCheck = setInterval(function () {
  if (bot_disconnected) {
    start_bot();
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
      var derived_from_forums_tmp = the_data.data[0][1].counters.curated;
      var community_voted_tmp     = the_data.data[0][1].counters.community;
      var derived_from_forums     = "";
      var community_voted         = "";
      
      if (derived_from_forums_tmp != null) {
        derived_from_forums = derived_from_forums_tmp.join(",").replace(/,/g, ", ");
      }
      else {
        derived_from_forums = "n/a";
      }
      
      if (community_voted_tmp != null) {
        if (community_voted_tmp[0] != null) community_voted += community_voted_tmp[0][0] + (community_voted_tmp[0][1] != "" ? " (" + community_voted_tmp[0][1] + ")" : "");
        if (community_voted_tmp[1] != null) community_voted += ", " + community_voted_tmp[1][0] + (community_voted_tmp[1][1] != "" ? " (" + community_voted_tmp[1][1] + ")" : "");
        if (community_voted_tmp[2] != null) community_voted += ", " + community_voted_tmp[2][0] + (community_voted_tmp[2][1] != "" ? " (" + community_voted_tmp[2][1] + ")" : "");
      }
      else {
        community_voted = "n/a";
      }
      
      the_bot.say(from, the_data.data[0][0] + " counters: [Derived from Forums: " + derived_from_forums + "] [Community Voted: " + community_voted + "] [More on: http://www.soloqueue.com/#" + escape(the_data.data[0][0]) + "]");
                               
      break;
    default:
      the_bot.say(from, "Looks like something went wrong, try again and if this keeps happening contact");
  }
}

function setup_bot_listeners (the_bot) {
  the_bot.addListener("message", function (from, channel, msg) {
    var is_pm   = (channel.indexOf("#") == 0 ? false : true);
    var message = msg.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(" ");
        
    if (!is_pm && message[0].toLowerCase() != "!sq") return;

    var command = (is_pm ? message[0] : message[1]);
    switch (command) {
      case "help":
        the_bot.say(from, "The soloqueue bot is a service brought to you by, http://www.soloqueue.com, a League of Legends information hub.");
        the_bot.say(from, "Commands");
        the_bot.say(from, "--------");
        the_bot.say(from, "Champ Counters: '!sq counters CHAMP NAME'");
        
        break;
      case "counters":
        if ((is_pm ? message[1] : message[2]) == null) the_bot.say(from, "Please complete the command. Ex: Counters '!sq counters Teemo'");
        else get_data(search_term(message), command, (is_pm ? from : channel));
        
        break;
      default:
        the_bot.say((is_pm ? from : channel), "Sorry, " + from + " I dont recognize that command.");
    }
  });

  the_bot.addListener("bot_disconnected", function () {
    bot_disconnected = true;
  });
}