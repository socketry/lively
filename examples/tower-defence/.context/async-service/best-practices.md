# Best Practices

This guide outlines recommended patterns and practices for building robust, maintainable services with `async-service`.

## Application Structure

If you are creating an application that runs services, you should define a top level `services.rb` file that includes all your service configurations. This file serves as the main entry point for your services. If you are specifically working with the Falcon web server, this file is typically called `falcon.rb` for historical reasons.

### Service Configuration

Create a single top-level `service.rb` file as your main entry point:

```ruby
#!/usr/bin/env async-service

# Load your service configurations
require_relative "lib/my_library/environment/web_environment"
require_relative "lib/my_library/environment/worker_environment"

service "web" do
	include MyLibrary::Environment::WebEnvironment
end

service "worker" do 
	include MyLibrary::Environment::WorkerEnvironment
end
```

### Multiple Service Configurations

In some cases, you may want to define multiple service configurations, e.g. for different environments or deployment targets. In those cases, you may create `web_service.rb` or `job_service.rb`, but this usage should be discouraged.

## Library Structure

If you are creating a library that exposes services, use the following structure and guidelines:

### Directory Structure

Organize your code following these conventions:

```
├── service.rb
└── lib/
    └── my_library/
        ├── environment/
        │   ├── web_environment.rb
        │   ├── worker_environment.rb
        │   ├── database_environment.rb
        │   └── tls_environment.rb
        └── service/
            ├── web_service.rb
            └── worker_service.rb
```

### Environment Organization

Place environments in `lib/my_library/environment/`:

```ruby
# lib/my_library/environment/web_environment.rb
module MyLibrary
	module Environment
		module WebEnvironment
			include Async::Service::ManagedEnvironment
			
			def service_class
				MyLibrary::Service::WebService
			end
			
			def port
				3000
			end
			
			def host
				"localhost"
			end
		end
	end
end
```

### Service Organization

Place services in `lib/my_library/service/`:

```ruby
# lib/my_library/service/web_service.rb
module MyLibrary
	module Service
		class WebService < Async::Service::ManagedService
			private def format_title(evaluator, server)
				if server&.respond_to?(:connection_count)
					"#{self.name} [#{evaluator.host}:#{evaluator.port}] (#{server.connection_count} connections)"
				else
					"#{self.name} [#{evaluator.host}:#{evaluator.port}]"
				end
			end
			
			def run(instance, evaluator)
				# Start your service and return the server object.
				# Managed::Service handles container setup, health checking, and process titles.
				start_web_server(evaluator.host, evaluator.port)
			end
			
			private
			
			def start_web_server(host, port)
				# The return value of this method will be the server object which is returned from `run` and passed to `format_title`.
			end
		end
	end
end
```

### Use `Managed::Environment` for Services

Include {ruby Async::Service::ManagedEnvironment} for services that need robust lifecycle management using {ruby Async::Service::ManagedService}:

```ruby
module WebEnvironment
	include Async::Service::ManagedEnvironment
	
	def service_class
		WebService
	end
end
```

## Environment Best Practices

### Use Plain Modules

Prefer plain Ruby modules for environments:

```ruby
module DatabaseEnvironment
	def database_url
		"postgresql://localhost/app"
	end
	
	def max_connections
		10
	end
end
```

### One-to-One Service-Environment Correspondence

Maintain a 1:1 relationship between services and their primary environments:

```ruby
# Primary environment for WebService
module WebEnvironment
	def service_class
		WebService
	end
	
	# Default configuration:
	def port
		3000
	end
	
	def host
		"0.0.0.0"
	end
end

# Primary environment for WorkerService  
module WorkerEnvironment
	def service_class
		WorkerService
	end
	
	def queue_name
		"default"
	end
	
	def count
		4
	end
end
```

### Compose with Auxiliary Environments

Use additional environments for cross-cutting concerns:

```ruby
module WebEnvironment
	include DatabaseEnvironment
	include TLSEnvironment
	include LoggingEnvironment
	
	def service_class
		WebService
	end
end
```

## Service Best Practices

### Use `Managed::Service` as Base Class

Prefer `Async::Service::ManagedService` over `GenericService` for most services:

```ruby
class WebService < Async::Service::ManagedService
	# Managed::Service automatically handles:
	# - Container setup with proper options.
	# - Health checking with process title updates.
	# - Preloading of scripts before startup.
	
	private def format_title(evaluator, server)
		# Customize process title display
		"#{self.name} [#{evaluator.host}:#{evaluator.port}]"
	end
	
	def run(instance, evaluator)
		# Focus only on your service logic
		start_web_server(evaluator.host, evaluator.port)
	end
end
```

### Implement Meaningful Process Titles

Use the `format_title` method to provide dynamic process information:

```ruby
private def format_title(evaluator, server)
	# Good - Include service-specific info
	"#{self.name} [#{evaluator.host}:#{evaluator.port}]"
	
	# Better - Include dynamic runtime status
	if connection_count = server&.connection_count
		"#{self.name} [#{evaluator.host}:#{evaluator.port}] (C=#{format_count connection_count})"
	else
		"#{self.name} [#{evaluator.host}:#{evaluator.port}]"
	end
end
```

Try to keep process titles short and focused.

### Use `start` and `stop` Hooks for Shared Resources

Utilize the `start` and `stop` hooks to manage shared resources effectively:

```ruby
class WebService < Async::Service::ManagedService
	def start
		# Bind to the endpoint in the container:
		@endpoint = @evaluator.endpoint.bind
		
		super
	end
	
	def stop
		@endpoint&.close
	end
end
```

These hooks are invoked **before** the container is setup (e.g. pre-forking).

## Testing Best Practices

### Test Environments in Isolation

Test environment modules independently:

```ruby
# test/my_library/environment/web_environment.rb
describe MyLibrary::Environment::WebEnvironment do
	let(:environment) do
		Async::Service::Environment.build do
			include MyLibrary::Environment::WebEnvironment
		end
	end
	
	it "provides default port" do
		expect(environment.port).to be == 3000
	end
end
```

### Test Services with Service Controller

Use test environments for service testing:

```ruby
# test/my_library/service/web_service.rb
describe MyLibrary::Service::WebService do
	let(:environment) do
		Async::Service::Environment.build do
			include MyLibrary::Environment::WebEnvironment
		end
	end
	
	let(:evaluator) {environment.evaluator}
	let(:service) {evaluator.service_class(environment, evaluator)}
	let(:controller) {Async::Service::Controller.for(service)}
	
	before do
		controller.start
	end
	
	after do
		controller.stop
	end
	
	let(:uri) {URI "http://#{evaluator.host}:#{evaluator.port}"}
	
	it "responds to requests" do
		Net::HTTP.get(uri).tap do |response|
			expect(response).to be_a(Net::HTTPSuccess)
		end
	end
end
```

Note that full end-to-end service tests like this are typically slow and hard to isolate, so it's better to use unit tests for individual components whenever possible.
