class ExtensionsList
  def initialize(app)
    @app = app
  end

  def call(env)
    req = Rack::Request.new(env)
    if req.path == "/extensions.json"
      dir = File.expand_path(File.join(File.dirname(__FILE__), '..', 'extensions'))
      response = JSON::generate(Dir.entries(dir).select {|f| f =~ /\.js$/ })
      puts response.inspect
      [ 200, {"Content-Type" => "text/javascript"}, [response] ]
    else
      @app.call(env)
    end
  end

end
