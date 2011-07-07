DEGAUCHE.extend({
  keyword: "scrolling_history",
  name: "Scrolling History",
  description: "Use the up and down arrows to scroll through your chat history",
  init: function() {
    // NOTE: in the keydown callback 'this' is the message_text element, so we'll just use 'ext' as the extension everywhere
    
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
  mafipulate_sending: function(packet) {
    var ext = this;
    ext.list.unshift(packet.message.text);
    ext.value = '';
    ext.position = 0;
    return packet;
  }
});
