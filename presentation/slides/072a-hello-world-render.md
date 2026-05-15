---
template: code
duration: 18
marker: Hello World Code
title: application.rb
focus: 13-17
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

`render` is called every time the view needs to update the browser. The `builder` argument is a tag builder — call `builder.tag` to emit HTML elements and `builder.text` to emit text nodes. Whatever you build here is sent to the browser over the WebSocket — compressed with deflate — and rendered in place, with no full page reload.
