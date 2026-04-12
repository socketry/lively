# Service Architecture

This guide explains the key architectural components of `async-service` and how they work together to provide a clean separation of concerns.

## Core Components

`Async::Service` is built around four main concepts:

- **Environment**: Represents a service configuration and provides lazy evaluation of settings.
- **Service**: Represents a specific service implementation, defined by an environment.
- **Configuration**: Represents one or more configured services, defined by environments.
- **Container**: Used to run the actual service logic in child processes or threads.

## Environment

The {ruby Async::Service::Environment} represents a lazy-evaluated chain of key-value pairs. It handles configuration storage, lazy evaluation of computed values, and composition through module inclusion to create flexible, reusable service configurations.

### Configuration Storage

Each service definition creates an environment:

```ruby
service "web" do
	port 3000
	host "localhost"
end
```

### Lazy Evaluation

Environments use lazy evaluation through evaluators:

```ruby
service "web" do
	root "/app"
	
	# Computed when accessed:
	log_path {File.join(root, "logs", "app.log")}
end
```

The `log_path` is calculated when the service accesses it, not when defined.

### Composition and Inheritance

Environments support modular configuration:

```ruby
module DatabaseEnvironment
	def database_url
		"postgresql://localhost/app"
	end
end

service "web" do
	# Environment includes the module:
	include DatabaseEnvironment
	
	database {Database.new(database_url)}
end
```

You can also explicitly create environments:

```ruby
SharedEnvironment = environment do
	port 3000
	host "localhost"
	url {"http://#{host}:#{port}"}
end

service "web1" do
	include SharedEnvironment
	port 3001
end

service "web2" do
	include SharedEnvironment
	port 3002
end
```

## Service

The {ruby Async::Service::GenericService} represents the service implementation layer. It handles the actual business logic of your services, provides access to configuration through environment evaluators, and manages the service lifecycle including startup, execution, and shutdown phases.

### Business Logic

Services contain the actual implementation of what your service does:

```ruby
class WebService < Async::Service::GenericService
	def setup(container)
		super
		
		# Define how the service runs:
		container.run(count: 1, restart: true) do |instance|
			# Access configuration through evaluator:
			evaluator = self.environment.evaluator
			
			# Indicate that the service instance is healthy thus far:
			instance.ready!
			
			# Your service implementation:
			start_web_server(evaluator.host, evaluator.port)
		end
	end
end
```

### Configuration Access

Services access their configuration through their environment's evaluator:

```ruby
def setup(container)
	super
	
	container.run do |instance|
		# Create a new evaluator as we are in a different execution context:
		evaluator = self.environment.evaluator
		
		# Use evaluator in service configuration:
		database_url = evaluator.database_url
		max_connections = evaluator.max_connections
		
		# Your service implementation.
	end
end
```

Within the service class itself, you can use `@evaluator`. However, evaluators are not thread safe, so you should not use them across threads, and instead create distinct evaluators for each child process, thread or ractor, etc.

#### Lazy Evaluation

Environment evaluators are lazy-evaluated and memoized, meaning that any configuration defined within them is not computed until it is accessed. By doing this in the scope of the child process, you can ensure that each instance has its own configuration values.

```ruby
service do
	log_path {File.join(root, "logs", "app-#{Process.pid}.log")}
end
```

By evaluating the log_path in the child process, you ensure that each instance has its own log file with the correct process ID.

### Lifecycle Management

Services define their startup, running, and shutdown behavior:

```ruby
class MyService < Async::Service::GenericService
	def start
		super
		# Service-specific startup logic including pre-loading libraries and binding to network interfaces before forking.
	end
	
	def setup(container)
		super
		
		# Define container execution:
		container.run do |instance|
			# Your service implementation.
		end
	end
	
	def stop(graceful = true)
		# Service-specific cleanup including releasing any resources acquired during startup.
		super
	end
end
```

## Configuration

The {ruby Async::Service::Configuration} represents the top-level orchestration layer. It handles service definition and registration, provides service discovery and management capabilities, supports loading configurations from files, and enables introspection of defined services and their settings.

### Service Definitions

```ruby
configuration = Async::Service::Configuration.build do
	service "web" do
		service_class WebService
		port 3000
		host "localhost"
	end
	
	service "worker" do
		service_class WorkerService
		worker_count 4
	end
end
```

### Service Discovery and Management

```ruby
# Access all services in the configuration:
configuration.services.each do |service|
	puts "Service: #{service.name}"
end

# Create a controller to manage all services:
controller = configuration.controller

# Start all services:
controller.start
```

### Loading from Files

```ruby
# Load services from configuration files:
configuration = Async::Service::Configuration.load(["web.rb", "worker.rb"])

# Or load from command line arguments:
configuration = Async::Service::Configuration.load(ARGV)
```

### Introspection

Given a `service.rb` file, you can list the defined services and their configurations.

```bash
$ bundle exec bake async:service:configuration:load service.rb async:service:configuration:list o
utput --format json
[
	{
		"port": 3000,
		"name": "web",
		"host": "localhost",
		"service_class": "WebService",
		"root": "/Users/samuel/Developer/socketry/async-service"
	},
	{
		"name": "worker",
		"worker_count": 4,
		"service_class": "WorkerService",
		"root": "/Users/samuel/Developer/socketry/async-service"
	}
]
```

