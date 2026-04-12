# Getting Started

This guide explains how to get started with `async-service` to create and run services in Ruby.

## Installation

Add the gem to your project:

```bash
$ bundle add async-service
```

## Core Concepts

`async-service` has several core concepts:

- A {ruby Async::Service::GenericService} which represents the base class for implementing services.
- A {ruby Async::Service::Configuration} which manages service configurations and environments.
- A {ruby Async::Service::Controller} which handles starting, stopping, and managing services.

## Usage

Services are long-running processes that can be managed as a group. Each service extends `Async::Service::GenericService` and implements a `setup` method that defines how the service runs.

### Basic Service

Create a simple service that runs continuously:

```ruby
#!/usr/bin/env async-service

require "async/service"

class HelloService < Async::Service::GenericService
	def setup(container)
		super
		
		container.run(count: 1, restart: true) do |instance|
			instance.ready!
			
			while true
				puts "Hello World!"
				sleep 1
			end
		end
	end
end

service "hello" do
	service_class HelloService
end
```

Make the file executable and run it:

```bash
$ chmod +x hello_service.rb
$ ./hello_service.rb
```

### Service Configuration

Services can be configured with custom properties:

```ruby
service "web-server" do
	service_class WebServerService
	port 3000
	host "localhost"
end
```

In your service implementation, you can access these values through the environment and evaluator:

```ruby
class WebServerService < Async::Service::GenericService
	def setup(container)
		super
		
		container.run(count: 1, restart: true) do |instance|
			# Access the configuration for the service:
			evaluator = self.environment.evaluator
			port = evaluator.port
			host = evaluator.host
			
			puts "Starting web server on #{host}:#{port}"
			instance.ready!
			
			# Your web server implementation here
		end
	end
end
```

The evaluator is a memoized instance of the service's configuration, allowing for efficient access to configuration values throughout the service's lifecycle. If a service worker is restarted, it will create a new evaluator and a fresh environment.

### Multiple Services

You can define multiple services in a single configuration file:

```ruby
#!/usr/bin/env async-service

require "async/service"

class WebService < Async::Service::GenericService
	def setup(container)
		super
		
		container.run(count: 1, restart: true) do |instance|
			instance.ready!
			puts "Web service starting..."
			# Web server implementation
		end
	end
end

class WorkerService < Async::Service::GenericService
	def setup(container)
		super
		
		container.run(count: 2, restart: true) do |instance|
			instance.ready!
			puts "Worker #{instance.name} starting..."
			# Background job processing
		end
	end
end

service "web" do
	service_class WebService
	port 3000
	host "localhost"
end

service "worker" do
	service_class WorkerService
end
```

### Programmatic Usage

You can also create and run services programmatically:

```ruby
require "async/service"

configuration = Async::Service::Configuration.build do
	service "my-service" do
		service_class MyService
	end
end

Async::Service::Controller.run(configuration)
```
