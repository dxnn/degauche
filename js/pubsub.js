(function($){

  // Create a "dummy" jQuery object on which to bind, unbind and trigger event
  // handlers. Note that $({}) works in jQuery 1.4.3+, but because .unbind on
  // a "plain object" throws errors in older versions of jQuery, an element is
  // used here.
  var o = $({});

  // Subscribe to a topic. Works just like bind, except the passed handler
  // is wrapped in a function so that the event object can be stripped out.
  // Even though the event object might be useful, it is unnecessary and
  // will only complicate things in the future should the user decide to move
  // to a non-$.event-based pub/sub implementation.
  $.subscribe = function( topic, fn ) {

    // Call fn, stripping out the 1st argument (the event object).
    function wrapper() {
      return fn.apply( this, Array.prototype.slice.call( arguments, 1 ) );
    }

    // Add .guid property to function to allow it to be easily unbound. Note
    // that $.guid is new in jQuery 1.4+, and $.event.guid was used before.
    wrapper.guid = fn.guid = fn.guid || ( $.guid ? $.guid++ : $.event.guid++ );

    // Bind the handler.
    o.bind( topic, wrapper );
  };

  // Unsubscribe from a topic. Works exactly like unbind.
  $.unsubscribe = function() {
    o.unbind.apply( o, arguments );
  };

  // Publish a topic. Works exactly like trigger.
  $.publish = function() {
    o.trigger.apply( o, arguments );
  };

})(jQuery);









// /* 
// 
//  jQuery pub/sub plugin by Peter Higgins (dante@dojotoolkit.org)
// 
//  Loosely based on Dojo publish/subscribe API, limited in scope. Rewritten blindly.
// 
//  Original is (c) Dojo Foundation 2004-2009. Released under either AFL or new BSD, see:
//  http://dojofoundation.org/license for more information.
// 
// */ 
// 
// ;(function(d){
// 
//  // the topic/subscription hash
//  var cache = {};
// 
//  d.publish = function(/* String */topic, /* Array? */args){
//    // summary: 
//    //    Publish some data on a named topic.
//    // topic: String
//    //    The channel to publish on
//    // args: Array?
//    //    The data to publish. Each array item is converted into an ordered
//    //    arguments on the subscribed functions. 
//    //
//    // example:
//    //    Publish stuff on '/some/topic'. Anything subscribed will be called
//    //    with a function signature like: function(a,b,c){ ... }
//    //
//    //  |   $.publish("/some/topic", ["a","b","c"]);
//    d.each(cache[topic], function(){
//      this.apply(d, args || []);
//    });
//  };
// 
//  d.subscribe = function(/* String */topic, /* Function */callback){
//    // summary:
//    //    Register a callback on a named topic.
//    // topic: String
//    //    The channel to subscribe to
//    // callback: Function
//    //    The handler event. Anytime something is $.publish'ed on a 
//    //    subscribed channel, the callback will be called with the
//    //    published array as ordered arguments.
//    //
//    // returns: Array
//    //    A handle which can be used to unsubscribe this particular subscription.
//    //  
//    // example:
//    //  | $.subscribe("/some/topic", function(a, b, c){ /* handle data */ });
//    //
//    if(!cache[topic]){
//      cache[topic] = [];
//    }
//    cache[topic].push(callback);
//    return [topic, callback]; // Array
//  };
// 
//  d.unsubscribe = function(/* Array */handle){
//    // summary:
//    //    Disconnect a subscribed function for a topic.
//    // handle: Array
//    //    The return value from a $.subscribe call.
//    // example:
//    //  | var handle = $.subscribe("/something", function(){});
//    //  | $.unsubscribe(handle);
//    
//    var t = handle[0];
//    cache[t] && d.each(cache[t], function(idx){
//      if(this == handle[1]){
//        cache[t].splice(idx, 1);
//      }
//    });
//  };
// 
// })(jQuery);
// 