Note that only `service do ... end` definitions are included in the configuration listing.

## Container

The container layer (provided by the `async-container` gem) handles process management. Services don't interact with containers directly, but configure how containers should run them.

### Process Management

```ruby
def setup(container)
	# Configure how many instances, restart behavior, etc.
	container.run(count: 4, restart: true) do |instance|
		# This block runs in a separate process/fiber
		instance.ready!
		
		# Your service implementation.
	end
end
```

### Health Checking

For services using `Async::Service::ManagedService`, health checking is handled automatically. For services extending `GenericService`, you can set up health checking manually:

```ruby
def setup(container)
	container_options = @evaluator.container_options
	health_check_timeout = container_options[:health_check_timeout]
	
	container.run(**container_options) do |instance|
		# Prepare your service.
		
		Async do
			# Start your service.
			
			# Set up health checking, if a timeout was specified:
			health_checker(instance, health_check_timeout) do
				instance.name = "#{self.name}: #{current_status}"
			end
		end
	end
end
```

Note: `Async::Service::ManagedService` automatically handles health checking, container options, and process title formatting, so you typically don't need to set this up manually.

## How They Work Together

The four layers interact in a specific pattern:

### 1. Environment Creation

```ruby
# Environments define individual service configuration:
module DatabaseEnvironment
	def database_url
		"postgresql://localhost/app"
	end
end
```

### 2. Service Definition

```ruby
# Services are defined using environments:
class WebService < Async::Service::GenericService
	def setup(container)
		super
		
		# Access configuration through evaluator  
		evaluator = @environment.evaluator
		port = evaluator.port
		
		# Define how the service runs
		container.run(count: 1, restart: true) do |instance|
			instance.ready!
			
			# Your service implementation:
			start_web_server(port)
		end
	end
end
```

### 3. Configuration Assembly

```ruby
#!/usr/bin/env async-service

require "database_environment"
require "web_service"

service "web" do
	include DatabaseEnvironment  # Use the environment
	service_class WebService
	port 3000
end
```

### 4. Container Execution

```ruby
# Load the service configurations:
configuration = Async::Service::Configuration.load("service.rb")

# Controller manages the actual execution using containers:
Async::Service::Controller.run(configuration)
```

## Benefits of This Architecture

### Separation of Concerns

- **Environment**: "How should individual service configuration be stored and evaluated?"
- **Service**: "What should each service do when it runs?"
- **Configuration**: "What services should run and how should they be combined?"
- **Container**: "How should services be executed and monitored in processes?"

### Testability

```ruby
# Test configuration
configuration = Async::Service::Configuration.build do
	service "test-service" do
		service_class MyService
		port 3001
		database_url "sqlite://memory"
	end
end

# Test individual service
service = configuration.services.first
mock_container = double("container")
service.setup(mock_container)
```

### Flexibility

- Define multiple services in one configuration
- Same service class with different configurations  
- Load configurations from files or build programmatically
- Different container strategies per service

### Reusability

```ruby
# Reusable environment modules:
module DatabaseEnvironment
	def database_url
		"postgresql://localhost/app"
	end
end

module RedisEnvironment
	def redis_url
		"redis://localhost:6379"
	end
end

# Compose in service definitions:
configuration = Async::Service::Configuration.build do
	service "worker" do
		include DatabaseEnvironment
		include RedisEnvironment
		
		service_class WorkerService
	end
end
```

## Common Patterns

### Configuration Files

Create reusable configuration files:

```ruby
# config/web.rb
service "web" do
	service_class WebService
	port 3000
	host "0.0.0.0"
end

# config/worker.rb
service "worker" do
	service_class WorkerService
	concurrency 4
end

# Load both:
configuration = Async::Service::Configuration.load(["config/web.rb", "config/worker.rb"])
```

### Environment Modules

Create reusable configuration modules:

```ruby
module ManagedEnvironment
	include Async::Service::ManagedEnvironment
	
	def count
		4
	end
	
	def health_check_timeout
		30
	end
end

configuration = Async::Service::Configuration.build do
	service "my-service" do
		include ManagedEnvironment
		service_class MyService
	end
end
```

### Service Inheritance

Build service hierarchies:

```ruby
class BaseWebService < Async::Service::GenericService
	def setup(container)
		super
		# Common web service setup
	end
end

class APIService < BaseWebService
	def setup(container)
		super
		# API-specific setup
	end
end
```

### Programmatic Configuration

Build configurations dynamically:

```ruby
configuration = Async::Service::Configuration.new

# Add services programmatically
["web", "api", "worker"].each do |name|
	environment = Async::Service::Environment.build do
		service_class MyService
		service_name name
		port 3000 + name.hash % 1000
	end
	
	configuration.add(environment)
end
```

This architecture provides a clean, testable, and flexible foundation for building services while maintaining clear boundaries between configuration, implementation, and execution concerns.
