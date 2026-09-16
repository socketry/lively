import {Live, ViewElement} from "live";

// The server owns the time and renders every clock value. This custom element
// only connects the view to Live so server updates can be applied in place.
customElements.define("live-clock", class ClockElement extends ViewElement {});

const live = Live.start();

export {live};
