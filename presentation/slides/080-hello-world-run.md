---
duration: 16
marker: Running It
---

Make it executable and run it:


```bash
$ chmod +x application.rb
$ bundle exec lively ./application.rb
```

Or with live reloading on save:

```bash
$ bundle exec io-watch . -- lively ./application.rb
```

Open [http://localhost:9292](http://localhost:9292) in your browser.

---

That's it. Lively uses Falcon under the hood, so it starts a server on port 9292. Add `io-watch` and every time you save, the server restarts and the browser reconnects automatically — tight feedback loop for live coding.
