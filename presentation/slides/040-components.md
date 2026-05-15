---
duration: 9
marker: Key Components
---

![[shared/components.md]]

---

`Lively::Application` is a `Protocol::HTTP` middleware. It serves the initial page over HTTP, then upgrades the connection to a WebSocket for everything live.

```javascript
slide.find("li").builder({group: "comp", effect: "fade"}).show(1)
```
