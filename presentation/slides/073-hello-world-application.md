---
template: code
duration: 16
marker: Hello World Code
title: application.rb
focus: 20-20
---

```ruby
#!/usr/bin/env lively

class HelloWorldView < Live::View
	def initialize(...)
		super
	end
	
	def bind(page)
		super
		self.update!
	end
	
	def render(builder)
		builder.tag(:p) do
			builder.text("Hello, World!")
		end
	end
end

Application = Lively::Application[HelloWorldView]
```

---

`Lively::Application[HelloWorldView]` wires your view into the framework. It returns an application class that knows which view to serve and how to resolve WebSocket reconnections. Assign it to `Application` and Lively picks it up automatically.
