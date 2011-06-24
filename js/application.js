// DEcentralized Group AUgmented CHat, Extensibly (DEGAUCHE)


// TODO: push DEGAUCHE into local storage (every time extensions/servers are modified), and check for it up here

/* THINK:
    - configurable servers / channels / composite layers
    - default server extension for getting new extensions, adding servers, etc
    - some extensions are UI-only, others are UI+server
    - 
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
  DEGAUCHE.faye.subscribe('/messages/new', DEGAUCHE.receive_message);

  // basic DOM bindings:
  // TODO: reconfigure this to allow plugins to provide alternate calls to send_message
  $('#message_submit').click(DEGAUCHE.send_message);
});


// MORE DEGAUCHERY


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


// a message has arrived!
DEGAUCHE.receive_message = function(data) {
  // build a dummy message using the default template
  // THINK: consider offlining some of this default stuff
  var message = $($('#message_template').html());
  $('.text', message).html(data.text);
  $('.username', message).text(data.username);
  $('.timestamp', message).text(data.timestamp);

  // THINK: this is kind of ugly
  var packet = {data: data, message: message};

  // run through each extension (until message is false)
  for (var i=0; i < DEGAUCHE.extensions.length; i++) {
    if(DEGAUCHE.extensions[i].receive) {
      packet = DEGAUCHE.extensions[i].receive(packet);
    };
    if(!packet) {continue;} // fail on false
  };

  // if we've got a message, lets display it
  if(packet && packet.message) {
    $('#chat_box').append(packet.message);
    $('#chat_box').scrollTop(1000000);    
  }
};


// i can send message?
DEGAUCHE.send_message = function(e) {
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
    if(DEGAUCHE.extensions[i].send) {
      packet = DEGAUCHE.extensions[i].send(packet);
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

  // publish
  DEGAUCHE.faye.publish('/messages/new', packet.message);

  return false;
};


// add an extension
DEGAUCHE.extend = function(object) {
  if(!object || !object.name) { // TODO: put some stricter checking here
    $.error('That is not a valid degauche extension');
  }
  DEGAUCHE.extensions.push(object);
  if(typeof(object.init) == 'function') {
    $(object.init()); // fire when ready
  }
};

// remove an extension
DEGAUCHE.unextend = function(keyword) {
  MSTRNSCRB.extensions = _.reject(MSTRNSCRB.extensions, function(extension){ return extension.keyword == keyword; });
}


// DEFAULT EXTENSIONS BELOW HERE

/*
  Extensions have a name and description property.
  They can also implement the following functions:
  init: function() {}
  keydown: function(e) {return false;}
  receive: function(packet) {return packet}
  send: function(packet) {return packet}
*/

DEGAUCHE.extend({
  name: "Server fun",
  description: "Contact the server and do basic extension management",
  init: function() {
    // variable declarations we want to clean on init() go inside. dirty variables live outside.
    var ext = this;
  },
  receive: function(packet) {return packet},
  send: function(packet) {
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
});





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

