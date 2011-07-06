// DEcentralized Group AUgmented CHat, Extensibly (DEGAUCHE)


// TODO: push DEGAUCHE into local storage (every time extensions/servers are modified), and check for it up here

/* 
  THINK:
  - configurable servers / channels / composite layers
  - default server extension for getting new extensions, adding servers, etc
  - some extensions are UI-only, others are UI+server
  - keyword for extensions makes a lot of sense... but is slightly messy, since some extensions consume everything
  
  
  Things you'll want to do with stuff:
  - add a server
  - remove a server
  - add a channel
  - remove a channel
  - listen to incoming signals on a server/channel (layers?)
  - listen to outgoing signals on a server/channel (layers?)
  - publish on a server/channel (layers?)
  - add structure
  - respond to events on structure
  
  Or... maybe throw XMPP behind this for s2s con4s8ion.
  
  Faye has outgoing and incoming extensions. we need that layer, and another layer for display, and one for absorbing things before sending them to faye. input, [invoke], mefipulate, faye [extensions]
  
*/


// Some important stuff
var DEGAUCHE = {
  faye: false,
  servers: [],
  extensions: []
};





// Some initialization stuff
$(function() {
  // try some servers
  DEGAUCHE.faye = new Faye.Client('http://ascri.be:9292/faye');
  DEGAUCHE.faye.subscribe('/messages/new', DEGAUCHE.process_message_from_faye);
});


// MORE DEGAUCHERY


// transform three strings into a function call
DEGAUCHE.invoke = function(ext_keyword, command, params) {
  if(!DEGAUCHE.extensions[ext_keyword]) return false;
  if(!_.isFunction(DEGAUCHE.extensions[ext_keyword][command])) return false;
  DEGAUCHE.extensions[ext_keyword][command](params.split(/ /));
}

// send some things to the server
DEGAUCHE.input = function(message, layer) {
  if(_.isString(message)) message = {text: message + ''};
  if(!message.text) return false;
  
  // keyword activation, like '/server add subdomain.ascri.be'
  if(message.text.slice(0,1) == '/') {
    var splits = message.text.slice(1).split(/ /, 2);
    DEGAUCHE.invoke(splits[0], splits[1], message.text.slice(splits[0].length + splits[1].length + 3));
    return false;
  }
}


// copied from some mysterious online js distillery
// TODO: remove this in favor of something more flexible
DEGAUCHE.formatTime = function() {
  var dt = new Date();
  var hours = dt.getHours();
  var minutes = dt.getMinutes();
  var seconds = dt.getSeconds();
  if (hours < 10) hours = '0' + hours;
  if (minutes < 10) minutes = '0' + minutes;
  if (seconds < 10) seconds = '0' + seconds;
  return hours + ":" + minutes + ":" + seconds;
}


// i can send message?
DEGAUCHE.send_message_to_faye = function(e) {
  e.preventDefault();

  // THINK: this is kind of silly
  var message = {
    text: $('#message_text').val(),
    timestamp: DEGAUCHE.formatTime(),
    username: $('#message_username').val(),
  };

  // THINK: this is kind of weird
  var packet = {message: message};

  // run through each extension (until message is false)
  for (var i=0; i < DEGAUCHE.extensions.length; i++) {
    if(DEGAUCHE.extensions[i].on_send) {
      packet = DEGAUCHE.extensions[i].on_send(packet);
    };
    if(!packet) {continue;} // fail on false
  };

  // clear the message box (can we put this somewhere nicer?)
  $('#message_text').val("");

  // fail if there's no message left
  if(!packet.message) {
    return false;
  }

  // TODO: figure out what to do with dirty messages... should be scrubbing on the server side, maybe with a Faye extension

  // publish it
  DEGAUCHE.faye.publish('/messages/new', packet.message);

  return false;
};


// a message has arrived!
DEGAUCHE.process_message_from_faye = function(data) {
  // build our packet
  // NOTE: packet.data should always be the raw data from faye. change packet.message as needed.
  var message = $.extend(true, {}, data);
  var packet = {data: data, message: message};

  // extension incoming modulation
  for (var i=0; i < DEGAUCHE.extensions.length; i++) {
    if(DEGAUCHE.extensions[i].mefipulate_incoming) {
      packet = DEGAUCHE.extensions[i].mefipulate_incoming(packet);
    };
  };
  
  // publish 'display_message' event
  $.publish('display/message', packet);
  
  /* 
    NOTES:
    - the extension that builds an interface widget is responsible for displaying things in it.
    - if your extension needs to display things in someone else's widget, call the widget display functions.
    - if you need to change the message to be posted in another's widget, do it in the message_modulation loop.
  */
};


// add an extension
DEGAUCHE.extend = function(ext) {
  if(!ext || !ext.keyword) { // TODO: put some stricter checking here
    $.error('That is not a valid degauche extension');
  }
  DEGAUCHE.extensions.push(ext);
  if(typeof(ext.init) == 'function') {
    $(ext.init()); // fire when ready
  }
  if(typeof(ext.display_message) == 'function') {
    $.subscribe("display/message", ext.display_message); // catch messages for display
  }
};

// remove an extension
DEGAUCHE.unextend = function(keyword) {
  MSTRNSCRB.extensions = _.reject(MSTRNSCRB.extensions, function(extension){ return extension.keyword == keyword; });
}


// DEFAULT EXTENSIONS BELOW HERE

