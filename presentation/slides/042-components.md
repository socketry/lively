---
duration: 12
marker: Key Components
---

![[shared/components.md]]

---

`Live::Page` ties multiple views to a single WebSocket session. Different parts of the screen can update independently — each view manages its own state and rendering.

```javascript
slide.find("li").builder({group: "comp", effect: "fade"}).show(3)
```
