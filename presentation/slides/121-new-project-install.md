---
template: code
duration: 11
marker: Install Dependencies
---

# bundle update

``` bash
$ bundle update
Fetching gem metadata from https://rubygems.org/..........
Resolving dependencies...
Installing async 2.46.0
Installing async-websocket 0.30.1
Installing live 0.21.0
Installing agent-context 0.3.0
Installing falcon 0.57.0
Installing lively 0.24.0
Bundle updated!
```

---

`bundle update` pulls in everything Lively needs — the async ecosystem, Falcon, the Live runtime. The full dependency tree is about 30 gems, but you only declared three.
