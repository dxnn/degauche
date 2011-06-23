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
  DEGAUCHE.faye = new Faye.Client('http://127.0.0.1:9292/faye');
  DEGAUCHE.faye.subscribe('/messages/new', DEGAUCHE.receive_message);

  // basic DOM bindings:
  // TODO: reconfigure this to allow plugins to provide alternate calls to send_message
  $('#message_submit').click(DEGAUCHE.send_message);

  // load extensions and run their init functions
  for (var i=0; i < DEGAUCHE.extensions.length; i++) {
    if(DEGAUCHE.extensions[i].init) {
      DEGAUCHE.extensions[i].init();
    }
  }
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
    if(DEGAUCHE.extensions[i].incoming) {
      packet = DEGAUCHE.extensions[i].incoming(packet);
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
    if(DEGAUCHE.extensions[i].outgoing) {
      packet = DEGAUCHE.extensions[i].outgoing(packet);
    };
    if(!packet) {continue;} // fail on false
  };

  // fail if there's no message left
  if(!message) {
    return false;
  }

  // TODO: figure out what to do with dirty messages... should be scrubbing on the server side, maybe with a Faye extension

  // publish
  DEGAUCHE.faye.publish('/messages/new', message);

  // clear the message box (can we put this somewhere nicer?)
  $('#message_text').val("");
  return false;
};


// add an extension
DEGAUCHE.extend = function(object) {
  if(!object || !object.name) { // TODO: put some stricter checking here
    $.error('That is not a valid degauche extension');
  }
  DEGAUCHE.extensions.push(object);
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
  incoming: function(packet) {return packet}
  outgoing: function(packet) {return packet}
*/



DEGAUCHE.extend({
  name: "Chat History",
  description: "Use the up and down arrows to scroll through your chat history",
  init: function() {
    // NOTE: in the keydown callback 'this' is the message_text element, so we'll use 'ext' as the extension everywhere
    
    // NOTE: keep your variable declarations inside init instead of in the object, so they'll be scrubbed clean if we reinitialize from local data
    var ext = this;
    ext.list = [];
    ext.value = '';
    ext.position = 0;
    
    // build the keydown function

    $('#message_text').keydown(function(e) {
      // TODO: refactor these two blocks into one
      // TODO: port over pattern matching code
      if(e.keyCode == 38) { // up arrow goes up in history
        if(ext.position == 0) {
          ext.value = $('#message_text').val();
        }

        var history_value = ext.list[ext.position];
        if(history_value) {
          $('#message_text').val(history_value);
        }

        ext.position++;

        if(ext.position >= ext.list.length) {
          ext.position = ext.list.length - 1;
        }
      }

      if(e.keyCode == 40) { // down arrow goes down in history
        ext.position--;

        var history_value = ext.list[ext.position];
        if(history_value) {
          $('#message_text').val(history_value);
        }

        if(ext.position < 0) {
          $('#message_text').val(ext.value);
          ext.position = 0;
        }
      }
    });
  },
  incoming: function(packet) {return packet},
  outgoing: function(packet) {
    var ext = this;
    ext.list.unshift(packet.message.text);
    ext.value = '';
    ext.position = 0;
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

