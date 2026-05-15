---
duration: 9
marker: Key Components
---

![[shared/components.md]]

---

`Live::View` is your component. Define `render(builder)` to describe the HTML, and optionally `bind`, `handle`, and `close` to manage the full lifecycle of a connected client.

```javascript
slide.find("li").builder({group: "comp", effect: "fade"}).show(2)
```
