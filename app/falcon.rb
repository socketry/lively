
require_relative 'lib/application'

load Lively::Environments::Application

host 'localhost', :lively do
	endpoint {Async::HTTP::Endpoint.parse('http://localhost:9292')}
end
