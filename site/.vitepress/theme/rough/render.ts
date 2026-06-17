// A tiny hand-drawn diagram engine built on rough.js.
// Given a declarative scene (groups, nodes, edges) it draws an Excalidraw-style
// SVG: sketchy boxes, database cylinders, diamonds, and arrows with hand-drawn
// heads. Layout is explicit (x/y/w/h in viewBox units) so authored diagrams stay
// pixel-intentional instead of fighting an auto-layouter.

import rough from 'roughjs'
import type { RoughSVG } from 'roughjs/bin/svg'
import type { Options } from 'roughjs/bin/core'

export type Side = 'top' | 'right' | 'bottom' | 'left' | 'auto'
export type Shape = 'rect' | 'round' | 'pill' | 'diamond' | 'cylinder'

export interface Node {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  label: string
  sub?: string
  shape?: Shape
  accent?: boolean
  fontSize?: number
}

export interface Edge {
  from: string
  to: string
  label?: string
  dashed?: boolean
  fromSide?: Side
  toSide?: Side
  /** Optional waypoints (viewBox coords) to route the arrow around nodes. */
  via?: { x: number; y: number }[]
  /** Place the label at this point instead of the segment midpoint. */
  labelAt?: { x: number; y: number }
}

export interface Group {
  x: number
  y: number
  w: number
  h: number
  label?: string
}

export interface Scene {
  width: number
  height: number
  nodes: Node[]
  edges?: Edge[]
  groups?: Group[]
}

export interface Palette {
  stroke: string // default outline / arrow color
  accentStroke: string // outline for accent nodes
  accentFill: string // fill for accent nodes
  groupStroke: string
  groupFill: string
  text: string
  subText: string
  edgeLabelBg: string
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const DEFAULT_W = 150
const DEFAULT_H = 56

// A fixed seed per element keeps the sketch stable across re-renders (and between
// SSR placeholder and client paint) instead of jittering on every paint.
function seededOptions(seed: number, opts: Options): Options {
  return { seed, roughness: 1.15, bowing: 1.4, ...opts }
}

function resolved(n: Node) {
  const w = n.w ?? DEFAULT_W
  const h = n.h ?? DEFAULT_H
  return { x: n.x, y: n.y, w, h, cx: n.x + w / 2, cy: n.y + h / 2 }
}

// Where an edge meets a node's outline, picking the side automatically from the
// direction to the opposite anchor when not specified.
function anchor(n: Node, side: Side, towards: { x: number; y: number }) {
  const r = resolved(n)
  let s = side
  if (s === 'auto') {
    const dx = towards.x - r.cx
    const dy = towards.y - r.cy
    s = Math.abs(dx) * r.h > Math.abs(dy) * r.w
      ? (dx >= 0 ? 'right' : 'left')
      : (dy >= 0 ? 'bottom' : 'top')
  }
  switch (s) {
    case 'top': return { x: r.cx, y: r.y }
    case 'bottom': return { x: r.cx, y: r.y + r.h }
    case 'left': return { x: r.x, y: r.cy }
    case 'right': return { x: r.x + r.w, y: r.cy }
  }
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  return [
    `M${x + r},${y}`,
    `H${x + w - r}`, `A${r},${r} 0 0 1 ${x + w},${y + r}`,
    `V${y + h - r}`, `A${r},${r} 0 0 1 ${x + w - r},${y + h}`,
    `H${x + r}`, `A${r},${r} 0 0 1 ${x},${y + h - r}`,
    `V${y + r}`, `A${r},${r} 0 0 1 ${x + r},${y}`,
    'Z',
  ].join(' ')
}

function text(x: number, y: number, content: string, opts: {
  size: number; color: string; weight?: number; family: string
}) {
  const t = document.createElementNS(SVG_NS, 'text')
  t.setAttribute('x', String(x))
  t.setAttribute('y', String(y))
  t.setAttribute('text-anchor', 'middle')
  t.setAttribute('dominant-baseline', 'middle')
  t.setAttribute('fill', opts.color)
  t.setAttribute('font-family', opts.family)
  t.setAttribute('font-size', String(opts.size))
  if (opts.weight) t.setAttribute('font-weight', String(opts.weight))
  t.textContent = content
  return t
}

function drawNodeShape(rc: RoughSVG, n: Node, seed: number, pal: Palette) {
  const r = resolved(n)
  const stroke = n.accent ? pal.accentStroke : pal.stroke
  const fill = n.accent ? pal.accentFill : undefined
  const base: Options = {
    stroke,
    strokeWidth: 1.6,
    fill,
    fillStyle: 'solid',
  }
  const shape = n.shape ?? 'round'

  switch (shape) {
    case 'rect':
      return rc.rectangle(r.x, r.y, r.w, r.h, seededOptions(seed, base))
    case 'pill':
      return rc.path(roundedRectPath(r.x, r.y, r.w, r.h, r.h / 2), seededOptions(seed, base))
    case 'diamond':
      return rc.polygon(
        [[r.cx, r.y], [r.x + r.w, r.cy], [r.cx, r.y + r.h], [r.x, r.cy]],
        seededOptions(seed, base),
      )
    case 'cylinder': {
      const ry = Math.min(10, r.h * 0.16)
      const g = document.createElementNS(SVG_NS, 'g')
      // body: vertical sides + front bottom arc, filled
      const body = `M${r.x},${r.y + ry} V${r.y + r.h - ry} A${r.w / 2},${ry} 0 0 0 ${r.x + r.w},${r.y + r.h - ry} V${r.y + ry}`
      g.appendChild(rc.path(body, seededOptions(seed, base)))
      // top ellipse rim
      g.appendChild(rc.ellipse(r.cx, r.y + ry, r.w, ry * 2, seededOptions(seed + 1, { ...base, fill: undefined })))
      return g
    }
    case 'round':
    default:
      return rc.path(roundedRectPath(r.x, r.y, r.w, r.h, 12), seededOptions(seed, base))
  }
}

type Pt = { x: number; y: number }

function drawArrow(rc: RoughSVG, pts: Pt[], seed: number, pal: Palette, dashed?: boolean) {
  const g = document.createElementNS(SVG_NS, 'g')
  const lineOpts = seededOptions(seed, {
    stroke: pal.stroke,
    strokeWidth: 1.6,
    roughness: 0.9,
    ...(dashed ? { strokeLineDash: [7, 6] } : {}),
  })
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  // Shorten the final segment slightly so the head sits just shy of the border.
  const dx = last.x - prev.x
  const dy = last.y - prev.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const tip = { x: last.x - ux * 2, y: last.y - uy * 2 }
  const shaft: [number, number][] = pts.slice(0, -1).map((p) => [p.x, p.y])
  shaft.push([tip.x, tip.y])
  g.appendChild(rc.linearPath(shaft, lineOpts))

  // Hand-drawn arrowhead: two short barbs, never dashed.
  const headLen = 11
  const ang = Math.atan2(dy, dx)
  const spread = 0.42
  const headOpts = seededOptions(seed + 2, { stroke: pal.stroke, strokeWidth: 1.6, roughness: 0.7 })
  const b1 = { x: tip.x - headLen * Math.cos(ang - spread), y: tip.y - headLen * Math.sin(ang - spread) }
  const b2 = { x: tip.x - headLen * Math.cos(ang + spread), y: tip.y - headLen * Math.sin(ang + spread) }
  g.appendChild(rc.linearPath([[b1.x, b1.y], [tip.x, tip.y], [b2.x, b2.y]], headOpts))
  return g
}

/** Render a scene into the given (empty) <svg> element. */
export function renderScene(svg: SVGSVGElement, scene: Scene, pal: Palette, fontFamily: string) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
  const rc = rough.svg(svg)
  let seed = 1

