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

## Live Reloading

To enable live reloading, add the `io-watch` gem to your `gems.rb` file:

```ruby
gem "io-watch"
```

Then run:

```bash
$ io-watch . -- ./application.rb
```
