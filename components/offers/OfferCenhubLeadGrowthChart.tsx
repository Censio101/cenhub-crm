import { EDITORIAL_CENHUB_LEAD } from "@/lib/internal/offer-editorial-content"

const CHART = EDITORIAL_CENHUB_LEAD.chart
const W = 520
const H = 180
const PAD = { top: 10, right: 10, bottom: 8, left: 10 }
const innerW = W - PAD.left - PAD.right
const innerH = H - PAD.top - PAD.bottom
const maxY = Math.max(...CHART.cenhubSeries)

type ChartPoint = { x: number; y: number }

function seriesPoints(series: readonly number[]): ChartPoint[] {
  return series.map((value, index) => ({
    x: PAD.left + (index / (series.length - 1)) * innerW,
    y: PAD.top + innerH - (value / maxY) * innerH,
  }))
}

/** Glat kurve gennem månedspunkter (sæson-buer i stedet for lige streger) */
function smoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`

  let d = `M ${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

export function OfferCenhubLeadGrowthChart() {
  const baselinePath = smoothPath(seriesPoints(CHART.baselineSeries))
  const cenhubPath = smoothPath(seriesPoints(CHART.cenhubSeries))

  return (
    <figure className="offer-cenhub-lead__chart">
      <div className="offer-cenhub-lead__chart-head">
        <figcaption className="offer-cenhub-lead__chart-title">{CHART.title}</figcaption>
        <p className="offer-cenhub-lead__chart-badge mono">{CHART.multiplier}</p>
      </div>
      <div className="offer-cenhub-lead__chart-plot">
        <svg
          className="offer-cenhub-lead__chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Sammenligning: ${CHART.cenhubLabel} vokser hurtigere end ${CHART.baselineLabel} over et år med sæsonvariation`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = PAD.top + innerH * (1 - tick)
            return (
              <line
                key={tick}
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                className="offer-cenhub-lead__chart-grid"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          <path
            d={baselinePath}
            className="offer-cenhub-lead__chart-line offer-cenhub-lead__chart-line--base"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={cenhubPath}
            className="offer-cenhub-lead__chart-line offer-cenhub-lead__chart-line--cenhub"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="offer-cenhub-lead__chart-months" aria-hidden>
          {CHART.months.map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </div>
      <ul className="offer-cenhub-lead__chart-legend">
        <li>
          <span className="offer-cenhub-lead__chart-swatch offer-cenhub-lead__chart-swatch--base" aria-hidden />
          {CHART.baselineLabel}
        </li>
        <li>
          <span className="offer-cenhub-lead__chart-swatch offer-cenhub-lead__chart-swatch--cenhub" aria-hidden />
          {CHART.cenhubLabel}
        </li>
      </ul>
    </figure>
  )
}
