// Group Chat With Plugins n' Stuff (GCWPS)

// we're using GCWPS as a kind of poor-man's namespacing
GCWPS = {};
GCWPS.faye = false;

$(function() {
  // TODO: this is just here to get the server's IP. remove it once server connection changes are complete.
  $.getJSON('/faye_url.json', function(data) {
    if(data.length) {
      load_chat_interface(data);
      console.log(data);
    } else {
      alert('Cannot get Faye IP');
    }
  });

  function load_chat_interface(faye_url) {
    GCWPS.faye = new Faye.Client(faye_url+"/faye");

    GCWPS.faye.subscribe('/messages/new', GCWPS.incoming_message);

    $('#message_submit').click(GCWPS.outgoing_message);

    // TODO: move this into the history plugin, and generalize keydown parsing
    $('#message_text').keydown(GCWPS.check_keydown);

    // load plugins and run their init functions
    $.each(GCWPS.PLUGINS, function(keyword, plugin) {
      plugin.init();
    });
  }

}); 


// PLUGINS LIVE HERE (for now. they'll be dynamic later.)

GCWPS.PLUGINS = {};

GCWPS.PLUGINS.chat_history = {
  name: "Chat History",
  description: "Use the up and down arrows to scroll through your chat history",
  keydown: function(e) {
    if(e.keyCode == 38) { // up arrow goes up in history
      if(GCWPS.PLUGINS.chat_history.position == 0) {
        GCWPS.PLUGINS.chat_history.value = $('#message_text').val();
      }

      var history_value = GCWPS.PLUGINS.chat_history.list[GCWPS.PLUGINS.chat_history.position];
      if(history_value) {
        $('#message_text').val(history_value);
      }

      GCWPS.PLUGINS.chat_history.position++;

      if(GCWPS.PLUGINS.chat_history.position >= GCWPS.PLUGINS.chat_history.list.length) {
        GCWPS.PLUGINS.chat_history.position = GCWPS.PLUGINS.chat_history.list.length - 1;
      }
    }

    if(e.keyCode == 40) { // down arrow goes down in history
      GCWPS.PLUGINS.chat_history.position--;

      var history_value = GCWPS.PLUGINS.chat_history.list[GCWPS.PLUGINS.chat_history.position];
      if(history_value) {
        $('#message_text').val(history_value);
      }

      if(GCWPS.PLUGINS.chat_history.position < 0) {
        $('#message_text').val(GCWPS.PLUGINS.chat_history.value);
        GCWPS.PLUGINS.chat_history.position = 0;
      }
    }
  },
  init: function() {
    GCWPS.PLUGINS.chat_history.list = [];
    GCWPS.PLUGINS.chat_history.value = '';
    GCWPS.PLUGINS.chat_history.position = 0;
  },
  incoming: function(packet) {return packet},
  outgoing: function(packet) {
    GCWPS.PLUGINS.chat_history.list.unshift($('#message_text').val());
    GCWPS.PLUGINS.chat_history.value = '';
    GCWPS.PLUGINS.chat_history.position = 0;
    return packet;
  }
};


// a message has arrived!
GCWPS.incoming_message = function(data) {
  // build a dummy message using the default template
  // THINK: consider offlining some of this default stuff
  var message = $($('#message_template').html());
  $('.text', message).html(data.text);
  $('.username', message).text(data.username);
  $('.timestamp', message).text(data.timestamp);
  
  // THINK: this is kind of ugly
  var packet = {data: data, message: message};
  
  // run through each plugin (until message is false)
  $.each(GCWPS.PLUGINS, function(keyword, plugin) {
    if(plugin.incoming) {
      packet = plugin.incoming(packet);
    }
    if(!packet) {return false;}
  });
  
  // if we've got a message, lets display it
  if(packet && packet.message) {
    $('#chat_box').append(packet.message);
    $('#chat_box').scrollTop(1000000);    
  }
};


// i can send message?
GCWPS.outgoing_message = function(e) {
  e.preventDefault();

  // THINK: this is kind of ugly
  var message = {
    text: $('#message_text').val(),
    timestamp: GCWPS.formatTime(),
    username: $('#message_username').val(),
  };
  
  // run through each plugin (until message is false)
  $.each(GCWPS.PLUGINS, function(keyword, plugin) {
    if(plugin.outgoing) {
      message = plugin.outgoing(message);
    }
    if(!message) {return false;}
  });
  
  // fail if there's no message left
  if(!message) {
    return false;
  }
  
  // TODO: figure out what to do with dirty messages... should be scrubbing on the server side, maybe with a Faye plugin
  
  // publish
  GCWPS.faye.publish('/messages/new', message);

  // clear the message box (can we put this somewhere nicer?)
  $('#message_text').val("");
  return false;
};


// check keydowns for sneaky stuff
GCWPS.check_keydown = function(e) {
  $.each(GCWPS.PLUGINS, function(keyword, plugin) {
    if(plugin.keydown) {
      plugin.keydown(e);
    }
  });
}



// - request plugin list from server

// - request specific plugin from server for install
  // - note the install request
  
// - accept requested plugin and add it to our local plugin repository
  // - check for install request; remove or error
  // - populate keyword, name, desc into plugins
  // - copy JS into PLUGINS (eval)
  // - run init

// - on message send
  // - run through each plugin (until false)
  // - if not false, publish to /messages/new

// - on message receive
  // - run through each plugin (until false)
  // - not false? show in chatbox




// copied from some mysterious online js distillery
GCWPS.formatTime = function() {
  var dt = new Date();
  var hours = dt.getHours();
  var minutes = dt.getMinutes();
  var seconds = dt.getSeconds();
  if (hours < 10) hours = '0' + hours;
  if (minutes < 10) minutes = '0' + minutes;
  if (seconds < 10) seconds = '0' + seconds;
  return hours + ":" + minutes + ":" + seconds;
}



// TODO: move this to a plugin
GCWPS.classification = function() {
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

      GCWPS.faye.publish('/classifier/wrong', {
        text: "love!",
        username: dropd.val()
      });

      dropd.remove();
    });

    drop_down.insertAfter(that);
    that.remove();
  });
}




// TODO: move this to a plugin
GCWPS.audio = function() {
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
    GCWPS.faye.publish('/interceptor/new', {
      username: $('#message_username').val(),
      timestamp: GCWPS.formatTime(),
      text: $('#message_text').val()
    });
  }
  
}