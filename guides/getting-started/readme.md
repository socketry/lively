# Getting Started

This guide will help you get started with Lively, a framework for building real-time applications in Ruby.

## Installation

To install Lively, you can use the following command:

```bash
$ gem install lively
```

## Basic Usage

Create a new directory for your Lively application:

```bash
$ mkdir my_lively_app
$ cd my_lively_app
```

Then create a `gems.rb` file in your project directory:

```ruby
source "https://rubygems.org"
gem "lively"
```

Next, run `bundle install` to install the Lively gem:

```bash
$ bundle install
```

Create an `application.rb` file in your project directory:

```ruby
#!/usr/bin/env lively

class HelloWorldView < Live::View
	def bind(page)
		super
		self.update!
	end
	
	def render(builder)
		builder.tag(:p) do
			builder.text("Hello World!")
		end
	end
end

Application = Lively::Application[HelloWorldView]
```

Now you can run your Lively application:

```bash
$ chmod +x application.rb
$ ./application.rb
```

You should see "Hello World!" displayed in your browser.

## Shared State

When multiple browser windows need to share state — for example, a multiplayer game or a collaborative tool — you can pass shared state to `Application[]`. The state is passed as keyword arguments to all views, both during the initial page render and when browsers reconnect via WebSocket.

```ruby
#!/usr/bin/env lively

class GameState
	def initialize
		@players = []
	end
	
	attr :players
	
	def add_player(player)
		@players << player
	end
end

class GameView < Live::View
	def initialize(id = self.class.unique_id, data = {}, game_state: nil)
		super(id, data)
		@game_state = game_state
	end
	
	def render(builder)
		builder.tag(:p) do
			builder.text("Players: #{@game_state.players.length}")
		end
	end
end

Application = Lively::Application[GameView, game_state: GameState.new]
```

The `game_state:` keyword is passed to every `GameView` instance — whether created by the initial page load or by a WebSocket reconnection. This means all connected browsers share the same `GameState` object.

For more complex applications, subclass {ruby Lively::Application} and add routes with `#configure_routes`:

```ruby
class Application < Lively::Application
	def allowed_views
		[DisplayView, ControlView]
	end
	
	def state
		{controller: @controller}
	end
	
	def initialize(delegate)
		@controller = MyController.new
		super
	end
	
	def configure_routes(router)
		display_page = Lively::Pages::Index.new(DisplayView, title: title, resolver: resolver)
		
		control_page = Lively::Pages::Index.new(ControlView, title: title, resolver: resolver)
		
		router.get("/", display_page)
		router.get("/control", control_page)
	end
end
```

`allowed_views` defines the view classes the shared resolver may construct. Routes select a callable page for each path. `Pages::Index` implements the default page behavior: it takes the root view class and exposes a fresh instance as the page body for every request. Custom page classes can override `body(request, parameters)` when request-specific content is needed. The page and WebSocket connection use the same resolver, so initial rendering and reconnection construct views with the same shared state and allowed classes. Lively installs its `/live` WebSocket route independently, so overriding `configure_routes` does not remove it.

Routes match exact paths and may accept one or more HTTP methods. Query parameters are decoded using `protocol-url` and passed to the handler as its second argument. Routes without an explicit method accept every method.

Requests which do not match a route are passed to the application's delegate. An application using client-side history routing can instead override `#handle` to render an application page for unmatched paths.

## Live Reloading

To enable live reloading, add the `io-watch` gem to your `gems.rb` file:

```ruby
gem "io-watch"
```

Then run:

```bash
$ io-watch . -- ./application.rb
```
