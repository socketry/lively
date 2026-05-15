---
template: code
duration: 24
marker: Tick Loop
title: Adding a tick loop
focus: 4-12
---

```ruby
class ClockView < Live::View
	def bind(page)
		super
		
		@task = Async do
			loop do
				self.update!
				sleep 1
			end
		end
	end
	
	def close
		@task&.stop
		super
	end
	
	def render(builder)
		builder.tag(:h1) do
			builder.text("Hello, World!")
		end
	end
end
```

---

*Focus on lines 4–12.*

The key addition is an Async task inside `bind`. Async gives us lightweight fibers — this loop runs concurrently with other connections without blocking. Every second it calls `update!`, which triggers a re-render and pushes the updated HTML to the browser over the WebSocket. Notice `close` — always stop your task when the view is done, or it will leak.
