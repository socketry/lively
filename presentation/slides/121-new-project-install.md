---
template: code
duration: 11
marker: Install Dependencies
title: bundle update
---

``` bash
$ bundle update
Fetching gem metadata from https://rubygems.org/..........
Resolving dependencies...
Installing async 2.39.0
Installing async-websocket 0.30.0
Installing live 0.18.2
Installing agent-context 0.3.0
Installing falcon 0.55.3
Installing lively 0.17.1
Bundle updated!
```

---

`bundle update` pulls in everything Lively needs — the async ecosystem, Falcon, the Live runtime. The full dependency tree is about 30 gems, but you only declared three.
