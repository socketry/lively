# Deployment

This guide explains how to deploy `async-service` applications using systemd and Kubernetes. We'll use a simple example service to demonstrate deployment configurations.

## Example Service

Let's start with a simple HTTP service that we'll deploy:

```ruby
#!/usr/bin/env async-service
# frozen_string_literal: true

require "async/http"
require "async/service/managed_service"
require "async/service/managed_environment"

class WebService < Async::Service::ManagedService
	def start
		super
		@endpoint = @evaluator.endpoint
		@bound_endpoint = Sync{@endpoint.bound}
	end
	
	def stop
		@endpoint = nil
		@bound_endpoint&.close
		super
	end
	
	def run(instance, evaluator)
		Console.info(self){"Starting web server on #{@endpoint}"}
		
		server = Async::HTTP::Server.for(@bound_endpoint, protocol: @endpoint.protocol, scheme: @endpoint.scheme) do |request|
			Protocol::HTTP::Response[200, {}, ["Hello, World!"]]
		end
		
		instance.ready!
		server.run
	end
end

module WebEnvironment
	include Async::Service::ManagedEnvironment
	
	def endpoint
		Async::HTTP::Endpoint.parse("http://0.0.0.0:3000")
	end
end

service "web" do
	service_class WebService
	include WebEnvironment
end
```

Save this as `web_service.rb` and make it executable:

```bash
$ chmod +x web_service.rb
```

## Systemd Deployment

Systemd can manage your `async-service` application as a system service, providing automatic startup, restart on failure, and integration with system logging.

### Service File

Create a systemd service file at `/etc/systemd/system/my-web-service.service`:

```
[Unit]
Description=My Web Service
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/bundle exec /path/to/web_service.rb
WorkingDirectory=/path/to/application
User=www-data
Group=www-data
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Key Configuration Points

- **Type=notify**: This is essential for `async-service` to notify systemd when the service is ready. The service uses the `sd_notify` protocol via the `$NOTIFY_SOCKET` environment variable.
- **ExecStart**: Points to your service script. Use `bundle exec` if you're using Bundler.
- **WorkingDirectory**: Set to your application root directory.
- **User/Group**: Run the service as a non-privileged user.
- **Restart=always**: Automatically restart the service if it fails.

### Installing and Managing the Service

```bash
# Reload systemd to recognize the new service
$ sudo systemctl daemon-reload

# Enable the service to start on boot
$ sudo systemctl enable my-web-service

# Start the service
$ sudo systemctl start my-web-service

# Check service status
$ sudo systemctl status my-web-service

# View service logs
$ sudo journalctl -u my-web-service -f

# Stop the service
$ sudo systemctl stop my-web-service
```

### Verifying Readiness

The service will notify systemd when it's ready. You can verify this by checking the service status:

```bash
$ sudo systemctl status my-web-service
```

The service should show as "active (running)" once it has notified systemd of its readiness.

## Kubernetes Deployment

Kubernetes can manage your `async-service` application as a containerized workload, providing scaling, health checks, and rolling updates.

### Dockerfile

First, create a `Dockerfile` for your application:

```dockerfile
FROM ruby:3.2

WORKDIR /app

# Install dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install --deployment --without development test

# Copy application files
COPY . .

# Expose the service port
EXPOSE 3000

# Set the notification log path
ENV NOTIFY_LOG=/tmp/notify.log

# Run the service
CMD ["bundle", "exec", "./web_service.rb"]
```

### Deployment Configuration

Create a Kubernetes deployment file `web-service-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-service
  template:
    metadata:
      labels:
        app: web-service
    spec:
      containers:
        - name: web-service
          image: my-registry/web-service:latest
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: NOTIFY_LOG
              value: "/tmp/notify.log"
          readinessProbe:
            exec:
              command:
                - bundle
                - exec
                - bake
                - async:container:notify:log:ready?
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Key Configuration Points

- **readinessProbe**: Uses the `async:container:notify:log:ready?` bake task to check if the service is ready. This reads from the `NOTIFY_LOG` file.
- **livenessProbe**: HTTP health check to ensure the service is responding to requests.
- **NOTIFY_LOG**: Environment variable pointing to the notification log file path.
- **replicas**: Number of pod instances to run.

### Deploying to Kubernetes

```bash
# Build and push the Docker image
$ docker build -t my-registry/web-service:latest .
$ docker push my-registry/web-service:latest

# Apply the deployment
$ kubectl apply -f web-service-deployment.yaml

# Check deployment status
$ kubectl get deployments
$ kubectl get pods

# View pod logs
$ kubectl logs -f deployment/web-service

# Check service endpoints
$ kubectl get svc web-service

# Scale the deployment
$ kubectl scale deployment web-service --replicas=3

# Update the deployment (rolling update)
$ kubectl set image deployment/web-service web-service=my-registry/web-service:v2
```

### Verifying Readiness

Kubernetes will wait for the readiness probe to pass before routing traffic to the pod:

```bash
# Check pod readiness
$ kubectl get pods -l app=web-service

# Describe pod to see readiness probe status
$ kubectl describe pod <pod-name>
```

The pod will show as "Ready" once the readiness probe succeeds, indicating the service has notified that it's ready to accept traffic.

## Notification Mechanism

Both systemd and Kubernetes deployments rely on the notification mechanism provided by `async-container`. The service uses `instance.ready!` to signal readiness:

- **Systemd**: Uses the `sd_notify` protocol via the `$NOTIFY_SOCKET` environment variable (automatically handled by `async-container`).
- **Kubernetes**: Uses a log file (`NOTIFY_LOG`) that the readiness probe checks using the `async:container:notify:log:ready?` bake task.

This ensures that your service is only considered ready when it has actually started and is prepared to handle requests, preventing premature traffic routing and improving reliability.
