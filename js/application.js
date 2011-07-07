// DEcentralized Group AUgmented CHat, Extensibly (DEGAUCHE)
// (degauche makes you less uncouthly sinister!)


/* 
  THINK:
  - configurable servers / channels / composite layers
  - default server extension for getting new extensions, adding servers, etc
  - some extensions are UI-only, others are UI+server
  - consider cycling through extensions using a callback to enable asyncing
  
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
  
  Faye has outgoing and incoming extensions. we need that layer, and another layer for display, and one for absorbing things before sending them to faye: 
  - send stream: input, invoke, mafipulate, send_message_to_faye, faye extensions
  - receive stream: faye extensions, receive_message_from_faye, mafipulate, message_display
  
*/


// Some important stuff
var DEGAUCHE = {
  faye: false,
  servers: [],
  extensions: {}
};


// Some initialization stuff
$(function() {
  // try some servers
  DEGAUCHE.faye = new Faye.Client('http://ascri.be:9292/faye');
  DEGAUCHE.faye.subscribe('/messages/new', DEGAUCHE.receive_message_from_faye);
});


// MORE DEGAUCHERY


// send some things to the server
DEGAUCHE.input = function(message, layer) {
  if(_.isString(message)) message = {text: message};
  if(!message.text) return false;
  
  // keyword activation, like '/extension load scrolling_history'
  if(message.text.slice(0,1) == '/') {
    var splits = message.text.slice(1).split(/ /, 2);
    DEGAUCHE.invoke(splits[0], splits[1], message.text.slice(splits[0].length + splits[1].length + 3));
    return false; 
  }
  
  DEGAUCHE.send_message_to_faye(message, layer);
}

// transform three strings into a function call
DEGAUCHE.invoke = function(ext_keyword, command, params) {
  if(!DEGAUCHE.extensions[ext_keyword]) return false;
  if(!_.isFunction(DEGAUCHE.extensions[ext_keyword][command])) return false;
  DEGAUCHE.extensions[ext_keyword][command](params);
}


// i can send message?
DEGAUCHE.send_message_to_faye = function(message, layer) {
  // THINK: should we allow this to be called with a packet instead of a message?
  var packet = {message: message};

  // run through each extension (until message is false)
  $.each(DEGAUCHE.extensions, function(keyword, ext) {
    if(ext.mafipulate_sending) {
      packet = ext.mafipulate_sending(packet);
    };
    if(!packet) {return false;} // fail on false
  });

  // fail if there's no message left
  if(!packet || !packet.message) {
    return false;
  }

  // publish it
  // TODO: make this respect layers
  DEGAUCHE.faye.publish('/messages/new', packet.message);

  // publish event for message_sent handlers
  $.publish('message/sent', packet);

  return false;
};


// a message has arrived!
DEGAUCHE.receive_message_from_faye = function(data) {
  // build our packet
  // NOTE: packet.data should always be the raw data from faye. change packet.message as needed.
  var message = $.extend(true, {}, data);
  var packet = {data: data, message: message};

  // mafipulation for received messages
  $.each(DEGAUCHE.extensions, function(keyword, ext) {
    if(ext.mafipulate_received) {
      packet = ext.mafipulate_received(packet);
      if(!packet) {return false;}
    };
  });
  
  // fail if there's no message left
  if(!packet || !packet.message) {
    return false;
  }

  // publish event for message_display handlers
  $.publish('message/display', packet);
  
  /* 
    NOTES:
    - the extension that builds an interface widget is responsible for displaying things in it.
    - if your extension needs to display things in someone else's widget, call the widget display functions.
    - if you need to change the message to be posted in another's widget, do it in the mafipulation loop.
  */
};


// add an extension
DEGAUCHE.extend = function(ext) {
  if(!ext || !ext.keyword) { // TODO: put some stricter checking here
    $.error('That is not a valid degauche extension');
  }
  if(DEGAUCHE.extensions[ext.keyword]) {
    $.error('That extension has already been loaded');
  }
  DEGAUCHE.extensions[ext.keyword] = ext;
  if(typeof(ext.init) == 'function') {
    $(ext.init()); // fire when ready
  }
  if(typeof(ext.message_display) == 'function') {
    $.subscribe("message/display", ext.message_display); // catch messages for display
  }
  if(typeof(ext.message_sent) == 'function') {
    $.subscribe("message/sent", ext.message_sent); // catch messages after sending
  }
};

// remove an extension
DEGAUCHE.unextend = function(keyword) {
  if(DEGAUCHE.extensions[keyword]) {
    if(typeof(DEGAUCHE.extensions[keyword].message_display) == 'function') {
      $.unsubscribe("message/display", DEGAUCHE.extensions[keyword].message_display);
    }
    if(typeof(DEGAUCHE.extensions[keyword].message_sent) == 'function') {
      $.unsubscribe("message/sent", DEGAUCHE.extensions[keyword].message_sent);
    }
    if(typeof(DEGAUCHE.extensions[keyword].destroy) == 'function') {
      DEGAUCHE.extensions[keyword].destroy();
    }
    delete(DEGAUCHE.extensions[keyword]);
  }
}


// DEFAULT EXTENSIONS BELOW HERE

