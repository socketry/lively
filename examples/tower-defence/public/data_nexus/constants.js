export const TWO_PI = Math.PI * 2;
export const SERVER_TICK = 1000 / 20;
export const HEX_SIZE = 40; // must match server Hex::HEX_SIZE
export const SQRT3 = Math.sqrt(3);

// Hex coordinate utilities (pointy-top axial)
export function hexToWorld(q, r) {
	const x = HEX_SIZE * (SQRT3 * q + SQRT3 / 2 * r);
	const y = HEX_SIZE * (1.5 * r);
	return [x, y];
}

export function worldToHex(x, y) {
	const q = (SQRT3 / 3 * x - 1 / 3 * y) / HEX_SIZE;
	const r = (2 / 3 * y) / HEX_SIZE;
	// Round to nearest hex
	const s = -q - r;
	let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
	const qd = Math.abs(rq - q), rd = Math.abs(rr - r), sd = Math.abs(rs - s);
	if (qd > rd && qd > sd) rq = -rr - rs;
	else if (rd > sd) rr = -rq - rs;
	return [rq, rr];
}

export function hexCorners(cx, cy, size = HEX_SIZE) {
	const corners = [];
	for (let i = 0; i < 6; i++) {
		const angle = Math.PI / 180 * (60 * i - 30);
		corners.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
	}
	return corners;
}

export const TOWER_OPTIONS = [
	{type: 'pulse',   label: 'PULSE',   color: '#00ffcc', cost: {core: 5}, key: '1'},
	{type: 'thermal', label: 'THERMAL', color: '#ff6600', cost: {core: 8}, key: '2'},
	{type: 'crypto',  label: 'CRYPTO',  color: '#ff00ff', cost: {core: 6, cipher: 2}, key: '3'},
	{type: 'disrupt', label: 'DISRUPT', color: '#ff3333', cost: {core: 10, cipher: 4}, key: '4'},
];

export const CORE_UPGRADE_OPTIONS = [
	{type: 'overclock',   label: 'OVERCLOCK',   color: '#00ffcc', desc: '+15% fire rate',  key: '1', cost: {nexus: 1}},
	{type: 'amplify',     label: 'AMPLIFY',     color: '#ff6600', desc: '+15% damage',     key: '2', cost: {nexus: 1}},
	{type: 'accelerate',  label: 'ACCELERATE',  color: '#00ccff', desc: '+15% speed',      key: '3', cost: {nexus: 1}},
	{type: 'fortify',    label: 'FORTIFY',    color: '#ff00ff', desc: '+25% firewall power', key: '4', cost: {nexus: 1}},
];
