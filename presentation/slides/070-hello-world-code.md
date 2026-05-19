---
template: code
duration: 6
marker: Hello World Code
title: application.rb
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

The whole application in one file. The shebang means you can run it directly. Let's look at each part.
