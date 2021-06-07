
require_relative 'lib/application'

load Lively::Environments::Application

host 'localhost', :lively do
	count 1
	
	endpoint {Async::HTTP::Endpoint.parse('http://localhost:9292')}
end
