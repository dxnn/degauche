require 'faye'

faye_server = Faye::RackAdapter.new(:mount => '/faye', :timeout => 45)
run faye_server


# class ServerLog
#   def incoming(message, callback)
#     puts message
# 
#     # Call the server back now we're done
#     callback.call(message)
#   end
# end

# faye_server.add_extension(ServerLog.new)