/*
  Extensions have a keyword and a description property.
  They can also implement the following functions:
  
  init: function() {}
  message_display: function(packet) {}
  message_sent: function(packet) {}
  mafipulate_received: function(packet) {return packet}
  mafipulate_sending: function(packet) {return packet}
  
  Additional extension functions can be called by other extensions as
  DEGAUCHE.extensions.ext_keyword.ext_function(params)
  or invoked using
  DEGAUCHE.invoke(ext_keyword, ext_function, params);
  but it's best to use pub/sub and mafipulation instead of directly calling other extensions (dependencies are bad)
*/


// BASIC EXTENSION
DEGAUCHE.basic_extension = {
  keyword: 'basic',
  description: "Some basic input / output stuff",
  init: function() {
    // variable declarations we want to clean on init() go inside. dirty variables live outside.
    var ext = this;
    
    // TODO: make this less gross
    // add the chat box and whatnot
    var content = '<div id="basic_extension_content"> <div id="chat_box"></div><div id="chat_form"><form accept-charset="UTF-8" method="post"><p><label for="message_username">Username</label><input id="message_username" name="message[username]" size="30" type="text" /></p><input id="message_text" name="message[text]" size="60" type="text"> <input type="submit" id="message_submit" name="commit" value="Send"></form></div></div>';
    $('#content').append(content);
        
    // set clicker
    $('#message_submit').click(ext.submit_message);
  },
  submit_message: function(e) {
    var ext = this;
    e.preventDefault();
    
    // copied from some mysterious online js distillery
    // TODO: remove this in favor of something more flexible
    // TODO: move this to somewhere less ridiculous
    var formatTime = function() {
      var dt = new Date();
      var hours = dt.getHours();
      var minutes = dt.getMinutes();
      var seconds = dt.getSeconds();
      if (hours < 10) hours = '0' + hours;
      if (minutes < 10) minutes = '0' + minutes;
      if (seconds < 10) seconds = '0' + seconds;
      return hours + ":" + minutes + ":" + seconds;
    };
    
    // build our message
    var message = {
      text: $('#message_text').val(),
      timestamp: formatTime(),
      username: $('#message_username').val(),
    };

    $('#message_text').val("");
    DEGAUCHE.input(message);
  },
  message_display: function(packet) {
    // no chat box? forgeddaboudit.
    var $chat_box = $('#chat_box');
    if(!$chat_box) {return false;}
    
    // the basic template
    var $html = $('<div class="message"> <div class="timestamp"></div> <div class="username"></div> <div class="text"></div> </div>');
    
    // fill in some values
    $('.text', $html).text(packet.message.text);
    $('.username', $html).text(packet.message.username);
    $('.timestamp', $html).text(packet.message.timestamp);
    
    // in case someone else wants to add things to the template
    if(packet.basic && packet.basic.html_extras) {
      $.each(packet.basic.html_extras, function(i, value) {
        $html.append(value);
      })
    }
    
    // display the message
    $chat_box.append($html);
    $chat_box.scrollTop(1000000);   
  },
  destroy: function() {
    $('#basic_extension_content').remove();
  }
};


// EXTENSION EXTENSION
DEGAUCHE.extension_extension = {
  keyword: 'extension',
  description: "Do basic extension management",
  init: function() {
    // variable declarations we want to clean on init() go inside. dirty variables live outside.
    var ext = this;
  },
  remote: function(params) {
    var ext = this;
    
    // TODO: make this respect layers
    $.getScript('http://ascri.be:9292/extensions.json', function() {
      var $html = $('<ul></ul>');
      var button = '';
      $.each(extensions, function(i, extension) {
        keyword = extension.slice(0, -3);
        if(DEGAUCHE.extensions[keyword]) {
          button = ' -- loaded';
        } else {
          button = '<button onclick="DEGAUCHE.extensions.extension.load(\'' + keyword + '\'); $(this).parent().text(\' -- loaded\'); $(this).remove(); ">Load</button>';
        }
        $html.append('<li>' + keyword + ' <span>' + button + '</span></li>');
      });

      var packet = {basic: {html_extras: $html}, message: true};
      $.publish('message/display', packet);
    });
  },
  list: function(params) {
    var ext = this,
        $html = $('<ul></ul>');
    
    $.each(DEGAUCHE.extensions, function(keyword, extension) {
      $html.append('<li><strong>' + keyword + '</strong>: ' + extension.description + '</li>');
    });
    
    var packet = {basic: {html_extras: $html}, message: true};
    $.publish('message/display', packet);
  },
  load: function(params) {
    var ext = this;
    var ext_keyword = params.split(/ /, 1)[0];
  
    $.getScript('http://ascri.be/extensions/' + ext_keyword + '.js');
  },
  unload: function(params) {
    var ext = this;
    var ext_keyword = params.split(/ /, 1)[0];
    
    DEGAUCHE.unextend(ext_keyword);
  }
};



/*
  TODO:
  -- extension unload command
  - add mistranscribe extension
  - add image extension (via url)
  - add audio extension
  - show invokable extensions on '/'
  - show invokable commands and ext description on '/ext'
  - local storage for DEGAUCHE (every time extensions/servers are modified)
  - chat history extension
  - show pending messages (w/ extension)
  
*/




// TODO: move this to an extension
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
  //  <div class="wrong_classification"><a href="#">Wrong?</a></div> <div class="classification"></div>
}




// TODO: move this into an extension
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
    }, true);
    audioElement.load()
    audioElement.play();
  }
}



// TODO: add this back in as an extension
  
// <div class='user'> 
//   <a href="/auth/twitter">Sign in with Twitter</a> 
// </div>      

