<div class="seq-diagram">
  <div class="diagram-header">Lively — How It Works</div>
  <div class="seq-actors">
    <div class="seq-actor-box browser">Browser</div>
    <div></div>
    <div class="seq-actor-box app">Lively::Application</div>
    <div></div>
    <div class="seq-actor-box view">Live::View</div>
  </div>
  <div class="seq-body">
    <div class="seq-msg seq-http seq-http-get">
      <div></div>
      <div class="seq-arrow seq-r http">GET /</div>
      <div class="seq-ep seq-ep-l"><span>HTTP Middleware</span></div>
      <div></div>
      <div></div>
    </div>
    <div class="seq-msg seq-http seq-http-render">
      <div></div>
      <div></div>
      <div></div>
      <div class="seq-arrow seq-r http">render(builder)</div>
      <div class="seq-ep seq-ep-l"><span>render(builder)</span></div>
    </div>
    <div class="seq-msg seq-http seq-http-response">
      <div class="seq-ep seq-ep-r"><span>Renders HTML</span></div>
      <div class="seq-arrow seq-l http">200 OK + HTML</div>
      <div></div>
      <div></div>
      <div></div>
    </div>
    <div class="seq-gap"></div>
    <div class="seq-msg seq-ws seq-ws-connect">
      <div></div>
      <div class="seq-arrow seq-r ws">WebSocket /live</div>
      <div class="seq-ep seq-ep-l"><span>WebSocket Upgrade</span></div>
      <div></div>
      <div></div>
    </div>
    <div class="seq-msg seq-ws seq-ws-new">
      <div></div>
      <div></div>
      <div></div>
      <div class="seq-arrow seq-r ws">new</div>
      <div class="seq-ep seq-ep-l"><span>Live::View.new</span></div>
    </div>
    <div class="seq-msg seq-ws seq-ws-bind">
      <div></div>
      <div></div>
      <div></div>
      <div class="seq-arrow seq-r ws">bind(page)</div>
      <div class="seq-ep seq-ep-l"><span>bind(page)</span></div>
    </div>
    <div class="seq-gap"></div>
    <div class="seq-msg seq-update seq-update-trigger">
      <div></div>
      <div></div>
      <div class="seq-ep seq-ep-r"><span>re-render</span></div>
      <div class="seq-arrow seq-l update">update!</div>
      <div></div>
    </div>
    <div class="seq-msg seq-update seq-update-patches">
      <div class="seq-ep seq-ep-r"><span>Update DOM</span></div>
      <div class="seq-arrow seq-l update">HTML update</div>
      <div></div>
      <div></div>
      <div></div>
    </div>
    <div class="seq-gap"></div>
    <div class="seq-msg seq-event seq-event-fire">
      <div></div>
      <div class="seq-arrow seq-r event">forwardEvent</div>
      <div class="seq-ep seq-ep-l"><span>dispatch</span></div>
      <div></div>
      <div></div>
    </div>
    <div class="seq-msg seq-event seq-event-handle">
      <div></div>
      <div></div>
      <div></div>
      <div class="seq-arrow seq-r event">handle(event)</div>
      <div class="seq-ep seq-ep-l"><span>handle(event)</span></div>
    </div>
    <div class="seq-msg seq-close seq-close-msg">
      <div></div>
      <div></div>
      <div></div>
      <div class="seq-arrow seq-r close">close</div>
      <div class="seq-ep seq-ep-l"><span>close</span></div>
    </div>
  </div>
</div>