  // 1. Group containers (behind everything).
  for (const grp of scene.groups ?? []) {
    svg.appendChild(rc.path(roundedRectPath(grp.x, grp.y, grp.w, grp.h, 14), seededOptions(seed++, {
      stroke: pal.groupStroke,
      strokeWidth: 1.3,
      fill: pal.groupFill,
      fillStyle: 'solid',
      roughness: 1.3,
    })))
    if (grp.label) {
      svg.appendChild(text(grp.x + 14, grp.y + 16, grp.label, {
        size: 13, color: pal.subText, family: fontFamily, weight: 700,
      }))
    }
  }

  const byId = new Map(scene.nodes.map((n) => [n.id, n]))

  // 2. Edges (under nodes so arrowheads tuck behind borders cleanly).
  for (const e of scene.edges ?? []) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const ra = resolved(a)
    const rb = resolved(b)
    const firstTowards = e.via?.[0] ?? { x: rb.cx, y: rb.cy }
    const lastTowards = e.via?.[e.via.length - 1] ?? { x: ra.cx, y: ra.cy }
    const pa = anchor(a, e.fromSide ?? 'auto', firstTowards)
    const pb = anchor(b, e.toSide ?? 'auto', lastTowards)
    const pts = [pa, ...(e.via ?? []), pb]
    svg.appendChild(drawArrow(rc, pts, seed++, pal, e.dashed))
    if (e.label) {
      const mid = pts[Math.floor(pts.length / 2)]
      const mx = e.labelAt?.x ?? (pts.length % 2 ? mid.x : (pa.x + pb.x) / 2)
      const my = e.labelAt?.y ?? (pts.length % 2 ? mid.y : (pa.y + pb.y) / 2)
      const padX = e.label.length * 3.6 + 6
      const bg = document.createElementNS(SVG_NS, 'rect')
      bg.setAttribute('x', String(mx - padX))
      bg.setAttribute('y', String(my - 10))
      bg.setAttribute('width', String(padX * 2))
      bg.setAttribute('height', '20')
      bg.setAttribute('rx', '4')
      bg.setAttribute('fill', pal.edgeLabelBg)
      svg.appendChild(bg)
      svg.appendChild(text(mx, my, e.label, { size: 12, color: pal.subText, family: fontFamily }))
    }
  }

  // 3. Nodes + their labels.
  for (const n of scene.nodes) {
    svg.appendChild(drawNodeShape(rc, n, seed++, pal))
    const r = resolved(n)
    const size = n.fontSize ?? 15
    if (n.sub) {
      const subSize = Math.max(size - 2, 11)
      svg.appendChild(text(r.cx, r.cy - 8, n.label, { size, color: pal.text, family: fontFamily, weight: 700 }))
      svg.appendChild(text(r.cx, r.cy + 11, n.sub, { size: subSize, color: pal.subText, family: fontFamily }))
    } else {
      svg.appendChild(text(r.cx, r.cy, n.label, { size, color: pal.text, family: fontFamily, weight: 700 }))
    }
  }
}
