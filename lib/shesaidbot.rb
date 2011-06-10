require 'eventmachine'
require 'faye'
require 'twss'

client = Faye::Client.new('http://192.168.1.110:9292/faye')

EM.run do
  # data = client.subscribe('/classifier/new')
  #  TWSS(data) do |data|
  #    @result = data.text
  #  end
   
  client.subscribe('/classifier/new') do |message|
    # puts @result
    # TWSS(message.text)
    # if TWSS(message.text) == false
      client.publish('/messages/new', {text: "That's what she said!", username: "Michael Scott", timestamp: Time.now} )
      # client.publish('/classifier/new', {text: "That's what she said!!!", username: "Michael Scott", timestamp: Time.now} )
    # end
  end
end