/*
  Extensions have a keyword, a name and a description property.
  They can also implement the following functions:
  init: function() {}
  display_message: function(message) {}
  mefipulate_incoming: function(packet) {return packet}
  mefipulate_outgoing: function(packet) {return packet}
  on_send: function(packet) {return packet}
  Additional extension functions can be called by other extensions as
  DEGAUCHE.extensions.ext_keyword.ext_function()
  but it's best to use pub/sub and modulation instead of directly calling other extensions (dependencies are bad)
*/


// BASIC EXTENSION
DEGAUCHE.basic_extension = {
  keyword: 'basic',
  name: "Basic",
  description: "Some basic input / output stuff",
  init: function() {
    // variable declarations we want to clean on init() go inside. dirty variables live outside.
    var ext = this;
    
    // TODO: make this less gross
    // add the chat box and whatnot
    var content = '<div id="chat_box"></div><div id="chat_form"><form accept-charset="UTF-8" method="post"><p><label for="message_username">Username</label><input id="message_username" name="message[username]" size="30" type="text" /></p><input id="message_text" name="message[text]" size="60" type="text"> <input type="submit" id="message_submit" name="commit" value="Send"></form></div>';
    $('#content').append(content);
        
    // set clicker
    $('#message_submit').click(DEGAUCHE.send_message_to_faye);
  },
  display_message: function(message) {
    // handle a packet, a message, or a string as either an html chunk or plain text
    
    // build a message using the default template
    var message = $($('#message_template').html());
    $('.text', message).html(data.text);
    $('.username', message).text(data.username);
    $('.timestamp', message).text(data.timestamp);

    // TODO: make this less icky
    var message_string = '<div id="message_template" style="display:none"> <div class="message"> <div class="timestamp"></div> <div class="wrong_classification"><a href="#">Wrong?</a></div> <div class="classification"></div> <div class="username"></div> <div class="text"></div> </div> </div>';

    // display the message
    if(message) {
      $('#chat_box').append(message);
      $('#chat_box').scrollTop(1000000);    
    }
  }
};


// SERVER EXTENSION
DEGAUCHE.server_extension = {
  keyword: 'server',
  name: "Server fun",
  description: "Contact the server and do basic extension management",
  init: function() {
    // variable declarations we want to clean on init() go inside. dirty variables live outside.
    var ext = this;
  },
  on_send: function(packet) {
    var ext = this;
    var text = packet.message.text;
    
    if(text.indexOf('/server list extensions') === 0) {
      $.getJSON('http://ascri.be:9292/extensions.json', function(data) {
        alert(data);
      });
      
      return false;
    }
    
    if(text.indexOf('/server add extension ') === 0) {
      // TODO: this doesn't work cross domain...
      var ext_file = text.slice(22);
      // $('<script src="http://ascri.be/extensions/' + ext_file + '.js" type="text/javascript"></script>').appendTo('head');
      $.getScript('http://ascri.be/extensions/' + ext_file + '.js');
      return false;
    }
    
    return packet;
  }
};



/*
  TODO:
  - show pending messages
*/



// - request extension list from server

// - request specific extension from server for install
  // - note the install request

// - accept requested extension and add it to our local extension repository
  // - check for install request; remove or error
  // - populate keyword, name, desc into extensions
  // - copy JS into extensions (eval?)
  // - run init

// -- on message send
  // -- run through each extension (until false)
  // -- if not false, publish to /messages/new

// -- on message receive
  // -- run through each extension (until false)
  // -- not false? show in chatbox





// TODO: move this to a extension
DEGAUCHE.classification = function() {
  $('.classification', message).text(data.classification);

  $('.wrong_classification a', message).click(function(e) {
    e.preventDefault();

    var that = $(this), options = "<select>", drop_down;

    $.each(["", "Love", "Joy", "Sadness", "Fear", "Anger", "Surprise"], function(i,sentiment) {
      options = options + '<option value="' + sentiment + '">' + sentiment + '</option>'
    });

    drop_down = $(options + '</select>');

    drop_down.select(function() {
      var dropd = $(this);

      DEGAUCHE.faye.publish('/classifier/wrong', {
        text: "love!",
        username: dropd.val()
      });

      dropd.remove();
    });

    drop_down.insertAfter(that);
    that.remove();
  });
}




// TODO: move this to a extension
DEGAUCHE.audio = function() {
  if($('#message_text').val().indexOf('/play ') === 0) {
    // make some music
    var sound_map = {
      "bounce": "http://rpg.hamsterrepublic.com/wiki-images/d/d7/Oddbounce.ogg",
      "cancel": "http://rpg.hamsterrepublic.com/wiki-images/5/5e/Cancel8-Bit.ogg",
      "hit": "http://rpg.hamsterrepublic.com/wiki-images/7/7c/SmallExplosion8-Bit.ogg"
    }
    var sound_key = $('#message_text').val().substring(6);
    var sound_url = sound_map[sound_key];
    var audioElement = document.createElement('audio');
    audioElement.setAttribute('src', sound_url);
    audioElement.addEventListener("load", function() {
      audioElement.play();
      $(".duration span").html(audioElement.duration);
      $(".filename span").html(audioElement.src);
    }, true);
    audioElement.load()
    audioElement.play();
  } else {
    // send to our shiny new interceptor
    DEGAUCHE.faye.publish('/interceptor/new', {
      username: $('#message_username').val(),
      timestamp: DEGAUCHE.formatTime(),
      text: $('#message_text').val()
    });
  }
}



// TODO: add this back in as an extension
  
// <div class='user'> 
//   <a href="/auth/twitter">Sign in with Twitter</a> 
// </div>      

