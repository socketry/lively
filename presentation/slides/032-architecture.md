---
duration: 14
marker: Architecture
---

![[shared/architecture.md]]

---

After the page loads, the browser opens a persistent WebSocket to `/live`. The Application instantiates a new View, then calls `bind` — your signal to start background tasks, subscriptions, or timers.

```javascript
const rows = slide.find(".seq-msg").builder({group: "seq", effect: "fade"})
rows.show(4)
slide.after(500, () => rows.next())
     .after(500, () => rows.next())
```
