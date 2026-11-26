'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Address, Basemap, Point } from '../lib/yazd-basemap'

const center: Point = [31.884, 54.371]
const cityBounds = L.latLngBounds([31.79, 54.23], [32.02, 54.54])

export const mapStyles = {
  offline: 'آفلاین',
  dark: 'نقشهٔ تیره',
  streets: 'نقشهٔ خیابانی',
  satellite: 'نمای ماهواره‌ای',
} as const
export type MapStyle = keyof typeof mapStyles

const osmCredit = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const rasterStyles = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: osmCredit + ' &copy; CARTO' },
  streets: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: osmCredit },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' },
} as const

type Props = {
  mapStyle: MapStyle
  basemap: Basemap | null
  routes: { points: Point[]; color: string }[]
  selected: number
  editing: boolean
  address: Address | null
  onAddPoint: (point: Point) => void
  onMovePoint: (index: number, point: Point) => void
}

export default function YazdMap({ mapStyle, basemap, routes, selected, editing, address, onAddPoint, onMovePoint }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const streets = useRef<L.LayerGroup | null>(null)
  const lines = useRef<L.LayerGroup | null>(null)
  const pin = useRef<L.LayerGroup | null>(null)
  const click = useRef(onAddPoint)
  const move = useRef(onMovePoint)
  const [tileError, setTileError] = useState(false)

  useEffect(() => { click.current = onAddPoint; move.current = onMovePoint }, [onAddPoint, onMovePoint])

  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { maxBounds: cityBounds.pad(.45), minZoom: 11 })
    instance.fitBounds(cityBounds.pad(-.23))
    if (instance.getZoom() < 11) instance.setView(center, 12)
    map.current = instance
    instance.createPane('streets').style.zIndex = '250'
    instance.attributionControl.addAttribution(osmCredit)
    streets.current = L.layerGroup().addTo(instance)
    lines.current = L.layerGroup().addTo(instance)
    pin.current = L.layerGroup().addTo(instance)
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }))
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
      streets.current = null
      lines.current = null
      pin.current = null
    }
  }, [])

  useEffect(() => {
    const instance = map.current
    setTileError(false)
    if (!instance || mapStyle === 'offline') return
    const style = rasterStyles[mapStyle]
    const tiles = L.tileLayer(style.url, { attribution: style.attribution, maxZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin' })
    tiles.on('tileerror', () => setTileError(true))
    tiles.addTo(instance)
    return () => { tiles.remove() }
  }, [mapStyle])

  useEffect(() => {
    const instance = map.current
    const layer = streets.current
    if (!instance || !layer) return
    layer.clearLayers()
    if (!basemap) return
    const renderer = L.canvas({ pane: 'streets', padding: .25 })
    for (const point of basemap.roadCenters ?? []) {
      L.circleMarker(point, { renderer, interactive: false, radius: 1.1, stroke: false, fillColor: '#a9b8d8', fillOpacity: .42 }).addTo(layer)
    }
    for (const road of basemap.roads) {
      const major = /motorway|trunk|primary|secondary|tertiary/.test(road.kind)
      L.polyline(road.points, {
        renderer, interactive: false, color: major ? '#e4c995' : '#91a3bc',
        opacity: major ? .88 : .55, weight: major ? 3 : 1.4,
      }).addTo(layer)
    }
    return () => { layer.clearLayers(); renderer.remove() }
  }, [basemap])

  useEffect(() => {
    const layer = lines.current
    if (!layer) return
    layer.clearLayers()
    routes.forEach(({ points, color }, index) => {
      const active = index === selected
      if (points.length >= 2) L.polyline(points, { color: '#182438', weight: active ? 8 : 5, opacity: .65, interactive: false }).addTo(layer)
      if (points.length >= 2) L.polyline(points, { color, weight: active ? 5 : 3, opacity: active ? 1 : .8, interactive: false }).addTo(layer)
      for (const [i, point] of points.entries()) {
        if (editing && active) {
          const icon = L.divIcon({ className: 'route-stop-marker', html: String(i + 1), iconSize: [23, 23], iconAnchor: [11, 11] })
          const marker = L.marker(point, { draggable: true, bubblingMouseEvents: false, icon, title: 'ایستگاه ' + (i + 1) }).addTo(layer)
          marker.on('dragend', () => { const p = marker.getLatLng(); move.current(i, [p.lat, p.lng]) })
          continue
        }
        L.circleMarker(point, { radius: active ? 5 : 3, color: '#192538', weight: 1.4, fillColor: color, fillOpacity: 1, interactive: false }).addTo(layer)
      }
    })
  }, [routes, selected, editing])

  useEffect(() => {
    const instance = map.current
    if (!editing || !instance) return
    function handleClick(event: L.LeafletMouseEvent) {
      click.current([event.latlng.lat, event.latlng.lng])
    }
    instance.on('click', handleClick)
    return () => { instance.off('click', handleClick) }
  }, [editing])

  useEffect(() => {
    const instance = map.current
    const layer = pin.current
    if (!instance || !layer) return
    layer.clearLayers()
    if (!address) return
    const label = document.createElement('span')
    label.textContent = address.label
    L.circleMarker(address.point, { radius: 9, color: '#fff', weight: 3, fillColor: '#8760e6', fillOpacity: 1 })
      .addTo(layer).bindPopup(label).openPopup()
    instance.setView(address.point, Math.max(16, instance.getZoom()))
  }, [address])

  return <>
    <div ref={container} data-map-style={mapStyle} className={editing ? 'live-map editing' : 'live-map'} aria-label="نقشهٔ خیابانی یزد و مسیرهای سرویس" />
    {tileError && <p className="map-search-status" role="status">بخشی از لایهٔ آنلاین بارگیری نشد. دادهٔ آفلاین و مسیرها روی نقشه باقی می‌مانند.</p>}
  </>
}
