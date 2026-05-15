---
template: code
duration: 17
marker: Clock Render
title: Showing the time
focus: 18-22
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
			builder.text(Time.now.strftime("%H:%M:%S"))
		end
	end
end

Application = Lively::Application[ClockView]
```

---

*Focus on lines 18–22.*

All we changed in `render` is the text — from a static string to `Time.now`. Because `render` is called fresh on every `update!`, the time is always current. The browser receives the updated HTML over the WebSocket and re-renders. The full clock ticks live in the browser.
