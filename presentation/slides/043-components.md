---
duration: 15
marker: Key Components
---

![[shared/components.md]]

---

`Lively::Resolver` acts as the controller layer — it maps a class name to a view when a WebSocket connects. It also provides security: only explicitly registered classes can be instantiated, so arbitrary code can't be invoked from the client.

```javascript
slide.find("li").builder({group: "comp", effect: "fade"}).show(4)
```
