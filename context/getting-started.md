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

For more complex applications, subclass {ruby Lively::Application} and override `#state`, `#allowed_views`, and `#body`:

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
	
	def body(request)
		case request.path
		when "/"
			DisplayView.new(**state)
		when "/control"
			ControlView.new(**state)
		end
	end
	
	def handle(request)
		if body = self.body(request)
			page = Lively::Pages::Index.new(title: "My App", body: body)
			Protocol::HTTP::Response[200, [], [page.call]]
		else
			Protocol::HTTP::Response[404, [], ["Not Found"]]
		end
	end
end
```

## Live Reloading

To enable live reloading, add the `io-watch` gem to your `gems.rb` file:

```ruby
gem "io-watch"
```

Then run:

```bash
$ io-watch . -- ./application.rb
```
