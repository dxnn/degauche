require 'faye'
require './lib/extensions_list'

use ExtensionsList
use Faye::RackAdapter, :mount => '/faye', :timeout => 45

# serve static files from './public'
@root = File.expand_path(File.join(File.dirname(__FILE__), "public"))
run Proc.new { |env|
  # Extract the requested path from the request
  req = Rack::Request.new(env)
  index_file = File.join(@root, req.path_info, "index.html")

  if File.exists?(index_file)
    # Rewrite to index
    req.path_info += "index.html"
  end
  # Pass the request to the directory app
  Rack::Directory.new(@root).call(env)
}

