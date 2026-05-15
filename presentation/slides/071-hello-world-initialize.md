---
template: code
duration: 14
marker: Hello World Code
title: application.rb
focus: 4-6
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

`initialize` is called when the view object is created — once per page load. Call `super` to let `Live::View` set up its internals. This is where you'd set instance variables for any state the view needs to hold.
