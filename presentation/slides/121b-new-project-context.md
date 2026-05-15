---
template: code
duration: 16
marker: Install Context
title: bundle exec bake agent:context:install
---

``` bash
$ bundle exec bake agent:context:install
Installed context from 20 gems:
  async
  async-http
  async-service
  protocol-http
  protocol-websocket
  falcon
  lively
  ...
```

---

This scans every installed gem for bundled context files and copies them into `.context/` in your project. Your agent can now read authoritative documentation for the entire stack — no guessing, no hallucination.
