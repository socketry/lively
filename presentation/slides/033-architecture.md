---
duration: 9
marker: Architecture
---

![[shared/architecture.md]]

---

When something changes, call `update!`. The Application re-renders the View and pushes the updated HTML to the browser over the WebSocket, compressed with deflate — no full-page reload.

```javascript
const rows = slide.find(".seq-msg").builder({group: "seq", effect: "fade"})
rows.show(7)
slide.after(500, () => rows.next())
```
