---
template: code
duration: 12
marker: Hello World Code
title: application.rb
focus: 8-11
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

`bind` is called once the WebSocket connects and the view is attached to a live page. This is your signal to start any background tasks or subscriptions. Calling `update!` here triggers the first render and pushes the HTML to the browser.
