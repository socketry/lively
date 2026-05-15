---
duration: 13
marker: Architecture
---

![[shared/architecture.md]]

---

The browser sends a `GET` request. The Application asks your View to `render`, collects the HTML, and returns a normal `200 OK`. Nothing live yet — just a regular page load.

```javascript
const rows = slide.find(".seq-msg").builder({group: "seq", effect: "fade"})
rows.show(1)
slide.after(500, () => rows.next())
     .after(500, () => rows.next())
```
