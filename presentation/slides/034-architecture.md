---
duration: 14
marker: Architecture
---

![[shared/architecture.md]]

---

User interactions travel over the WebSocket and land in `handle`. When the tab closes or the user navigates away, `close` is called — the right place to cancel timers, unsubscribe, or release anything you started in `bind`.

```javascript
const rows = slide.find(".seq-msg").builder({group: "seq", effect: "fade"})
rows.show(9)
slide.after(500, () => rows.next())
     .after(500, () => rows.next())
```
