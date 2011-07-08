class DEGAUCHE.Server
  constructor: (@address) ->
    @connected = false
    @client = null
    
  new_client: () ->
    if @address != null && @address != ''
      @client = new Faye.Client(@address);
    else
      null
      
  close: () ->
    @client.disconnect
