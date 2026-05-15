---
template: code
duration: 17
title: gems.rb
---

```ruby
source "https://rubygems.org"

gem "lively"
gem "io-watch"
gem "agent-context"
```

---

Create a `gems.rb` with these three gems. `lively` is the framework, `io-watch` enables live-reloading during development, and `agent-context` is the key ingredient — it installs API documentation from your installed gems so your agent understands the libraries you're using.
