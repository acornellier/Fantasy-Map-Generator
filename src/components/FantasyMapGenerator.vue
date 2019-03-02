<template>
<!-- eslint-disable -->
<div class="app">
  <Graphic/>
  <div id="loading">
    <div id="title_name">Azgaar's</div>
    <div id="title">Fantasy Map Generator</div>
    <div id="version">v. 0.60b</div>
    <p id="loading-text">LOADING<span>.</span><span>.</span><span>.</span></p>
  </div>
  <canvas id="canvas" style="opacity: 0"/>
  <Options
    @updateLabelGroups="updateLabelGroups"
    @applyDefaultStyle="applyDefaultStyle"
    @toggleHeight="toggleHeight"
  />
  <Dialogs/>
  <div id="map-dragged" style="display: none">
    <p>Drop to upload</p>
  </div>
  <div id="legend">
    <div id="legendHeader"/>
    <div id="legendBody"/>
  </div>
  <div id="tooltip" data-main="Сlick the arrow button to open options">
    Сlick the arrow button to open options
  </div>
  <div id="fileInputs" class="hidden">
    <input type="file" accept=".map" id="mapToLoad">
    <input type="file" accept=".txt,.csv" id="burgsListToLoad">
    <input type="file" accept=".txt" id="lagendsToLoad">
    <input type="file" accept="image/*" id="imageToLoad">
    <input type="file" accept=".txt" id="templateToLoad">
    <input type="file" accept=".txt" id="namesbaseToLoad">
  </div>
</div>
</template>

<script>
/* eslint-disable */
import {mapState, mapMutations, mapActions} from 'vuex'
import {mapFields} from 'vuex-map-fields'
import seedrandom from 'seedrandom'
import * as d3 from 'd3'
import * as d3chromatic from 'd3-scale-chromatic'
import * as polylabel from 'polylabel'
import * as quantize from 'quantize'
import * as PriorityQueue from 'js-priority-queue'
import * as $ from 'jquery'
import 'jquery-ui-bundle'
import 'jquery-ui-bundle/jquery-ui.css'
import * as _ from 'lodash'
import {color, colors8, colors20, toHEX, round, si, getInteger, GFontToDataURI, ifDefined} from '../utils'
import {ICONS, FONTS, VOWELS} from '../constants'
import {DEFAULT_GLOBAL_STATE} from '../store/modules/global'
import Dialogs from './dialogs/Dialogs.vue'
import Graphic from './Graphic.vue'
import Options from './options/Options.vue'

'use strict'

// global variables
let svg
let defs
let viewbox
let ocean
let oceanLayers
let oceanPattern
let landmass
let terrs
let grid
let overlay
let rivers
let terrain
let cults
let regions
let borders
let stateBorders
let neutralBorders
let lakes
let routes
let roads
let trails
let searoutes
let coastline
let labels
let burgLabels
let icons
let burgIcons
let markers
let ruler
let debug

let voronoi

// download map as SVG or PNG file
function saveAsImage(type) {
  console.time('saveAsImage')
  const webSafe = ['Georgia', 'Times+New+Roman', 'Comic+Sans+MS', 'Lucida+Sans+Unicode', 'Courier+New', 'Verdana', 'Arial', 'Impact']
  // get non-standard fonts used for labels to fetch them from web
  const fontsInUse = [] // to store fonts currently in use
  labels.selectAll('g').each(function(d) {
    const font = d3.select(this).attr('data-font')
    if (!font) return
    if (webSafe.indexOf(font) !== -1) return // do not fetch web-safe fonts
    if (fontsInUse.indexOf(font) === -1) fontsInUse.push(font)
  })
  const fontsToLoad = 'https://fonts.googleapis.com/css?family=' + fontsInUse.join('|')

  // clone svg
  const cloneEl = document.getElementsByTagName('svg')[0].cloneNode(true)
  cloneEl.id = 'fantasyMap'
  document.getElementsByTagName('body')[0].appendChild(cloneEl)
  const clone = d3.select('#fantasyMap')

  // rteset transform for svg
  if (type === 'svg') {
    clone.attr('width', self.graphWidth).attr('height', self.graphHeight)
    clone.select('#viewbox').attr('transform', null)
    if (self.svgWidth !== self.graphWidth || self.svgHeight !== self.graphHeight) {
      // move scale bar to right bottom corner
      const el = clone.select('#scaleBar')
      if (!el.size()) return
      const bbox = el.select('rect').node().getBBox()
      const tr = [self.graphWidth - bbox.width, self.graphHeight - (bbox.height - 10)]
      el.attr('transform', 'translate(' + Math.round(tr[0]) + ',' + Math.round(tr[1]) + ')')
    }

    // to fix use elements sizing
    clone.selectAll('use').each(function() {
      const size = this.parentNode.getAttribute('size') || 1
      this.setAttribute('width', size + 'px')
      this.setAttribute('height', size + 'px')
    })
  }

  // for each g element get inline style
  const emptyG = clone.append('g').node()
  const defaultStyles = window.getComputedStyle(emptyG)

  // show hidden labels but in reduced size
  clone.select('#labels').selectAll('.hidden').each(function(e) {
    const size = d3.select(this).attr('font-size')
    d3.select(this).classed('hidden', false).attr('font-size', _.round(size * 0.4, 2))
  })

  // save group css to style attribute
  clone.selectAll('g, #ruler > g > *, #scaleBar > text').each(function(d) {
    const compStyle = window.getComputedStyle(this)
    let style = ''
    for (let i = 0; i < compStyle.length; i++) {
      const key = compStyle[i]
      const value = compStyle.getPropertyValue(key)
      // Firefox mask hack
      if (key === 'mask-image' && value !== defaultStyles.getPropertyValue(key)) {
        style += 'mask-image: url(\'#shape\');'
        continue
      }
      if (key === 'cursor') continue // cursor should be default
      if (this.hasAttribute(key)) continue // don't add style if there is the same attribute
      if (value === defaultStyles.getPropertyValue(key)) continue
      style += key + ':' + value + ';'
    }
    if (style != '') this.setAttribute('style', style)
  })
  emptyG.remove()

  // load fonts as dataURI so they will be available in downloaded svg/png
  GFontToDataURI(fontsToLoad).then(cssRules => {
    clone.select('defs').append('style').text(cssRules.join('\n'))
    const svg_xml = (new XMLSerializer()).serializeToString(clone.node())
    clone.remove()
    const blob = new Blob([svg_xml], {type: 'image/svg+xml;charset=utf-8'})
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.target = '_blank'
    if (type === 'png') {
      const ratio = self.svgHeight / self.svgWidth
      canvas.width = self.svgWidth * pngResolutionInput.value
      canvas.height = self.svgHeight * pngResolutionInput.value
      const img = new Image()
      img.src = url
      img.onload = function() {
        window.URL.revokeObjectURL(url)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        link.download = 'fantasy_map_' + Date.now() + '.png'
        canvas.toBlob(function(blob) {
          link.href = window.URL.createObjectURL(blob)
          document.body.appendChild(link)
          link.click()
          window.setTimeout(function() {window.URL.revokeObjectURL(link.href)}, 5000)
        })
        canvas.style.opacity = 0
        canvas.width = self.svgWidth
        canvas.height = self.svgHeight
      }
    } else {
      link.download = 'fantasy_map_' + Date.now() + '.svg'
      link.href = url
      document.body.appendChild(link)
      link.click()
    }
    console.timeEnd('saveAsImage')
    window.setTimeout(function() {window.URL.revokeObjectURL(url)}, 5000)
  })
}

// get user-friendly (real-world) height value from map data
function getFriendlyHeight(h) {
  let exponent = +heightExponent.value
  let unit = heightUnit.value
  let unitRatio = 1 // default calculations are in meters
  if (unit === 'ft') unitRatio = 3.28 // if foot
  if (unit === 'f') unitRatio = 0.5468 // if fathom
  let height = -990
  if (h >= 20) height = Math.pow(h - 18, exponent)
  if (h < 20 && h > 0) height = (h - 20) / h * 50
  return h + ' (' + Math.round(height * unitRatio) + ' ' + unit + ')'
}

// move brush radius circle
function moveCircle(x, y, r, c) {
  let circle = debug.selectAll('.circle')
  if (!circle.size())
    circle = debug.insert('circle', ':first-child').attr('class', 'circle')
  circle.attr('cx', x).attr('cy', y)
  if (r) circle.attr('r', r)
  if (c) circle.attr('stroke', c)
}

// Get cell info on mouse move (useful for debugging)
function moved() {
  const point = d3.mouse(this)
  const i = self.diagram.find(point[0], point[1]).index

  // update cellInfo
  if (i) {
    const p = self.cells[i] // get cell
    infoX.innerHTML = Math.round(point[0])
    infoY.innerHTML = Math.round(point[1])
    infoCell.innerHTML = i
    infoArea.innerHTML = ifDefined(p.area, 'n/a', 2)
    if (self.customization === 1) {
      infoHeight.innerHTML = getFriendlyHeight(self.heights[i])
    } else {infoHeight.innerHTML = getFriendlyHeight(p.height)}
    infoFlux.innerHTML = ifDefined(p.flux, 'n/a', 2)
    infoCountry.innerHTML = p.region === undefined ?
                            'n/a' : p.region === 'neutral' ?
                                    'neutral' : self.states[p.region].name + ' (' + p.region + ')'
    infoCulture.innerHTML = ifDefined(p.culture) === 'no' ? 'n/a' :
                            cultures[p.culture].name + ' (' + p.culture + ')'
    infoPopulation.innerHTML = ifDefined(p.pop, 'n/a', 2)
    infoBurg.innerHTML =
      ifDefined(p.manor) !== 'no' ? self.manors[p.manor].name + ' (' + p.manor + ')' : 'no'
    const feature = self.features[p.fn]
    if (feature !== undefined) {
      const fType = feature.land ? 'Island' : feature.border ? 'Ocean' : 'Lake'
      infoFeature.innerHTML = fType + ' (' + p.fn + ')'
    } else {
      infoFeature.innerHTML = 'n/a'
    }
  }

  // update tooltip
  if (toggleTooltips.checked) {
    tooltip.innerHTML = tooltip.getAttribute('data-main')
    const tag = event.target.tagName
    const path = event.composedPath()
    const group = path[path.length - 7].id
    const subgroup = path[path.length - 8].id
    if (group === 'rivers') tip('Click to open River Editor')
    if (group === 'routes') tip('Click to open Route Editor')
    if (group === 'terrain') tip('Click to open Relief Icon Editor')
    if (group === 'labels') tip('Click to open Label Editor')
    if (group === 'icons') tip('Click to open Icon Editor')
    if (group === 'markers') tip('Click to open Marker Editor')
    if (group === 'ruler') {
      if (tag === 'path' || tag === 'line') tip('Drag to move the measurer')
      if (tag === 'text') tip('Click to remove the measurer')
      if (tag === 'circle') tip('Drag to adjust the measurer')
    }
    if (subgroup === 'burgIcons') tip('Click to open Burg Editor')
    if (subgroup === 'burgLabels') tip('Click to open Burg Editor')

    // show legend on hover (if any)
    let id = event.target.id
    if (id === '') id = event.target.parentNode.id
    if (subgroup === 'burgLabels') id = 'burg' + event.target.getAttribute('data-id')

    let note = self.notes.find(note => note.id === id)
    let legend = document.getElementById('legend')
    let legendHeader = document.getElementById('legendHeader')
    let legendBody = document.getElementById('legendBody')
    if (note !== undefined && note.legend !== '') {
      legend.style.display = 'block'
      legendHeader.innerHTML = note.name
      legendBody.innerHTML = note.legend
    } else {
      legend.style.display = 'none'
      legendHeader.innerHTML = ''
      legendBody.innerHTML = ''
    }
  }

  // draw line for ranges placing for heightmap Customization
  if (self.customization === 1) {
    const line = debug.selectAll('.line')
    if (debug.selectAll('.tag').size() === 1) {
      const x = +debug.select('.tag').attr('cx')
      const y = +debug.select('.tag').attr('cy')
      if (line.size()) {
        line.attr('x1', x).attr('y1', y).attr('x2', point[0]).attr('y2', point[1])
      } else {
        debug.insert('line', ':first-child').attr('class', 'line')
             .attr('x1', x).attr('y1', y).attr('x2', point[0]).attr('y2', point[1])
      }
    } else {
      line.remove()
    }
  }

  // change radius circle for Customization
  if (self.customization > 0) {
    const brush = $('#brushesButtons > .pressed')
    const brushId = brush.attr('id')
    if (brushId === 'brushRange' || brushId === 'brushTrough') return
    if (self.customization !== 5 && !brush.length && !$('div.selected').length) return
    let radius = 0
    if (self.customization === 1) {
      radius = brushRadius.value
      if (brushId === 'brushHill' || brushId === 'brushPit') {
        radius = Math.pow(brushPower.value * 4, .5)
      }
    } else if (self.customization === 2)
      radius = countriesManuallyBrush.value
    else if (self.customization === 4)
      radius = culturesManuallyBrush.value
    else if (self.customization === 5)
      radius = reliefBulkRemoveRadius.value

    const r = _.round(6 / self.graphSize * radius, 1)
    let clr = '#373737'
    if (self.customization === 2) {
      const state = +$('div.selected').attr('id').slice(5)
      clr = self.states[state].color === 'neutral' ? 'white' : self.states[state].color
    }
    if (self.customization === 4) {
      const culture = +$('div.selected').attr('id').slice(7)
      clr = cultures[culture].color
    }
    moveCircle(point[0], point[1], r, clr)
  }
}

function updateLabelGroups() {
  if ($('#styleElementSelect').value !== 'labels') return
  const cont = d3.select('#styleLabelGroupItems')
  cont.selectAll('button').remove()
  labels.selectAll('g').each(function() {
    const el = d3.select(this)
    const id = el.attr('id')
    const name = id.charAt(0).toUpperCase() + id.substr(1)
    const state = el.classed('hidden')
    if (id === 'burgLabels') return
    cont.append('button').attr('id', id).text(name).classed('buttonoff', state)
        .on('click', function() {
          // toggle label group on click
          if ($('#hideLabels').checked) $('#hideLabels').click()
          const el = d3.select('#' + this.id)
          const state = !el.classed('hidden')
          el.classed('hidden', state)
          d3.select(this).classed('buttonoff', state)
        })
  })
}

function applyDefaultStyle() {
  viewbox.on('touchmove mousemove', moved)
  landmass.attr('opacity', 1).attr('fill', '#eef6fb')
  coastline.attr('opacity', .5).attr('stroke', '#1f3846').attr('stroke-width', .7)
           .attr('filter', 'url(#dropShadow)')
  regions.attr('opacity', .4)
  stateBorders.attr('opacity', .8).attr('stroke', '#56566d').attr('stroke-width', .7)
              .attr('stroke-dasharray', '1.2 1.5').attr('stroke-linecap', 'butt')
  neutralBorders.attr('opacity', .8).attr('stroke', '#56566d').attr('stroke-width', .5)
                .attr('stroke-dasharray', '1 1.5').attr('stroke-linecap', 'butt')
  cults.attr('opacity', .6)
  rivers.attr('opacity', 1).attr('fill', '#5d97bb')
  lakes.attr('opacity', .5).attr('fill', '#a6c1fd').attr('stroke', '#5f799d')
       .attr('stroke-width', .7)
  icons.selectAll('g').attr('opacity', 1).attr('fill', '#ffffff').attr('stroke', '#3e3e4b')
  roads.attr('opacity', .9).attr('stroke', '#d06324').attr('stroke-width', .35)
       .attr('stroke-dasharray', '1.5').attr('stroke-linecap', 'butt')
  trails.attr('opacity', .9).attr('stroke', '#d06324').attr('stroke-width', .15)
        .attr('stroke-dasharray', '.8 1.6').attr('stroke-linecap', 'butt')
  searoutes.attr('opacity', .8).attr('stroke', '#ffffff').attr('stroke-width', .35)
           .attr('stroke-dasharray', '1 2').attr('stroke-linecap', 'round')
  grid.attr('opacity', 1).attr('stroke', '#808080').attr('stroke-width', .1)
  ruler.attr('opacity', 1).style('display', 'none').attr('filter', 'url(#dropShadow)')
  overlay.attr('opacity', .8).attr('stroke', '#808080').attr('stroke-width', .5)
  markers.attr('filter', 'url(#dropShadow01)')

  // ocean style
  svg.style('background-color', '#000000')
  ocean.attr('opacity', 1)
  oceanLayers.select('rect').attr('fill', '#53679f')
  oceanLayers.attr('filter', '')
  oceanPattern.attr('opacity', 1)
  oceanLayers.selectAll('path').attr('display', null)
  styleOceanPattern.checked = true
  styleOceanLayers.checked = true

  labels.attr('opacity', 1).attr('stroke', '#3a3a3a').attr('stroke-width', 0)
  let size = Math.round(8 - regionsInput.value / 20)
  if (size < 3) size = 3
  burgLabels.select('#capitals').attr('fill', '#3e3e4b').attr('opacity', 1)
            .attr('font-family', 'Almendra SC').attr('data-font', 'Almendra+SC')
            .attr('font-size', size).attr('data-size', size)
  burgLabels.select('#towns').attr('fill', '#3e3e4b').attr('opacity', 1)
            .attr('font-family', 'Almendra SC').attr('data-font', 'Almendra+SC')
            .attr('font-size', 3).attr('data-size', 4)
  burgIcons.select('#capitals').attr('size', 1).attr('stroke-width', .24)
           .attr('fill', '#ffffff').attr('stroke', '#3e3e4b').attr('fill-opacity', .7)
           .attr('stroke-opacity', 1).attr('opacity', 1)
  burgIcons.select('#towns').attr('size', .5).attr('stroke-width', .12).attr('fill', '#ffffff')
           .attr('stroke', '#3e3e4b').attr('fill-opacity', .7).attr('stroke-opacity', 1)
           .attr('opacity', 1)
  size = Math.round(16 - regionsInput.value / 6)
  if (size < 6) size = 6
  labels.select('#countries').attr('fill', '#3e3e4b').attr('opacity', 1)
        .attr('font-family', 'Almendra SC').attr('data-font', 'Almendra+SC')
        .attr('font-size', size).attr('data-size', size)
  icons.select('#capital-anchors').attr('fill', '#ffffff').attr('stroke', '#3e3e4b')
       .attr('stroke-width', 1.2).attr('size', 2)
  icons.select('#town-anchors').attr('fill', '#ffffff').attr('stroke', '#3e3e4b')
       .attr('stroke-width', 1.2).attr('size', 1)
}

// draw the heightmap
function toggleHeight() {
  const scheme = $('#styleSchemeInput').value
  let hColor = color
  if (scheme === 'light') hColor = d3.scaleSequential(d3chromatic.interpolateRdYlGn)
  if (scheme === 'green') hColor = d3.scaleSequential(d3chromatic.interpolateGreens)
  if (scheme === 'monochrome') hColor = d3.scaleSequential(d3chromatic.interpolateGreys)
  if (!terrs.selectAll('path').size()) {
    self.cells.map(function(i, d) {
      let height = i.height
      if (height < 20 && !i.lake) return
      if (i.lake) {
        const nHeights = i.neighbors.map(
          function(e) {if (cells[e].height >= 20) return cells[e].height})
        const mean = d3.mean(nHeights)
        if (!mean) return
        height = Math.trunc(mean)
        if (height < 20 || isNaN(height)) height = 20
      }
      const clr = hColor((100 - height) / 100)
      terrs.append('path')
           .attr('d', 'M' + self.polygons[d].join('L') + 'Z')
           .attr('fill', clr).attr('stroke', clr)
    })
  } else {
    terrs.selectAll('path').remove()
  }
}

export default {
  name: 'FantasyMapGenerator',
  computed: {
    ...mapFields('cultures', ['cultures', 'cultureTree']),
    ...mapFields('global', Object.keys(DEFAULT_GLOBAL_STATE)),
    ...mapFields('names', ['nameBases', 'chains']),
    ...mapState({
      graphHeight: state=> state.graphic.graph.height,
      graphWidth: state => state.graphic.graph.width,
      svgHeight: state => state.graphic.svg.height,
      svgWidth: state => state.graphic.svg.width,
    }),
  },
  methods: {
    updateLabelGroups() { updateLabelGroups() },
    applyDefaultStyle() { applyDefaultStyle() },
    toggleHeight() { toggleHeight() },
    setDimensions(group, height, width) {
      this.$store.commit('graphic/setDimensions', {group, height, width})
    },
    applyDimensions() {
      this.$store.dispatch('graphic/setAllDimensions', {
        height: +document.getElementById('mapHeightInput').value,
        width: +document.getElementById('mapWidthInput').value,
      })
    },
    ...mapMutations('global', [
      'placePoints',
      'calculateVoronoi',
      'detectNeighbors',
    ]),
    ...mapMutations('names', {
      resetNames: 'resetNameBases',
      setNameFields: 'setFields',
      addLanguage: 'addLanguage',
      resetChain: 'resetChain',
      calculateChain: 'calculateChain',
    }),
    ...mapActions('names', {
      calculateChains: 'calculateChains',
    }),
    ...mapMutations('cultures', {
      setCultures: 'setCultures',
      recalculateCultureTree: 'recalculateTree',
      verifyBases: 'verifyBases',
    }),
    ...mapActions('cultures', {
      generateCultures: 'generate',
      setCultureCenter: 'setCenter',
      addCulture: 'add',
      deleteCulture: 'delete',
    }),
  },
  components: { Dialogs, Graphic, Options },
  mounted() {
    const self = this
    const version = '0.60b'
    document.title += ' ' + version

    svg = d3.select('svg')
    defs = svg.select('#deftemp')
    viewbox = svg.append('g').attr('id', 'viewbox')
    ocean = viewbox.append('g').attr('id', 'ocean')
    oceanLayers = ocean.append('g').attr('id', 'oceanLayers')
    oceanPattern = ocean.append('g').attr('id', 'oceanPattern')
    landmass = viewbox.append('g').attr('id', 'landmass')
    terrs = viewbox.append('g').attr('id', 'terrs')
    grid = viewbox.append('g').attr('id', 'grid')
    overlay = viewbox.append('g').attr('id', 'overlay')
    rivers = viewbox.append('g').attr('id', 'rivers')
    terrain = viewbox.append('g').attr('id', 'terrain')
    cults = viewbox.append('g').attr('id', 'cults')
    regions = viewbox.append('g').attr('id', 'regions')
    borders = viewbox.append('g').attr('id', 'borders')
    stateBorders = borders.append('g').attr('id', 'stateBorders')
    neutralBorders = borders.append('g').attr('id', 'neutralBorders')
    lakes = viewbox.append('g').attr('id', 'lakes')
    routes = viewbox.append('g').attr('id', 'routes')
    roads = routes.append('g').attr('id', 'roads').attr('data-type', 'land')
    trails = routes.append('g').attr('id', 'trails').attr('data-type', 'land')
    searoutes = routes.append('g').attr('id', 'searoutes').attr('data-type', 'sea')
    coastline = viewbox.append('g').attr('id', 'coastline')
    labels = viewbox.append('g').attr('id', 'labels')
    burgLabels = labels.append('g').attr('id', 'burgLabels')
    icons = viewbox.append('g').attr('id', 'icons')
    burgIcons = icons.append('g').attr('id', 'burgIcons')
    markers = viewbox.append('g').attr('id', 'markers')
    ruler = viewbox.append('g').attr('id', 'ruler')
    debug = viewbox.append('g').attr('id', 'debug')

    labels.append('g').attr('id', 'countries')
    burgIcons.append('g').attr('id', 'capitals')
    burgLabels.append('g').attr('id', 'capitals')
    burgIcons.append('g').attr('id', 'towns')
    burgLabels.append('g').attr('id', 'towns')
    icons.append('g').attr('id', 'capital-anchors')
    icons.append('g').attr('id', 'town-anchors')
    terrain.append('g').attr('id', 'hills')
    terrain.append('g').attr('id', 'mounts')
    terrain.append('g').attr('id', 'swamps')
    terrain.append('g').attr('id', 'forests')

    // append ocean pattern
    oceanPattern.append('rect').attr('fill', 'url(#oceanic)').attr('stroke', 'none')
    oceanLayers.append('rect').attr('id', 'oceanBase')

    // canvas element for raster images
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    // D3 drag and zoom behavior
    let scale = 1, viewX = 0, viewY = 0
    const zoom = d3.zoom().scaleExtent([1, 20]).on('zoom', zoomed)
    svg.call(zoom)

    // D3 Line generator variables
    const lineGen = d3.line().x(function(d) {
      return d.scX
    }).y(function(d) {
      return d.scY
    }).curve(d3.curveCatmullRom)

    applyStoredOptions()
    self.applyDimensions()

    // toggle off loading screen and on menus
    $('#loading, #initial').remove()
    svg.style('background-color', '#000000')
    if (localStorage.getItem('disable_click_arrow_tooltip')) {
      tooltip.innerHTML = ''
      tooltip.setAttribute('data-main', '')
      $('#optionsTrigger').removeClass('glow')
    }

    $('#mapLayers').sortable({items: 'li:not(.solid)', cancel: '.solid', update: moveLayer})
    $('#templateBody').sortable({items: 'div:not(div[data-type=\'Mountain\'])'})
    $('#mapLayers, #templateBody').disableSelection()

    function zoomed() {
      const scaleDiff = Math.abs(scale - d3.event.transform.k)
      scale = d3.event.transform.k
      viewX = d3.event.transform.x
      viewY = d3.event.transform.y
      viewbox.attr('transform', d3.event.transform)
      // rescale only if zoom is significally changed
      if (scaleDiff > 0.001) {
        invokeActiveZooming()
        drawScaleBar()
      }
    }

    // Zoom to specific point (x,y - coods, z - scale, d - duration)
    function zoomTo(x, y, z, d) {
      const transform = d3.zoomIdentity.translate(x * -z + self.graphWidth / 2, y * -z + self.graphHeight / 2)
                          .scale(z)
      svg.transition().duration(d).call(zoom.transform, transform)
    }

    // Reset zoom to initial
    function resetZoom(duration) {
      zoom.transform(svg, d3.zoomIdentity)
    }

    // Active zooming
    function invokeActiveZooming() {
      // toggle shade/blur filter on zoom
      let filter = scale > 2.6 ? 'url(#blurFilter)' : 'url(#dropShadow)'
      if (scale > 1.5 && scale <= 2.6) filter = null
      coastline.attr('filter', filter)
      // rescale lables on zoom (active zooming)
      labels.selectAll('g').each(function(d) {
        const el = d3.select(this)
        if (el.attr('id') === 'burgLabels') return
        const desired = +el.attr('data-size')
        let relative = _.round((desired + desired / scale) / 2, 2)
        if (relative < 2) relative = 2
        el.attr('font-size', relative)
        if ($('#hideLabels').checked) {
          el.classed('hidden', relative * scale < 6)
          updateLabelGroups()
        }
      })

      // rescale map markers
      markers.selectAll('use').each(function(d) {
        const el = d3.select(this)
        let x = +el.attr('data-x'), y = +el.attr('data-y')
        const desired = +el.attr('data-size')
        let size = desired * 5 + 25 / scale
        if (size < 1) size = 1
        el.attr('x', x - size / 2).attr('y', y - size).attr('width', size).attr('height', size)
      })

      if (ruler.size()) {
        if (ruler.style('display') !== 'none') {
          if (ruler.selectAll('g').size() < 1) {return}
          const factor = _.round(1 / Math.pow(scale, 0.3), 1)
          ruler.selectAll('circle:not(.center)').attr('r', 2 * factor)
               .attr('stroke-width', 0.5 * factor)
          ruler.selectAll('circle.center').attr('r', 1.2 * factor)
               .attr('stroke-width', 0.3 * factor)
          ruler.selectAll('text').attr('font-size', 10 * factor)
          ruler.selectAll('line, path').attr('stroke-width', factor)
        }
      }
    }

    addDragToUpload()

    // Changelog dialog window
    const storedVersion = localStorage.getItem('version') // show message on load
    if (storedVersion != version) {
      alertMessage.innerHTML = `<b>2018-29-23</b>:
  The <i>Fantasy Map Generator</i> is updated up to version <b>${version}</b>.
  Main changes:<br><br>
  <li>Map Markers</li>
  <li>Legend Editor (text notes)</li>
  <li>Bug fixes</li>
  <br>See a <a href='https://www.reddit.com/r/FantasyMapGenerator/comments/9iarje/update_new_version_is_published_v060b' target='_blank'>dedicated post</a> for the details.
  <br><br>
  <i>Join our <a href='https://www.reddit.com/r/FantasyMapGenerator/' target='_blank'>Reddit community</a>
  to share created maps, discuss the Generator, report bugs, ask questions and propose new features.
  You may also report bugs <a href='https://github.com/Azgaar/Fantasy-Map-Generator/issues' target='_blank'>here</a>.</i>`

      $('#alert').dialog(
        {
          resizable: false, title: 'Fantasy Map Generator update', width: 320,
          buttons: {
            'Don\'t show again': function() {
              localStorage.setItem('version', version)
              $(this).dialog('close')
            },
            Close: function() {$(this).dialog('close')}
          },
          position: {my: 'center', at: 'center', of: 'svg'}
        })
    }

    getSeed() // get and set random generator seed
    self.resetNames()
    generate() // generate map on load
    applyDefaultStyle() // apply style on load
    focusOn() // based on searchParams focus on point, cell or burg from MFCG
    invokeActiveZooming() // to hide what need to be hidden

    function generate() {
      console.group('Random map')
      console.time('TOTAL')
      applyMapSize()
      randomizeOptions()
      placePoints()
      calculateVoronoi(self.points)
      detectNeighbors()
      drawScaleBar()
      defineHeightmap()
      markFeatures()
      drawOcean()
      elevateLakes()
      resolveDepressionsPrimary()
      reGraph()
      resolveDepressionsSecondary()
      flux()
      addLakes()
      drawCoastline()
      drawRelief()
      self.generateCultures()
      manorsAndRegions()
      cleanData()
      console.timeEnd('TOTAL')
      console.groupEnd()
    }

    // get or generate map seed
    function getSeed() {
      const url = new URL(window.location.href)
      self.params = url.searchParams
      self.seed = self.params.get('seed') || Math.floor(Math.random() * 1e9)
      console.log(' seed: ' + self.seed)
      $('#optionsSeed').value = self.seed
      seedrandom(self.seed)
    }

    // generate new map seed
    function changeSeed() {
      self.seed = Math.floor(Math.random() * 1e9)
      console.log(' seed: ' + self.seed)
      $('#optionsSeed').value = self.seed
      seedrandom(self.seed)
    }

    // load options from LocalStorage is any
    function applyStoredOptions() {
      if (localStorage.getItem('mapWidth') && localStorage.getItem('mapHeight')) {
        mapWidthInput.value = localStorage.getItem('mapWidth')
        mapHeightInput.value = localStorage.getItem('mapHeight')
      } else {
        mapWidthInput.value = window.innerWidth
        mapHeightInput.value = window.innerHeight
      }
      if (localStorage.getItem('graphSize')) {
        self.graphSize = localStorage.getItem('graphSize')
        sizeInput.value = sizeOutput.value = self.graphSize
      } else {
        self.graphSize = +sizeInput.value
      }
      if (localStorage.getItem('template')) {
        templateInput.value = localStorage.getItem('template')
        lockTemplateInput.setAttribute('data-locked', 1)
        lockTemplateInput.className = 'icon-lock'
      }
      if (localStorage.getItem('manors')) {
        manorsInput.value = manorsOutput.value = localStorage.getItem('manors')
        lockManorsInput.setAttribute('data-locked', 1)
        lockManorsInput.className = 'icon-lock'
      }
      if (localStorage.getItem('regions')) {
        regionsInput.value = regionsOutput.value = localStorage.getItem('regions')
        lockRegionsInput.setAttribute('data-locked', 1)
        lockRegionsInput.className = 'icon-lock'
      }
      if (localStorage.getItem('power')) {
        powerInput.value = powerOutput.value = localStorage.getItem('power')
        lockPowerInput.setAttribute('data-locked', 1)
        lockPowerInput.className = 'icon-lock'
      }
      if (localStorage.getItem('neutral')) neutralInput.value =
        neutralOutput.value = localStorage.getItem('neutral')
      if (localStorage.getItem('names')) {
        namesInput.value = localStorage.getItem('names')
        lockNamesInput.setAttribute('data-locked', 1)
        lockNamesInput.className = 'icon-lock'
      }
      if (localStorage.getItem('cultures')) {
        culturesInput.value = culturesOutput.value = localStorage.getItem('cultures')
        lockCulturesInput.setAttribute('data-locked', 1)
        lockCulturesInput.className = 'icon-lock'
      }
      if (localStorage.getItem('prec')) {
        precInput.value = precOutput.value = localStorage.getItem('prec')
        lockPrecInput.setAttribute('data-locked', 1)
        lockPrecInput.className = 'icon-lock'
      }
      if (localStorage.getItem('swampiness')) swampinessInput.value =
        swampinessOutput.value = localStorage.getItem('swampiness')
      if (localStorage.getItem('outlineLayers')) outlineLayersInput.value =
        localStorage.getItem('outlineLayers')
      if (localStorage.getItem('pngResolution')) {
        pngResolutionInput.value = localStorage.getItem('pngResolution')
        pngResolutionOutput.value = pngResolutionInput.value + 'x'
      }
      if (localStorage.getItem('transparency')) {
        transparencyInput.value = transparencyOutput.value = localStorage.getItem('transparency')
        changeDialogsTransparency(transparencyInput.value)
      } else {
        changeDialogsTransparency(0)
      }
    }

    function restoreDefaultOptions() {
      // remove ALL saved data from LocalStorage
      localStorage.clear()
      // set defaut values
      mapWidthInput.value = window.innerWidth
      mapHeightInput.value = window.innerHeight
      changeMapSize()
      self.graphSize = sizeInput.value = sizeOutput.value = 1
      $('#options i[class^=\'icon-lock\']').each(function() {
        this.setAttribute('data-locked', 0)
        this.className = 'icon-lock-open'
        if (this.id === 'lockNeutralInput' || this.id === 'lockSwampinessInput') {
          this.setAttribute('data-locked', 1)
          this.className = 'icon-lock'
        }
      })
      neutralInput.value = neutralOutput.value = 200
      swampinessInput.value = swampinessOutput.value = 10
      outlineLayersInput.value = '-6,-3,-1'
      transparencyInput.value = transparencyOutput.value = 0
      changeDialogsTransparency(0)
      pngResolutionInput.value = 5
      pngResolutionOutput.value = '5x'
      randomizeOptions()
    }

    // randomize options if randomization is allowed in option
    function randomizeOptions() {
      const mod = _.round((self.graphWidth + self.graphHeight) / 1500, 2) // add mod for big screens
      if (lockRegionsInput.getAttribute('data-locked') == 0)
        regionsInput.value = regionsOutput.value = _.random(7, 17)
      if (lockManorsInput.getAttribute('data-locked') == 0)
        manorsInput.value = manorsOutput.innerHTML = regionsInput.value * 20 + _.random(180 * mod)
      if (lockPowerInput.getAttribute('data-locked') == 0)
        powerInput.value = powerOutput.value = _.random(2, 8)
      if (lockNeutralInput.getAttribute('data-locked') == 0)
        neutralInput.value = neutralOutput.value = _.random(100, 300)
      if (lockNamesInput.getAttribute('data-locked') == 0)
        namesInput.value = _.random(0, 1)
      if (lockCulturesInput.getAttribute('data-locked') == 0)
        culturesInput.value = culturesOutput.value = _.random(5, 10)
      if (lockPrecInput.getAttribute('data-locked') == 0)
        precInput.value = precOutput.value = _.random(3, 12)
      if (lockSwampinessInput.getAttribute('data-locked') == 0)
        swampinessInput.value = swampinessOutput.value = _.random(100)
    }

    // Locate points to calculate Voronoi diagram
    function placePoints() {
      console.time('placePoints')
      self.placePoints({height: self.graphHeight, width: self.graphWidth})
      console.timeEnd('placePoints')
    }

    // Calculate Voronoi Diagram
    function calculateVoronoi(points) {
      console.time('calculateVoronoi')
      self.calculateVoronoi({voronoi, points})
      console.log(' cells: ' + points.length)
      console.timeEnd('calculateVoronoi')
    }

    // restore default drag (map panning) and cursor
    function restoreDefaultEvents() {
      viewbox.style('cursor', 'default').on('.drag', null).on('click', null)
    }

    // remove parent element (usually if child is clicked)
    function removeParent() {
      $(this.parentNode).remove()
    }

    // define selection based on radius
    function defineBrushSelection(center, r) {
      let radius = r
      let selection = [center]
      if (radius > 1) selection = selection.concat(self.cells[center].neighbors)
      selection = $.grep(selection, function(e) {return self.cells[e].height >= 20})
      if (radius === 2) return selection
      let frontier = self.cells[center].neighbors
      while (radius > 2) {
        let cycle = frontier.slice()
        frontier = []
        cycle.map(function(s) {
          self.cells[s].neighbors.forEach(function(e) {
            if (selection.indexOf(e) !== -1) return
            // if (cells[e].height < 20) return;
            selection.push(e)
            frontier.push(e)
          })
        })
        radius--
      }
      selection = $.grep(selection, function(e) {return self.cells[e].height >= 20})
      return selection
    }

    // Mouseclick events
    function placeLinearFeature() {
      const point = d3.mouse(this)
      const index = getIndex(point)
      let tag = debug.selectAll('.tag')
      if (!tag.size()) {
        tag = debug.append('circle').attr('data-cell', index).attr('class', 'tag')
                   .attr('r', 3).attr('cx', point[0]).attr('cy', point[1])
      } else {
        const from = +tag.attr('data-cell')
        debug.selectAll('.tag, .line').remove()
        const power = +brushPower.value
        const mod = $('#brushesButtons > .pressed').attr('id') === 'brushRange' ? 1 : -1
        const selection = addRange(mod, power, from, index)
        updateHeightmapSelection(selection)
      }
    }

    // turn D3 polygons array into cell array, define neighbors for each cell
    function detectNeighbors(withGrid) {
      console.time('detectNeighbors')
      self.detectNeighbors({grid})
      console.timeEnd('detectNeighbors')
    }

    // Generate Heigtmap routine
    function defineHeightmap() {
      console.time('defineHeightmap')
      if (lockTemplateInput.getAttribute('data-locked') == 0) {
        const rnd = Math.random()
        if (rnd > 0.95) {
          templateInput.value = 'Volcano'
        } else if (rnd > 0.75) {
          templateInput.value = 'High Island'
        } else if (rnd > 0.55) {
          templateInput.value = 'Low Island'
        } else if (rnd > 0.35) {
          templateInput.value = 'Continents'
        } else if (rnd > 0.15) {
          templateInput.value = 'Archipelago'
        } else if (rnd > 0.10) {
          templateInput.value = 'Mainland'
        } else if (rnd > 0.01) {templateInput.value = 'Peninsulas'} else {
          templateInput.value = 'Atoll'
        }
      }
      const mapTemplate = templateInput.value
      if (mapTemplate === 'Volcano') templateVolcano()
      if (mapTemplate === 'High Island') templateHighIsland()
      if (mapTemplate === 'Low Island') templateLowIsland()
      if (mapTemplate === 'Continents') templateContinents()
      if (mapTemplate === 'Archipelago') templateArchipelago()
      if (mapTemplate === 'Atoll') templateAtoll()
      if (mapTemplate === 'Mainland') templateMainland()
      if (mapTemplate === 'Peninsulas') templatePeninsulas()
      console.log(' template: ' + mapTemplate)
      console.timeEnd('defineHeightmap')
    }

    // Heighmap Template: Volcano
    function templateVolcano(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      addHill(5, 0.35)
      addRange(3)
      addRange(-4)
    }

// Heighmap Template: High Island
    function templateHighIsland(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      addRange(6)
      addHill(12, 0.25)
      addRange(-3)
      modifyHeights('land', 0, 0.75)
      addPit(1)
      addHill(3, 0.15)
    }

// Heighmap Template: Low Island
    function templateLowIsland(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      smoothHeights(2)
      addRange(2)
      addHill(4, 0.4)
      addHill(12, 0.2)
      addRange(-8)
      modifyHeights('land', 0, 0.35)
    }

    // Heighmap Template: Continents
    function templateContinents(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      addHill(30, 0.25)
      const count = Math.ceil(Math.random() * 4 + 4)
      addStrait(count)
      addPit(10)
      addRange(-10)
      modifyHeights('land', 0, 0.6)
      smoothHeights(2)
      addRange(3)
    }

    // Heighmap Template: Archipelago
    function templateArchipelago(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      addHill(12, 0.15)
      addRange(8)
      const count = Math.ceil(Math.random() * 2 + 2)
      addStrait(count)
      addRange(-15)
      addPit(10)
      modifyHeights('land', -5, 0.7)
      smoothHeights(3)
    }

    // Heighmap Template: Atoll
    function templateAtoll(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      addHill(2, 0.35)
      addRange(2)
      smoothHeights(1)
      modifyHeights('27-100', 0, 0.1)
    }

    // Heighmap Template: Mainland
    function templateMainland(mod) {
      addMountain()
      modifyHeights('all', 10, 1)
      addHill(30, 0.2)
      addRange(10)
      addPit(20)
      addHill(10, 0.15)
      addRange(-10)
      modifyHeights('land', 0, 0.4)
      addRange(10)
      smoothHeights(3)
    }

    // Heighmap Template: Peninsulas
    function templatePeninsulas(mod) {
      addMountain()
      modifyHeights('all', 15, 1)
      addHill(30, 0)
      addRange(5)
      addPit(15)
      const count = Math.ceil(Math.random() * 5 + 15)
      addStrait(count)
    }

    function addMountain() {
      const x = Math.floor(Math.random() * self.graphWidth / 3 + self.graphWidth / 3)
      const y = Math.floor(Math.random() * self.graphHeight * 0.2 + self.graphHeight * 0.4)
      const cell = self.diagram.find(x, y).index
      const height = Math.random() * 10 + 90 // 90-99
      add(cell, 'mountain', height)
    }

    // place with shift 0-0.5
    function addHill(count, shift) {
      for (let c = 0; c < count; c++) {
        let limit = 0, cell, height
        do {
          height = Math.random() * 40 + 10 // 10-50
          const x = Math.floor(Math.random() * self.graphWidth * (1 - shift * 2) + self.graphWidth * shift)
          const y = Math.floor(Math.random() * self.graphHeight * (1 - shift * 2) + self.graphHeight * shift)
          cell = self.diagram.find(x, y).index
          limit++
        } while (self.heights[cell] + height > 90 && limit < 100)
        add(cell, 'hill', height)
      }
    }

    function add(start, type, height) {
      const session = Math.ceil(Math.random() * 1e5)
      let radius
      let hRadius
      let mRadius
      switch (+self.graphSize) {
        case 1:
          hRadius = 0.991
          mRadius = 0.91
          break
        case 2:
          hRadius = 0.9967
          mRadius = 0.951
          break
        case 3:
          hRadius = 0.999
          mRadius = 0.975
          break
        case 4:
          hRadius = 0.9994
          mRadius = 0.98
          break
      }
      radius = type === 'mountain' ? mRadius : hRadius
      const queue = [start]
      if (type === 'mountain') self.heights[start] = height
      for (let i = 0; i < queue.length && height >= 1; i++) {
        if (type === 'mountain') {
          height = self.heights[queue[i]] * radius - height / 100
        } else {height *= radius}
        self.cells[queue[i]].neighbors.forEach(function(e) {
          if (self.cells[e].used === session) return
          const mod = Math.random() * 0.2 + 0.9 // 0.9-1.1 random factor
          self.heights[e] += height * mod
          if (self.heights[e] > 100) self.heights[e] = 100
          self.cells[e].used = session
          queue.push(e)
        })
      }
    }

    function addRange(mod, height, from, to) {
      const session = Math.ceil(Math.random() * 100000)
      const count = Math.abs(mod)
      let range = []
      for (let c = 0; c < count; c++) {
        range = []
        let diff = 0, start = from, end = to
        if (!start || !end) {
          do {
            const xf = Math.floor(Math.random() * (self.graphWidth * 0.7)) + self.graphWidth * 0.15
            const yf = Math.floor(Math.random() * (self.graphHeight * 0.6)) + self.graphHeight * 0.2
            start = self.diagram.find(xf, yf).index
            const xt = Math.floor(Math.random() * (self.graphWidth * 0.7)) + self.graphWidth * 0.15
            const yt = Math.floor(Math.random() * (self.graphHeight * 0.6)) + self.graphHeight * 0.2
            end = self.diagram.find(xt, yt).index
            diff = Math.hypot(xt - xf, yt - yf)
          } while (diff < 150 / self.graphSize || diff > 300 / self.graphSize)
        }
        if (start && end) {
          for (let l = 0; start != end && l < 10000; l++) {
            let min = 10000
            self.cells[start].neighbors.forEach(function(e) {
              diff = Math.hypot(self.cells[end].data[0] - self.cells[e].data[0],
                self.cells[end].data[1] - self.cells[e].data[1])
              if (Math.random() > 0.8) diff = diff / 2
              if (diff < min) {min = diff, start = e}
            })
            range.push(start)
          }
        }
        const change = height ? height : Math.random() * 10 + 10
        range.map(function(r) {
          let rnd = Math.random() * 0.4 + 0.8
          if (mod > 0) self.heights[r] += change * rnd
          else if (self.heights[r] >= 10) {self.heights[r] -= change * rnd}
          self.cells[r].neighbors.forEach(function(e) {
            if (self.cells[e].used === session) return
            self.cells[e].used = session
            rnd = Math.random() * 0.4 + 0.8
            const ch = change / 2 * rnd
            if (mod > 0) {self.heights[e] += ch} else if (self.heights[e] >= 10) {self.heights[e] -= ch}
            if (self.heights[e] > 100) self.heights[e] = mod > 0 ? 100 : 5
          })
          if (self.heights[r] > 100) self.heights[r] = mod > 0 ? 100 : 5
        })
      }
      return range
    }

    function addStrait(width) {
      const session = Math.ceil(Math.random() * 100000)
      const top = Math.floor(Math.random() * self.graphWidth * 0.35 + self.graphWidth * 0.3)
      const bottom = Math.floor(
        (self.graphWidth - top) - (self.graphWidth * 0.1) + (Math.random() * self.graphWidth * 0.2))
      let start = self.diagram.find(top, self.graphHeight * 0.1).index
      const end = self.diagram.find(bottom, self.graphHeight * 0.9).index
      let range = []
      for (let l = 0; start !== end && l < 1000; l++) {
        let min = 10000 // dummy value
        self.cells[start].neighbors.forEach(function(e) {
          let diff = Math.hypot(self.cells[end].data[0] - self.cells[e].data[0],
            self.cells[end].data[1] - self.cells[e].data[1])
          if (Math.random() > 0.8) {diff = diff / 2}
          if (diff < min) {
            min = diff
            start = e
          }
        })
        range.push(start)
      }
      const query = []
      for (; width > 0; width--) {
        range.map(function(r) {
          self.cells[r].neighbors.forEach(function(e) {
            if (self.cells[e].used === session) {return}
            self.cells[e].used = session
            query.push(e)
            self.heights[e] *= 0.23
            if (self.heights[e] > 100 || self.heights[e] < 5) self.heights[e] = 5
          })
          range = query.slice()
        })
      }
    }

    function addPit(count, height, cell) {
      const session = Math.ceil(Math.random() * 1e5)
      for (let c = 0; c < count; c++) {
        let change = height ? height + 10 : Math.random() * 10 + 20
        let start = cell
        if (!start) {
          const lowlands = $.grep(self.cells, function(e) {return (self.heights[e.index] >= 20)})
          if (!lowlands.length) return
          const rnd = Math.floor(Math.random() * lowlands.length)
          start = lowlands[rnd].index
        }
        let query = [start], newQuery = []
        // depress pit center
        self.heights[start] -= change
        if (self.heights[start] < 5 || self.heights[start] > 100) self.heights[start] = 5
        self.cells[start].used = session
        for (let i = 1; i < 10000; i++) {
          const rnd = Math.random() * 0.4 + 0.8
          change -= i / 0.6 * rnd
          if (change < 1) break
          query.map(function(p) {
            self.cells[p].neighbors.forEach(function(e) {
              if (self.cells[e].used === session) return
              self.cells[e].used = session
              if (Math.random() > 0.8) return
              newQuery.push(e)
              self.heights[e] -= change
              if (self.heights[e] < 5 || self.heights[e] > 100) self.heights[e] = 5
            })
          })
          query = newQuery.slice()
          newQuery = []
        }
      }
    }

    // Modify heights adding or multiplying by value
    function modifyHeights(range, add, mult) {
      function modify(v) {
        if (add) v += add
        if (mult !== 1) {
          if (mult === '^2') mult = (v - 20) / 100
          if (mult === '^3') mult = ((v - 20) * (v - 20)) / 100
          if (range === 'land') {v = 20 + (v - 20) * mult} else {v *= mult}
        }
        if (v < 0) v = 0
        if (v > 100) v = 100
        return v
      }

      const limMin = range === 'land' ? 20 : range === 'all' ? 0 : +range.split('-')[0]
      const limMax = range === 'land' || range === 'all' ? 100 : +range.split('-')[1]

      for (let i = 0; i < self.heights.length; i++) {
        if (self.heights[i] < limMin || self.heights[i] > limMax) continue
        self.heights[i] = modify(self.heights[i])
      }
    }

    // Smooth heights using mean of neighbors
    function smoothHeights(fraction) {
      const fr = fraction || 2
      for (let i = 0; i < self.heights.length; i++) {
        const nHeights = [self.heights[i]]
        self.cells[i].neighbors.forEach(function(e) {nHeights.push(self.heights[e])})
        self.heights[i] = (self.heights[i] * (fr - 1) + d3.mean(nHeights)) / fr
      }
    }

    // Randomize heights a bit
    function disruptHeights() {
      for (let i = 0; i < self.heights.length; i++) {
        if (self.heights[i] < 18) continue
        if (Math.random() < 0.5) continue
        self.heights[i] += 2 - Math.random() * 4
      }
    }

    // Mark features (ocean, lakes, islands)
    function markFeatures() {
      console.time('markFeatures')
      seedrandom(self.seed) // reset seed to get the same result on heightmap edit
      for (let i = 0, queue = [0]; queue.length > 0; i++) {
        const cell = self.cells[queue[0]]
        cell.fn = i // feature number
        const land = self.heights[queue[0]] >= 20
        let border = cell.type === 'border'
        if (border && land) cell.ctype = 2

        while (queue.length) {
          const q = queue.pop()
          if (self.cells[q].type === 'border') {
            border = true
            if (self.land) self.cells[q].ctype = 2
          }

          self.cells[q].neighbors.forEach(function(e) {
            const eLand = self.heights[e] >= 20
            if (self.land === eLand && self.cells[e].fn === undefined) {
              self.cells[e].fn = i
              queue.push(e)
            }
            if (self.land && !eLand) {
              self.cells[q].ctype = 2
              self.cells[e].ctype = -1
              self.cells[q].harbor = self.cells[q].harbor ? self.cells[q].harbor + 1 : 1
            }
          })
        }
        self.features.push({i, land, border})

        // find unmarked cell
        for (let c = 0; c < self.cells.length; c++) {
          if (self.cells[c].fn === undefined) {
            queue[0] = c
            break
          }
        }
      }
      console.timeEnd('markFeatures')
    }

    function drawOcean() {
      console.time('drawOcean')
      let limits = []
      let odd = 0.8 // initial odd for ocean layer is 80%
      // Define type of ocean cells based on cell distance form land
      let frontier = $.grep(self.cells, function(e) {return e.ctype === -1})
      if (Math.random() < odd) {
        limits.push(-1)
        odd = 0.2
      }
      for (let c = -2; frontier.length > 0 && c > -10; c--) {
        if (Math.random() < odd) {
          limits.unshift(c)
          odd = 0.2
        } else {odd += 0.2}
        frontier.map(function(i) {
          i.neighbors.forEach(function(e) {
            if (!self.cells[e].ctype) self.cells[e].ctype = c
          })
        })
        frontier = $.grep(self.cells, function(e) {return e.ctype === c})
      }
      if (outlineLayersInput.value === 'none') return
      if (outlineLayersInput.value !== 'random') limits = outlineLayersInput.value.split(',')
      // Define area edges
      const opacity = _.round(0.4 / limits.length, 2)
      for (let l = 0; l < limits.length; l++) {
        const edges = []
        const lim = +limits[l]
        for (let i = 0; i < self.cells.length; i++) {
          if (self.cells[i].ctype < lim || self.cells[i].ctype === undefined) continue
          if (self.cells[i].ctype > lim && self.cells[i].type !== 'border') continue
          const cell = self.diagram.cells[i]
          cell.halfedges.forEach(function(e) {
            const edge = self.diagram.edges[e]
            const start = edge[0].join(' ')
            const end = edge[1].join(' ')
            if (edge.left && edge.right) {
              const ea = edge.left.index === i ? edge.right.index : edge.left.index
              if (self.cells[ea].ctype < lim) edges.push({start, end})
            } else {
              edges.push({start, end})
            }
          })
        }
        lineGen.curve(d3.curveBasis)
        let relax = 0.8 - l / 10
        if (relax < 0.2) relax = 0.2
        const line = getContinuousLine(edges, 0, relax)
        oceanLayers.append('path').attr('d', line).attr('fill', '#ecf2f9')
                   .style('opacity', opacity)
      }
      console.timeEnd('drawOcean')
    }

    // recalculate Voronoi Graph to pack cells
    function reGraph() {
      console.time('reGraph')
      const tempCells = []
      const newPoints = [] // to store new data
      // get average precipitation based on graph size
      const avPrec = precInput.value / 5000
      const smallLakesMax = 500
      let smallLakes = 0
      const evaporation = 2
      self.cells.map(function(i, d) {
        let height = i.height || self.heights[d]
        if (height > 100) height = 100
        const pit = i.pit
        const ctype = i.ctype
        if (ctype !== -1 && ctype !== -2 && height < 20) return // exclude all deep ocean points
        const x = _.round(i.data[0], 1), y = _.round(i.data[1], 1)
        const fn = i.fn
        const harbor = i.harbor
        let lake = i.lake
        // mark potential cells for small lakes to add additional point there
        if (smallLakes < smallLakesMax && !lake && pit > evaporation && ctype !== 2) {
          lake = 2
          smallLakes++
        }
        const region = i.region // handle value for edit heightmap mode only
        const culture = i.culture // handle value for edit heightmap mode only
        let copy = $.grep(newPoints, function(e) {return (e[0] == x && e[1] == y)})
        if (!copy.length) {
          newPoints.push([x, y])
          tempCells.push({
            index: tempCells.length,
            data: [x, y],
            height,
            pit,
            ctype,
            fn,
            harbor,
            lake,
            region,
            culture
          })
        }
        // add additional points for cells along coast
        if (ctype === 2 || ctype === -1) {
          if (i.type === 'border') return
          if (!self.features[fn].land && !self.features[fn].border) return
          i.neighbors.forEach(function(e) {
            if (self.cells[e].ctype === ctype) {
              let x1 = _.round((x * 2 + self.cells[e].data[0]) / 3, 1)
              let y1 = _.round((y * 2 + self.cells[e].data[1]) / 3, 1)
              copy = $.grep(newPoints, function(e) {return e[0] === x1 && e[1] === y1})
              if (copy.length) return
              newPoints.push([x1, y1])
              tempCells.push({
                index: tempCells.length,
                data: [x1, y1],
                height,
                pit,
                ctype,
                fn,
                harbor,
                lake,
                region,
                culture
              })
            }
          })
        }
        if (lake === 2) { // add potential small lakes
          self.polygons[i.index].forEach(function(e) {
            if (Math.random() > 0.8) return
            let rnd = Math.random() * 0.6 + 0.8
            const x1 = _.round((e[0] * rnd + i.data[0]) / (1 + rnd), 2)
            rnd = Math.random() * 0.6 + 0.8
            const y1 = _.round((e[1] * rnd + i.data[1]) / (1 + rnd), 2)
            copy = $.grep(newPoints, function(c) {return x1 === c[0] && y1 === c[1]})
            if (copy.length) return
            newPoints.push([x1, y1])
            tempCells.push(
              {index: tempCells.length, data: [x1, y1], height, pit, ctype, fn, region, culture})
          })
        }
      })
      console.log('small lakes candidates: ' + smallLakes)
      self.cells = tempCells // use tempCells as the only cells array
      calculateVoronoi(newPoints) // recalculate Voronoi diagram using new points
      let gridPath = '' // store grid as huge single path string
      self.cells.map(function(i, d) {
        if (i.height >= 20) {
          // calc cell area
          i.area = _.round(Math.abs(d3.polygonArea(self.polygons[d])), 2)
          const prec = _.round(avPrec * i.area, 2)
          i.flux = i.lake ? prec * 10 : prec
        }
        const neighbors = [] // re-detect neighbors
        self.diagram.cells[d].halfedges.forEach(function(e) {
          const edge = self.diagram.edges[e]
          if (edge.left === undefined || edge.right === undefined) {
            if (i.height >= 20) i.ctype = 99 // border cell
            return
          }
          const ea = edge.left.index === d ? edge.right.index : edge.left.index
          neighbors.push(ea)
          if (d < ea && i.height >= 20 && i.lake !== 1 && self.cells[ea].height >= 20 && self.cells[ea].lake !== 1) {
            gridPath += 'M' + edge[0][0] + ',' + edge[0][1] + 'L' + edge[1][0] + ',' + edge[1][1]
          }
        })
        i.neighbors = neighbors
        if (i.region === undefined) delete i.region
        if (i.culture === undefined) delete i.culture
      })
      grid.append('path').attr('d', gridPath)
      console.timeEnd('reGraph')
    }

    // redraw all cells for Customization 1 mode
    function mockHeightmap() {
      let landCells = 0
      $('#landmass').empty()
      const limit = renderOcean.checked ? 1 : 20
      for (let i = 0; i < self.heights.length; i++) {
        if (self.heights[i] < limit) continue
        if (self.heights[i] > 100) self.heights[i] = 100
        const clr = color(1 - self.heights[i] / 100)
        landmass.append('path').attr('id', 'cell' + i)
                .attr('d', 'M' + self.polygons[i].join('L') + 'Z')
                .attr('fill', clr).attr('stroke', clr)
      }
    }

    $('#renderOcean').click(mockHeightmap)

    // draw or update all cells
    function updateHeightmap() {
      const limit = renderOcean.checked ? 1 : 20
      for (let i = 0; i < self.heights.length; i++) {
        if (self.heights[i] > 100) self.heights[i] = 100
        let cell = landmass.select('#cell' + i)
        const clr = color(1 - self.heights[i] / 100)
        if (cell.size()) {
          if (self.heights[i] < limit) {cell.remove()} else {
            cell.attr('fill', clr).attr('stroke', clr)
          }
        } else if (self.heights[i] >= limit) {
          cell = landmass.append('path').attr('id', 'cell' + i)
                         .attr('d', 'M' + self.polygons[i].join('L') + 'Z')
                         .attr('fill', clr).attr('stroke', clr)
        }
      }
    }

    // draw or update cells from the selection
    function updateHeightmapSelection(selection) {
      if (selection === undefined) return
      const limit = renderOcean.checked ? 1 : 20
      selection.map(function(s) {
        if (self.heights[s] > 100) self.heights[s] = 100
        let cell = landmass.select('#cell' + s)
        const clr = color(1 - self.heights[s] / 100)
        if (cell.size()) {
          if (self.heights[s] < limit) {cell.remove()} else {
            cell.attr('fill', clr).attr('stroke', clr)
          }
        } else if (self.heights[s] >= limit) {
          cell = landmass.append('path').attr('id', 'cell' + s)
                         .attr('d', 'M' + self.polygons[s].join('L') + 'Z')
                         .attr('fill', clr).attr('stroke', clr)
        }
      })
    }

    function updateHistory() {
      let landCells = 0 // count number of land cells
      if (renderOcean.checked) {
        landCells =
          self.heights.reduce(function(s, v) {if (v >= 20) {return s + 1} else {return s}}, 0)
      } else {
        landCells = landmass.selectAll('*').size()
      }
      self.history = self.history.slice(0, self.historyStage)
      self.history[self.historyStage] = self.heights.slice()
      self.historyStage++
      undo.disabled = templateUndo.disabled = self.historyStage <= 1
      redo.disabled = templateRedo.disabled = true
      const landMean = Math.trunc(d3.mean(self.heights))
      const landRatio = _.round(landCells / self.heights.length * 100)
      landmassCounter.innerHTML = landCells
      landmassRatio.innerHTML = landRatio
      landmassAverage.innerHTML = landMean
      // if perspective view dialog is opened, update it
      if ($('#perspectivePanel').is(':visible')) drawPerspective()
    }

    // restoreHistory
    function restoreHistory(step) {
      self.historyStage = step
      redo.disabled = templateRedo.disabled = self.historyStage >= self.history.length
      undo.disabled = templateUndo.disabled = self.historyStage <= 1
      if (self.history[self.historyStage - 1] === undefined) return
      self.heights = self.history[self.historyStage - 1].slice()
      updateHeightmap()
    }

    // restart history from 1st step
    function restartHistory() {
      self.history = []
      self.historyStage = 0
      redo.disabled = templateRedo.disabled = true
      undo.disabled = templateUndo.disabled = true
      updateHistory()
    }

    // Detect and draw the coasline
    function drawCoastline() {
      console.time('drawCoastline')
      seedrandom(self.seed) // reset seed to get the same result on heightmap edit
      const shape = defs.append('mask').attr('id', 'shape').attr('fill', 'black').attr('x', 0)
                        .attr('y', 0).attr('width', '100%').attr('height', '100%')
      $('#landmass').empty()
      let minX = self.graphWidth, maxX = 0 // extreme points
      let minXedge, maxXedge // extreme edges
      const oceanEdges = [], lakeEdges = []
      for (let i = 0; i < self.land.length; i++) {
        const id = self.land[i].index, cell = self.diagram.cells[id]
        const f = self.land[i].fn
        self.land[i].height = Math.trunc(self.land[i].height)
        if (!oceanEdges[f]) {
          oceanEdges[f] = []
          lakeEdges[f] = []
        }
        cell.halfedges.forEach(function(e) {
          const edge = self.diagram.edges[e]
          const start = edge[0].join(' ')
          const end = edge[1].join(' ')
          if (edge.left && edge.right) {
            const ea = edge.left.index === id ? edge.right.index : edge.left.index
            self.cells[ea].height = Math.trunc(self.cells[ea].height)
            if (self.cells[ea].height < 20) {
              self.cells[ea].ctype = -1
              if (self.land[i].ctype !== 1) {
                self.land[i].ctype = 1 // mark coastal land cells
                // move cell point closer to coast
                const x = (self.land[i].data[0] + self.cells[ea].data[0]) / 2
                const y = (self.land[i].data[1] + self.cells[ea].data[1]) / 2
                self.land[i].haven = ea // harbor haven (oposite water cell)
                self.land[i].coastX = _.round(x + (self.land[i].data[0] - x) * 0.1, 1)
                self.land[i].coastY = _.round(y + (self.land[i].data[1] - y) * 0.1, 1)
                self.land[i].data[0] = _.round(x + (self.land[i].data[0] - x) * 0.5, 1)
                self.land[i].data[1] = _.round(y + (self.land[i].data[1] - y) * 0.5, 1)
              }
              if (self.features[self.cells[ea].fn].border) {
                oceanEdges[f].push({start, end})
                // island extreme points
                if (edge[0][0] < minX) {
                  minX = edge[0][0]
                  minXedge = edge[0]
                }
                if (edge[1][0] < minX) {
                  minX = edge[1][0]
                  minXedge = edge[1]
                }
                if (edge[0][0] > maxX) {
                  maxX = edge[0][0]
                  maxXedge = edge[0]
                }
                if (edge[1][0] > maxX) {
                  maxX = edge[1][0]
                  maxXedge = edge[1]
                }
              } else {
                const l = self.cells[ea].fn
                if (!lakeEdges[f][l]) lakeEdges[f][l] = []
                lakeEdges[f][l].push({start, end})
              }
            }
          } else {
            oceanEdges[f].push({start, end})
          }
        })
      }

      for (let f = 0; f < self.features.length; f++) {
        if (!oceanEdges[f]) continue
        if (!oceanEdges[f].length && lakeEdges[f].length) {
          const m = lakeEdges[f].indexOf(d3.max(lakeEdges[f]))
          oceanEdges[f] = lakeEdges[f][m]
          lakeEdges[f][m] = []
        }
        lineGen.curve(d3.curveCatmullRomClosed.alpha(0.1))
        const oceanCoastline = getContinuousLine(oceanEdges[f], 3, 0)
        if (oceanCoastline) {
          shape.append('path').attr('d', oceanCoastline).attr('fill', 'white') // draw the mask
          coastline.append('path').attr('d', oceanCoastline) // draw the coastline
        }
        lineGen.curve(d3.curveBasisClosed)
        lakeEdges[f].forEach(function(l) {
          const lakeCoastline = getContinuousLine(l, 3, 0)
          if (lakeCoastline) {
            shape.append('path').attr('d', lakeCoastline).attr('fill', 'black') // draw the mask
            lakes.append('path').attr('d', lakeCoastline) // draw the lakes
          }
        })
      }
      landmass.append('rect').attr('x', 0).attr('y', 0).attr('width', self.graphWidth)
              .attr('height', self.graphHeight) // draw the landmass
      drawDefaultRuler(minXedge, maxXedge)
      console.timeEnd('drawCoastline')
    }

    // draw default scale bar
    function drawScaleBar() {
      if ($('#scaleBar').hasClass('hidden')) return // no need to re-draw hidden element
      svg.select('#scaleBar').remove() // fully redraw every time
      // get size
      const size = +barSize.value
      const dScale = distanceScale.value
      const unit = distanceUnit.value
      const scaleBar = svg.append('g').attr('id', 'scaleBar')
                          .on('click', editScale)
                          .on('mousemove', function() {
                            tip('Click to open Scale Editor, drag to move')
                          })
                          .call(d3.drag().on('start', elementDrag))
      const init = 100 // actual length in pixels if scale, dScale and size = 1;
      let val = init * size * dScale / scale // bar length in distance unit
      if (val > 900) {val = _.round(val, -3)} // round to 1000
      else if (val > 90) {val = _.round(val, -2)} // round to 100
      else if (val > 9) {val = _.round(val, -1)} // round to 10
      else {val = Math.round(val)} // round to 1
      const l = val * scale / dScale // actual length in pixels on this scale
      const x = 0, y = 0 // initial position
      scaleBar.append('line').attr('x1', x + 0.5).attr('y1', y).attr('x2', x + l + size - 0.5)
              .attr('y2', y).attr('stroke-width', size).attr('stroke', 'white')
      scaleBar.append('line').attr('x1', x).attr('y1', y + size).attr('x2', x + l + size)
              .attr('y2', y + size).attr('stroke-width', size).attr('stroke', '#3d3d3d')
      const dash = size + ' ' + _.round(l / 5 - size, 2)
      scaleBar.append('line').attr('x1', x).attr('y1', y).attr('x2', x + l + size).attr('y2', y)
              .attr('stroke-width', _.round(size * 3, 2)).attr('stroke-dasharray', dash)
              .attr('stroke', '#3d3d3d')
      // big scale
      for (let b = 0; b < 6; b++) {
        const value = _.round(b * l / 5, 2)
        const label = _.round(value * dScale / scale)
        if (b === 5) {
          scaleBar.append('text').attr('x', x + value).attr('y', y - 2 * size)
                  .attr('font-size', _.round(5 * size, 1)).text(label + ' ' + unit)
        } else {
          scaleBar.append('text').attr('x', x + value).attr('y', y - 2 * size)
                  .attr('font-size', _.round(5 * size, 1)).text(label)
        }
      }
      if (barLabel.value !== '') {
        scaleBar.append('text').attr('x', x + (l + 1) / 2).attr('y', y + 2 * size)
                .attr('dominant-baseline', 'text-before-edge')
                .attr('font-size', _.round(5 * size, 1)).text(barLabel.value)
      }
      const bbox = scaleBar.node().getBBox()
      // append backbround rectangle
      scaleBar.insert('rect', ':first-child').attr('x', -10).attr('y', -20)
              .attr('width', bbox.width + 10).attr('height', bbox.height + 15)
              .attr('stroke-width', size).attr('stroke', 'none').attr('filter', 'url(#blur5)')
              .attr('fill', barBackColor.value).attr('opacity', +barBackOpacity.value)
      fitScaleBar()
    }

    // draw default ruler measiring land x-axis edges
    function drawDefaultRuler(minXedge, maxXedge) {
      const rulerNew = ruler.append('g').attr('class', 'linear')
                            .call(d3.drag().on('start', elementDrag))
      if (!minXedge) minXedge = [0, 0]
      if (!maxXedge) maxXedge = [self.svgWidth, self.svgHeight]
      const x1 = _.round(minXedge[0], 2), y1 = _.round(minXedge[1], 2), x2 = _.round(maxXedge[0], 2),
        y2 = _.round(maxXedge[1], 2)
      rulerNew.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
              .attr('class', 'white')
      rulerNew.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
              .attr('class', 'gray').attr('stroke-dasharray', 10)
      rulerNew.append('circle').attr('r', 2).attr('cx', x1).attr('cy', y1).attr('stroke-width', 0.5)
              .attr('data-edge', 'left').call(d3.drag().on('drag', rulerEdgeDrag))
      rulerNew.append('circle').attr('r', 2).attr('cx', x2).attr('cy', y2).attr('stroke-width', 0.5)
              .attr('data-edge', 'rigth').call(d3.drag().on('drag', rulerEdgeDrag))
      const x0 = _.round((x1 + x2) / 2, 2)
      const y0 = _.round((y1 + y2) / 2, 2)
      rulerNew.append('circle').attr('r', 1.2).attr('cx', x0).attr('cy', y0)
              .attr('stroke-width', 0.3).attr('class', 'center')
              .call(d3.drag().on('start', rulerCenterDrag))
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
      const tr = 'rotate(' + angle + ' ' + x0 + ' ' + y0 + ')'
      const dist = Math.round(Math.hypot(x1 - x2, y1 - y2))
      const label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
      rulerNew.append('text').attr('x', x0).attr('y', y0).attr('dy', -1).attr('transform', tr)
              .attr('data-dist', dist).text(label).on('click', removeParent).attr('font-size', 10)
    }

    // drag any element changing transform
    function elementDrag() {
      const el = d3.select(this)
      const tr = parseTransform(el.attr('transform'))
      const dx = +tr[0] - d3.event.x
      const dy = +tr[1] - d3.event.y

      d3.event.on('drag', function() {
        const x = d3.event.x
        const y = d3.event.y
        const transform = `translate(${(dx + x)},${(dy + y)}) rotate(${tr[2]} ${tr[3]} ${tr[4]})`
        el.attr('transform', transform)
        const pp = this.parentNode.parentNode.id
        if (pp === 'burgIcons' || pp === 'burgLabels') {
          tip('Use dragging for fine-tuning only, to move burg to a different cell use "Relocate" button')
        }
        if (pp === 'labels') {
          // also transform curve control circle
          debug.select('circle').attr('transform', transform)
        }
      })

      d3.event.on('end', function() {
        // remember scaleBar bottom-right position
        if (el.attr('id') === 'scaleBar') {
          const xEnd = d3.event.x, yEnd = d3.event.y
          const diff = Math.abs(dx - xEnd) + Math.abs(dy - yEnd)
          if (diff > 5) {
            const bbox = el.node().getBoundingClientRect()
            sessionStorage.setItem('scaleBar', [bbox.right, bbox.bottom])
          }
        }
      })
    }

    // draw ruler circles and update label
    function rulerEdgeDrag() {
      const group = d3.select(this.parentNode)
      const edge = d3.select(this).attr('data-edge')
      const x = d3.event.x, y = d3.event.y
      let x0, y0
      d3.select(this).attr('cx', x).attr('cy', y)
      const line = group.selectAll('line')
      if (edge === 'left') {
        line.attr('x1', x).attr('y1', y)
        x0 = +line.attr('x2')
        y0 = +line.attr('y2')
      } else {
        line.attr('x2', x).attr('y2', y)
        x0 = +line.attr('x1')
        y0 = +line.attr('y1')
      }
      const xc = _.round((x + x0) / 2, 2)
      const yc = _.round((y + y0) / 2, 2)
      group.select('.center').attr('cx', xc).attr('cy', yc)
      const dist = Math.round(Math.hypot(x0 - x, y0 - y))
      const label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
      const atan = x0 > x ? Math.atan2(y0 - y, x0 - x) : Math.atan2(y - y0, x - x0)
      const angle = _.round(atan * 180 / Math.PI, 3)
      const tr = 'rotate(' + angle + ' ' + xc + ' ' + yc + ')'
      group.select('text').attr('x', xc).attr('y', yc).attr('transform', tr).attr('data-dist', dist)
           .text(label)
    }

    // draw ruler center point to split ruler into 2 parts
    function rulerCenterDrag() {
      let xc1, yc1, xc2, yc2
      const group = d3.select(this.parentNode) // current ruler group
      let x = d3.event.x, y = d3.event.y // current coords
      const line = group.selectAll('line') // current lines
      const x1 = +line.attr('x1'), y1 = +line.attr('y1'), x2 = +line.attr('x2'),
        y2 = +line.attr('y2') // initial line edge points
      const rulerNew = ruler.insert('g', ':first-child')
      rulerNew.attr('transform', group.attr('transform')).call(d3.drag().on('start', elementDrag))
      const factor = _.round(1 / Math.pow(scale, 0.3), 1)
      rulerNew.append('line').attr('class', 'white').attr('stroke-width', factor)
      const dash = +group.select('.gray').attr('stroke-dasharray')
      rulerNew.append('line').attr('class', 'gray').attr('stroke-dasharray', dash)
              .attr('stroke-width', factor)
      rulerNew.append('text').attr('dy', -1).on('click', removeParent)
              .attr('font-size', 10 * factor).attr('stroke-width', factor)

      d3.event.on('drag', function() {
        x = d3.event.x, y = d3.event.y
        d3.select(this).attr('cx', x).attr('cy', y)
        // change first part
        line.attr('x1', x1).attr('y1', y1).attr('x2', x).attr('y2', y)
        let dist = Math.round(Math.hypot(x1 - x, y1 - y))
        let label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
        let atan = x1 > x ? Math.atan2(y1 - y, x1 - x) : Math.atan2(y - y1, x - x1)
        xc1 = _.round((x + x1) / 2, 2)
        yc1 = _.round((y + y1) / 2, 2)
        let tr = 'rotate(' + _.round(atan * 180 / Math.PI, 3) + ' ' + xc1 + ' ' + yc1 + ')'
        group.select('text').attr('x', xc1).attr('y', yc1).attr('transform', tr)
             .attr('data-dist', dist).text(label)
        // change second (new) part
        dist = Math.round(Math.hypot(x2 - x, y2 - y))
        label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
        atan = x2 > x ? Math.atan2(y2 - y, x2 - x) : Math.atan2(y - y2, x - x2)
        xc2 = _.round((x + x2) / 2, 2)
        yc2 = _.round((y + y2) / 2, 2)
        tr = 'rotate(' + _.round(atan * 180 / Math.PI, 3) + ' ' + xc2 + ' ' + yc2 + ')'
        rulerNew.selectAll('line').attr('x1', x).attr('y1', y).attr('x2', x2).attr('y2', y2)
        rulerNew.select('text').attr('x', xc2).attr('y', yc2).attr('transform', tr)
                .attr('data-dist', dist).text(label)
      })

      d3.event.on('end', function() {
        // circles for 1st part
        group.selectAll('circle').remove()
        group.append('circle').attr('cx', x1).attr('cy', y1).attr('r', 2 * factor)
             .attr('stroke-width', 0.5 * factor).attr('data-edge', 'left')
             .call(d3.drag().on('drag', rulerEdgeDrag))
        group.append('circle').attr('cx', x).attr('cy', y).attr('r', 2 * factor)
             .attr('stroke-width', 0.5 * factor).attr('data-edge', 'rigth')
             .call(d3.drag().on('drag', rulerEdgeDrag))
        group.append('circle').attr('cx', xc1).attr('cy', yc1).attr('r', 1.2 * factor)
             .attr('stroke-width', 0.3 * factor).attr('class', 'center')
             .call(d3.drag().on('start', rulerCenterDrag))
        // circles for 2nd part
        rulerNew.append('circle').attr('cx', x).attr('cy', y).attr('r', 2 * factor)
                .attr('stroke-width', 0.5 * factor).attr('data-edge', 'left')
                .call(d3.drag().on('drag', rulerEdgeDrag))
        rulerNew.append('circle').attr('cx', x2).attr('cy', y2).attr('r', 2 * factor)
                .attr('stroke-width', 0.5 * factor).attr('data-edge', 'rigth')
                .call(d3.drag().on('drag', rulerEdgeDrag))
        rulerNew.append('circle').attr('cx', xc2).attr('cy', yc2).attr('r', 1.2 * factor)
                .attr('stroke-width', 0.3 * factor).attr('class', 'center')
                .call(d3.drag().on('start', rulerCenterDrag))
      })
    }

    function opisometerEdgeDrag() {
      const el = d3.select(this)
      const x0 = +el.attr('cx'), y0 = +el.attr('cy')
      const group = d3.select(this.parentNode)
      const curve = group.select('.white')
      const curveGray = group.select('.gray')
      const text = group.select('text')
      const points = JSON.parse(text.attr('data-points'))
      if (x0 === points[0].scX && y0 === points[0].scY) {points.reverse()}

      d3.event.on('drag', function() {
        const x = d3.event.x, y = d3.event.y
        el.attr('cx', x).attr('cy', y)
        const l = points[points.length - 1]
        const diff = Math.hypot(l.scX - x, l.scY - y)
        if (diff > 5) {points.push({scX: x, scY: y})} else {return}
        lineGen.curve(d3.curveBasis)
        const d = round(lineGen(points))
        curve.attr('d', d)
        curveGray.attr('d', d)
        const dist = Math.round(curve.node().getTotalLength())
        const label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
        text.attr('x', x).attr('y', y).text(label)
      })

      d3.event.on('end', function() {
        const dist = Math.round(curve.node().getTotalLength())
        const c = curve.node().getPointAtLength(dist / 2)
        const p = curve.node().getPointAtLength((dist / 2) - 1)
        const label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
        const atan = p.x > c.x ? Math.atan2(p.y - c.y, p.x - c.x) :
                     Math.atan2(c.y - p.y, c.x - p.x)
        const angle = Math.round(atan * 180 / Math.PI, 3)
        const tr = 'rotate(' + angle + ' ' + c.x + ' ' + c.y + ')'
        text.attr('data-points', JSON.stringify(points)).attr('data-dist', dist).attr('x', c.x)
            .attr('y', c.y).attr('transform', tr).text(label)
      })
    }

    function getContinuousLine(edges, indention, relax) {
      let line = ''
      if (edges.length < 3) return ''
      while (edges.length > 2) {
        let edgesOrdered = [] // to store points in a correct order
        let start = edges[0].start
        let end = edges[0].end
        edges.shift()
        let spl = start.split(' ')
        edgesOrdered.push({scX: +spl[0], scY: +spl[1]})
        spl = end.split(' ')
        edgesOrdered.push({scX: +spl[0], scY: +spl[1]})
        let x0 = +spl[0], y0 = +spl[1]
        for (let i = 0; end !== start && i < 100000; i++) {
          let next = null, index = null
          for (let e = 0; e < edges.length; e++) {
            const edge = edges[e]
            if (edge.start == end || edge.end == end) {
              next = edge
              end = next.start == end ? next.end : next.start
              index = e
              break
            }
          }
          if (!next) {
            console.error('Next edge is not found')
            return ''
          }
          spl = end.split(' ')
          if (indention || relax) {
            const dist = Math.hypot(+spl[0] - x0, +spl[1] - y0)
            if (dist >= indention && Math.random() > relax) {
              edgesOrdered.push({scX: +spl[0], scY: +spl[1]})
              x0 = +spl[0], y0 = +spl[1]
            }
          } else {
            edgesOrdered.push({scX: +spl[0], scY: +spl[1]})
          }
          edges.splice(index, 1)
          if (i === 100000 - 1) {
            console.error('Line not ended, limit reached')
            break
          }
        }
        line += lineGen(edgesOrdered)
      }
      return round(line, 1)
    }

    // temporary elevate lakes to min neighbors heights to correctly flux the water
    function elevateLakes() {
      console.time('elevateLakes')
      const lakes = $.grep(self.cells,
        function(e, d) {return self.heights[d] < 20 && !self.features[e.fn].border})
      lakes.sort(function(a, b) {return self.heights[b.index] - self.heights[a.index]})
      for (let i = 0; i < lakes.length; i++) {
        const hs = [], id = lakes[i].index
        self.cells[id].height = self.heights[id] // use height on object level
        lakes[i].neighbors.forEach(function(n) {
          const nHeight = self.cells[n].height || self.heights[n]
          if (nHeight >= 20) hs.push(nHeight)
        })
        if (hs.length) self.cells[id].height = d3.min(hs) - 1
        if (self.cells[id].height < 20) self.cells[id].height = 20
        lakes[i].lake = 1
      }
      console.timeEnd('elevateLakes')
    }

    // Depression filling algorithm (for a correct water flux modeling; phase1)
    function resolveDepressionsPrimary() {
      console.time('resolveDepressionsPrimary')
      self.land = $.grep(self.cells, function(e, d) {
        if (!e.height) e.height = self.heights[d] // use height on object level
        return e.height >= 20
      })
      self.land.sort(function(a, b) {return b.height - a.height})
      const limit = 10
      for (let l = 0, depression = 1; depression > 0 && l < limit; l++) {
        depression = 0
        for (let i = 0; i < self.land.length; i++) {
          const id = self.land[i].index
          if (self.land[i].type === 'border') continue
          const hs = self.land[i].neighbors.map(function(n) {return self.cells[n].height})
          const minHigh = d3.min(hs)
          if (self.cells[id].height <= minHigh) {
            depression++
            self.land[i].pit = self.land[i].pit ? self.land[i].pit + 1 : 1
            self.cells[id].height = minHigh + 2
          }
        }
        if (l === 0) console.log(' depressions init: ' + depression)
      }
      console.timeEnd('resolveDepressionsPrimary')
    }

    // Depression filling algorithm (for a correct water flux modeling; phase2)
    function resolveDepressionsSecondary() {
      console.time('resolveDepressionsSecondary')
      self.land = $.grep(self.cells, function(e) {return e.height >= 20})
      self.land.sort(function(a, b) {return b.height - a.height})
      const limit = 100
      for (let l = 0, depression = 1; depression > 0 && l < limit; l++) {
        depression = 0
        for (let i = 0; i < self.land.length; i++) {
          if (self.land[i].ctype === 99) continue
          const heights = self.land[i].neighbors.map(function(n) {return self.cells[n].height})
          const minHigh = d3.min(heights)
          if (self.land[i].height <= minHigh) {
            depression++
            self.land[i].pit = self.land[i].pit ? self.land[i].pit + 1 : 1
            self.land[i].height = Math.trunc(minHigh + 2)
          }
        }
        if (l === 0) console.log(' depressions reGraphed: ' + depression)
        if (l === limit - 1) console.error('Error: resolveDepressions iteration limit')
      }
      console.timeEnd('resolveDepressionsSecondary')
    }

    // restore initial heights if user don't want system to change heightmap
    function restoreCustomHeights() {
      self.land.forEach(function(l) {
        if (!l.pit) return
        l.height = Math.trunc(l.height - l.pit * 2)
        if (l.height < 20) l.height = 20
      })
    }

    function flux() {
      console.time('flux')
      self.riversData = []
      let riverNext = 0
      self.land.sort(function(a, b) {return b.height - a.height})
      for (let i = 0; i < self.land.length; i++) {
        const id = self.land[i].index
        const sx = self.land[i].data[0]
        const sy = self.land[i].data[1]
        let fn = self.land[i].fn
        if (self.land[i].ctype === 99) {
          if (self.land[i].river !== undefined) {
            let x, y
            const min = Math.min(sy, self.graphHeight - sy, sx, self.graphWidth - sx)
            if (min === sy) {
              x = sx
              y = 0
            }
            if (min === self.graphHeight - sy) {
              x = sx
              y = self.graphHeight
            }
            if (min === sx) {
              x = 0
              y = sy
            }
            if (min === self.graphWidth - sx) {
              x = self.graphWidth
              y = sy
            }
            self.riversData.push({river: self.land[i].river, cell: id, x, y})
          }
          continue
        }
        if (self.features[fn].river !== undefined) {
          if (self.land[i].river !== self.features[fn].river) {
            self.land[i].river = undefined
            self.land[i].flux = 0
          }
        }
        let minHeight = 1000, min
        self.land[i].neighbors.forEach(function(e) {
          if (self.cells[e].height < minHeight) {
            minHeight = self.cells[e].height
            min = e
          }
        })
        // Define river number
        if (min !== undefined && self.land[i].flux > 1) {
          if (self.land[i].river === undefined) {
            // State new River
            self.land[i].river = riverNext
            self.riversData.push({river: riverNext, cell: id, x: sx, y: sy})
            riverNext += 1
          }
          // Assing existing River to the downhill cell
          if (self.cells[min].river == undefined) {
            self.cells[min].river = self.land[i].river
          } else {
            const riverTo = self.cells[min].river
            const iRiver = $.grep(self.riversData, function(e) {
              return (e.river == self.land[i].river)
            })
            const minRiver = $.grep(self.riversData, function(e) {
              return (e.river == riverTo)
            })
            let iRiverL = iRiver.length
            let minRiverL = minRiver.length
            // re-assing river nunber if new part is greater
            if (iRiverL >= minRiverL) {
              self.cells[min].river = self.land[i].river
              iRiverL += 1
              minRiverL -= 1
            }
            // mark confluences
            if (self.cells[min].height >= 20 && iRiverL > 1 && minRiverL > 1) {
              if (!self.cells[min].confluence) {
                self.cells[min].confluence = minRiverL - 1
              } else {
                self.cells[min].confluence += minRiverL - 1
              }
            }
          }
        }
        if (self.cells[min].flux) self.cells[min].flux += self.land[i].flux
        if (self.land[i].river !== undefined) {
          const px = self.cells[min].data[0]
          const py = self.cells[min].data[1]
          if (self.cells[min].height < 20) {
            // pour water to the sea
            const x = (px + sx) / 2 + (px - sx) / 10
            const y = (py + sy) / 2 + (py - sy) / 10
            self.riversData.push({river: self.land[i].river, cell: id, x, y})
          } else {
            if (self.cells[min].lake === 1) {
              fn = self.cells[min].fn
              if (self.features[fn].river === undefined) self.features[fn].river = self.land[i].river
            }
            // add next River segment
            self.riversData.push({river: self.land[i].river, cell: min, x: px, y: py})
          }
        }
      }
      console.timeEnd('flux')
      drawRiverLines(riverNext)
    }

    function drawRiverLines(riverNext) {
      console.time('drawRiverLines')
      for (let i = 0; i < riverNext; i++) {
        const dataRiver = $.grep(self.riversData, function(e) {
          return e.river === i
        })
        if (dataRiver.length > 1) {
          const riverAmended = amendRiver(dataRiver, 1)
          const width = _.round(0.8 + Math.random() * 0.4, 1)
          const increment = _.round(0.8 + Math.random() * 0.4, 1)
          const d = drawRiver(riverAmended, width, increment)
          rivers.append('path').attr('d', d).attr('id', 'river' + i).attr('data-width', width)
                .attr('data-increment', increment)
        }
      }
      rivers.selectAll('path').on('click', editRiver)
      console.timeEnd('drawRiverLines')
    }

    // add more river points on 1/3 and 2/3 of length
    function amendRiver(dataRiver, rndFactor) {
      const riverAmended = []
      let side = 1
      for (let r = 0; r < dataRiver.length; r++) {
        const dX = dataRiver[r].x
        const dY = dataRiver[r].y
        const cell = dataRiver[r].cell
        const c = self.cells[cell].confluence || 0
        riverAmended.push([dX, dY, c])
        if (r + 1 < dataRiver.length) {
          const eX = dataRiver[r + 1].x
          const eY = dataRiver[r + 1].y
          const angle = Math.atan2(eY - dY, eX - dX)
          const serpentine = 1 / (r + 1)
          const meandr = serpentine + 0.3 + Math.random() * 0.3 * rndFactor
          if (Math.random() > 0.5) {
            side *= -1
          }
          const dist = Math.hypot(eX - dX, eY - dY)
          // if dist is big or river is small add 2 extra points
          if (dist > 8 || (dist > 4 && dataRiver.length < 6)) {
            let stX = (dX * 2 + eX) / 3
            let stY = (dY * 2 + eY) / 3
            let enX = (dX + eX * 2) / 3
            let enY = (dY + eY * 2) / 3
            stX += -Math.sin(angle) * meandr * side
            stY += Math.cos(angle) * meandr * side
            if (Math.random() > 0.8) {
              side *= -1
            }
            enX += Math.sin(angle) * meandr * side
            enY += -Math.cos(angle) * meandr * side
            riverAmended.push([stX, stY], [enX, enY])
            // if dist is medium or river is small add 1 extra point
          } else if (dist > 4 || dataRiver.length < 6) {
            let scX = (dX + eX) / 2
            let scY = (dY + eY) / 2
            scX += -Math.sin(angle) * meandr * side
            scY += Math.cos(angle) * meandr * side
            riverAmended.push([scX, scY])
          }
        }
      }
      return riverAmended
    }

    // draw river polygon using arrpoximation
    function drawRiver(points, width, increment) {
      lineGen.curve(d3.curveCatmullRom.alpha(0.1))
      let extraOffset = 0.03 // start offset to make river source visible
      width = width || 1 // river width modifier
      increment = increment || 1 // river bed widening modifier
      let riverLength = 0
      points.map(function(p, i) {
        if (i === 0) {return 0}
        riverLength += Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1])
      })
      const widening = Math.round((1000 + (riverLength * 30)) * increment)
      const riverPointsLeft = []
      const riverPointsRight = []
      const last = points.length - 1
      const factor = riverLength / points.length

      // first point
      let x = points[0][0], y = points[0][1], c
      let angle = Math.atan2(y - points[1][1], x - points[1][0])
      let xLeft = x + -Math.sin(angle) * extraOffset, yLeft = y + Math.cos(angle) * extraOffset
      riverPointsLeft.push({scX: xLeft, scY: yLeft})
      let xRight = x + Math.sin(angle) * extraOffset, yRight = y + -Math.cos(angle) * extraOffset
      riverPointsRight.unshift({scX: xRight, scY: yRight})

      // middle points
      for (let p = 1; p < last; p++) {
        x = points[p][0], y = points[p][1], c = points[p][2]
        if (c) {extraOffset += Math.atan(c * 10 / widening)} // confluence
        const xPrev = points[p - 1][0], yPrev = points[p - 1][1]
        const xNext = points[p + 1][0], yNext = points[p + 1][1]
        angle = Math.atan2(yPrev - yNext, xPrev - xNext)
        var offset = (Math.atan(Math.pow(p * factor, 2) / widening) / 2 * width) + extraOffset
        xLeft = x + -Math.sin(angle) * offset, yLeft = y + Math.cos(angle) * offset
        riverPointsLeft.push({scX: xLeft, scY: yLeft})
        xRight = x + Math.sin(angle) * offset, yRight = y + -Math.cos(angle) * offset
        riverPointsRight.unshift({scX: xRight, scY: yRight})
      }

      // end point
      x = points[last][0], y = points[last][1], c = points[last][2]
      if (c) {extraOffset += Math.atan(c * 10 / widening)} // confluence
      angle = Math.atan2(points[last - 1][1] - y, points[last - 1][0] - x)
      xLeft = x + -Math.sin(angle) * offset, yLeft = y + Math.cos(angle) * offset
      riverPointsLeft.push({scX: xLeft, scY: yLeft})
      xRight = x + Math.sin(angle) * offset, yRight = y + -Math.cos(angle) * offset
      riverPointsRight.unshift({scX: xRight, scY: yRight})

      // generate path and return
      const right = lineGen(riverPointsRight)
      let left = lineGen(riverPointsLeft)
      left = left.substring(left.indexOf('C'))
      return round(right + left, 2)
    }

    // draw river polygon with best quality
    function drawRiverSlow(points, width, increment) {
      lineGen.curve(d3.curveCatmullRom.alpha(0.1))
      width = width || 1
      const extraOffset = 0.02 * width
      increment = increment || 1
      const riverPoints = points.map(function(p) {
        return {scX: p[0], scY: p[1]}
      })
      const river = defs.append('path').attr('d', lineGen(riverPoints))
      const riverLength = river.node().getTotalLength()
      const widening = Math.round((1000 + (riverLength * 30)) * increment)
      const riverPointsLeft = []
      const riverPointsRight = []

      for (let l = 0; l < riverLength; l++) {
        var point = river.node().getPointAtLength(l)
        var from = river.node().getPointAtLength(l - 0.1)
        const to = river.node().getPointAtLength(l + 0.1)
        var angle = Math.atan2(from.y - to.y, from.x - to.x)
        var offset = (Math.atan(Math.pow(l, 2) / widening) / 2 * width) + extraOffset
        var xLeft = point.x + -Math.sin(angle) * offset
        var yLeft = point.y + Math.cos(angle) * offset
        riverPointsLeft.push({scX: xLeft, scY: yLeft})
        var xRight = point.x + Math.sin(angle) * offset
        var yRight = point.y + -Math.cos(angle) * offset
        riverPointsRight.unshift({scX: xRight, scY: yRight})
      }

      var point = river.node().getPointAtLength(riverLength)
      var from = river.node().getPointAtLength(riverLength - 0.1)
      var angle = Math.atan2(from.y - point.y, from.x - point.x)
      var offset = (Math.atan(Math.pow(riverLength, 2) / widening) / 2 * width) + extraOffset
      var xLeft = point.x + -Math.sin(angle) * offset
      var yLeft = point.y + Math.cos(angle) * offset
      riverPointsLeft.push({scX: xLeft, scY: yLeft})
      var xRight = point.x + Math.sin(angle) * offset
      var yRight = point.y + -Math.cos(angle) * offset
      riverPointsRight.unshift({scX: xRight, scY: yRight})

      river.remove()
      // generate path and return
      const right = lineGen(riverPointsRight)
      let left = lineGen(riverPointsLeft)
      left = left.substring(left.indexOf('C'))
      return round(right + left, 2)
    }

    // add lakes on depressed points on river course
    function addLakes() {
      console.time('addLakes')
      let smallLakes = 0
      for (let i = 0; i < self.land.length; i++) {
        // elavate all big lakes
        if (self.land[i].lake === 1) {
          self.land[i].height = 19
          self.land[i].ctype = -1
        }
        // define eligible small lakes
        if (self.land[i].lake === 2 && smallLakes < 100) {
          if (self.land[i].river !== undefined) {
            self.land[i].height = 19
            self.land[i].ctype = -1
            self.land[i].fn = -1
            smallLakes++
          } else {
            self.land[i].lake = undefined
            self.land[i].neighbors.forEach(function(n) {
              if (self.cells[n].lake !== 1 && self.cells[n].river !== undefined) {
                self.cells[n].lake = 2
                self.cells[n].height = 19
                self.cells[n].ctype = -1
                self.cells[n].fn = -1
                smallLakes++
              } else if (self.cells[n].lake === 2) {
                self.cells[n].lake = undefined
              }
            })
          }
        }
      }
      console.log('small lakes: ' + smallLakes)

      // mark small lakes
      let unmarked = $.grep(self.land, function(e) {return e.fn === -1})
      while (unmarked.length) {
        let fn = -1
        let queue = [unmarked[0].index]
        let lakeCells = []
        unmarked[0].session = 'addLakes'
        while (queue.length) {
          const q = queue.pop()
          lakeCells.push(q)
          if (self.cells[q].fn !== -1) fn = self.cells[q].fn
          self.cells[q].neighbors.forEach(function(e) {
            if (self.cells[e].lake && self.cells[e].session !== 'addLakes') {
              self.cells[e].session = 'addLakes'
              queue.push(e)
            }
          })
        }
        if (fn === -1) {
          fn = self.features.length
          self.features.push({i: fn, land: false, border: false})
        }
        lakeCells.forEach(function(c) {self.cells[c].fn = fn})
        unmarked = $.grep(self.land, function(e) {return e.fn === -1})
      }

      self.land = $.grep(self.cells, function(e) {return e.height >= 20})
      console.timeEnd('addLakes')
    }

    function editLabel() {
      if (self.customization) return

      unselect()
      closeDialogs('#labelEditor, .stable')
      self.elSelected =
        d3.select(this).call(d3.drag().on('start', elementDrag)).classed('draggable', true)

      // update group parameters
      let group = d3.select(this.parentNode)
      updateGroupOptions()
      labelGroupSelect.value = group.attr('id')
      labelFontSelect.value = FONTS.indexOf(group.attr('data-font'))
      labelSize.value = group.attr('data-size')
      labelColor.value = toHEX(group.attr('fill'))
      labelOpacity.value = group.attr('opacity')
      labelText.value = self.elSelected.text()
      const tr = parseTransform(self.elSelected.attr('transform'))
      labelAngle.value = tr[2]
      labelAngleValue.innerHTML = Math.abs(+tr[2]) + '°'

      $('#labelEditor').dialog({
        title: 'Edit Label: ' + labelText.value,
        minHeight: 30, width: 'auto', maxWidth: 275, resizable: false,
        position: {my: 'center top+10', at: 'bottom', of: this},
        close: unselect
      })

      if (self.modules.editLabel) return
      self.modules.editLabel = true

      loadDefaultFonts()

      function updateGroupOptions() {
        labelGroupSelect.innerHTML = ''
        labels.selectAll('g:not(#burgLabels)').each(function(d) {
          if (this.parentNode.id === 'burgLabels') return
          let id = d3.select(this).attr('id')
          let opt = document.createElement('option')
          opt.value = opt.innerHTML = id
          labelGroupSelect.add(opt)
        })
      }

      $('#labelGroupButton').click(function() {
        $('#labelEditor > button').not(this).toggle()
        $('#labelGroupButtons').toggle()
      })

      // on group change
      document.getElementById('labelGroupSelect').addEventListener('change', function() {
        document.getElementById(this.value).appendChild(self.elSelected.remove().node())
      })

      // toggle inputs to declare a new group
      document.getElementById('labelGroupNew').addEventListener('click', function() {
        if ($('#labelGroupInput').css('display') === 'none') {
          $('#labelGroupInput').css('display', 'inline-block')
          $('#labelGroupSelect').css('display', 'none')
          labelGroupInput.focus()
        } else {
          $('#labelGroupSelect').css('display', 'inline-block')
          $('#labelGroupInput').css('display', 'none')
        }
      })

      // toggle inputs to select a group
      document.getElementById('labelExternalFont').addEventListener('click', function() {
        if ($('#labelFontInput').css('display') === 'none') {
          $('#labelFontInput').css('display', 'inline-block')
          $('#labelFontSelect').css('display', 'none')
          labelFontInput.focus()
        } else {
          $('#labelFontSelect').css('display', 'inline-block')
          $('#labelFontInput').css('display', 'none')
        }
      })

      // on new group creation
      document.getElementById('labelGroupInput').addEventListener('change', function() {
        if (!this.value) {
          tip('Please provide a valid group name')
          return
        }
        let group = this.value.toLowerCase().replace(/ /g, '_').replace(/[^\w\s]/gi, '')
        if (Number.isFinite(+group.charAt(0))) group = 'g' + group
        // if el with this id exists, add size to id
        while (labels.selectAll('#' + group).size()) {group += '_new'}
        createNewLabelGroup(group)
      })

      function createNewLabelGroup(g) {
        let group = self.elSelected.node().parentNode.cloneNode(false)
        let groupNew = labels.append(f => group).attr('id', g)
        groupNew.append(f => self.elSelected.remove().node())
        updateGroupOptions()
        $('#labelGroupSelect, #labelGroupInput').toggle()
        labelGroupInput.value = ''
        labelGroupSelect.value = g
        updateLabelGroups()
      }

      // remove label group on click
      document.getElementById('labelGroupRemove').addEventListener('click', function() {
        let group = d3.select(self.elSelected.node().parentNode)
        let id = group.attr('id')
        let count = group.selectAll('text').size()
        // remove group with < 2 label without ask
        if (count < 2) {
          removeAllLabelsInGroup(id)
          $('#labelEditor').dialog('close')
          return
        }
        alertMessage.innerHTML =
          'Are you sure you want to remove all labels (' + count + ') of that group?'
        $('#alert').dialog({
          resizable: false, title: 'Remove label group',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              removeAllLabelsInGroup(id)
              $('#labelEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

      $('#labelTextButton').click(function() {
        $('#labelEditor > button').not(this).toggle()
        $('#labelTextButtons').toggle()
      })

      // on label text change
      document.getElementById('labelText').addEventListener('input', function() {
        if (!this.value) {
          tip(
            'Name should not be blank, set opacity to 0 to hide label or click remove button to delete')
          return
        }
        // change Label text
        if (self.elSelected.select('textPath').size()) self.elSelected.select('textPath').text(this.value)
        else self.elSelected.text(this.value)
        $('div[aria-describedby=\'labelEditor\'] .ui-dialog-title').text('Edit Label: ' + this.value)
        // check if label is a country name
        let id = self.elSelected.attr('id') || ''
        if (id.includes('regionLabel')) {
          let state = +self.elSelected.attr('id').slice(11)
          self.states[state].name = this.value
        }
      })

      // generate a random country name
      document.getElementById('labelTextRandom').addEventListener('click', function() {
        let name = self.elSelected.text()
        let id = self.elSelected.attr('id') || ''
        if (id.includes('regionLabel')) {
          // label is a country name
          let state = +self.elSelected.attr('id').slice(11)
          name = generateStateName(state.i)
          self.states[state].name = name
        } else {
          // label is not a country name, use random culture
          let c = self.elSelected.node().getBBox()
          let culture = Math.floor(Math.random() * self.cultures.length)
          name = generateName(culture)
        }
        labelText.value = name
        $('div[aria-describedby=\'labelEditor\'] .ui-dialog-title').text('Edit Label: ' + name)
        // change Label text
        if (self.elSelected.select('textPath').size()) self.elSelected.select('textPath').text(name)
        else self.elSelected.text(name)
      })

      $('#labelFontButton').click(function() {
        $('#labelEditor > button').not(this).toggle()
        $('#labelFontButtons').toggle()
      })

      // on label font change
      document.getElementById('labelFontSelect').addEventListener('change', function() {
        let group = self.elSelected.node().parentNode
        let font = FONTS[this.value].split(':')[0].replace(/\+/g, ' ')
        group.setAttribute('font-family', font)
        group.setAttribute('data-font', FONTS[this.value])
      })

      // on adding custom font
      document.getElementById('labelFontInput').addEventListener('change', function() {
        fetchFonts(this.value).then(fetched => {
          if (!fetched) return
          labelExternalFont.click()
          labelFontInput.value = ''
          if (fetched === 1) $('#labelFontSelect').val(FONTS.length - 1).change()
        })
      })

      // on label size input
      document.getElementById('labelSize').addEventListener('input', function() {
        let group = self.elSelected.node().parentNode
        let size = +this.value
        group.setAttribute('data-size', size)
        group.setAttribute('font-size', _.round((size + (size / scale)) / 2, 2))
      })

      $('#labelStyleButton').click(function() {
        $('#labelEditor > button').not(this).toggle()
        $('#labelStyleButtons').toggle()
      })

      // on label fill color input
      document.getElementById('labelColor').addEventListener('input', function() {
        let group = self.elSelected.node().parentNode
        group.setAttribute('fill', this.value)
      })

      // on label opacity input
      document.getElementById('labelOpacity').addEventListener('input', function() {
        let group = self.elSelected.node().parentNode
        group.setAttribute('opacity', this.value)
      })

      $('#labelAngleButton').click(function() {
        $('#labelEditor > button').not(this).toggle()
        $('#labelAngleButtons').toggle()
      })

      // on label angle input
      document.getElementById('labelAngle').addEventListener('input', function() {
        const tr = parseTransform(self.elSelected.attr('transform'))
        labelAngleValue.innerHTML = Math.abs(+this.value) + '°'
        const c = self.elSelected.node().getBBox()
        const angle = +this.value
        const transform = `translate(${tr[0]},${tr[1]}) rotate(${angle} ${(c.x + c.width / 2)} ${(c.y + c.height / 2)})`
        self.elSelected.attr('transform', transform)
      })

      // display control points to curve label (place on path)
      document.getElementById('labelCurve').addEventListener('click', function() {
        let c = self.elSelected.node().getBBox()
        let cx = c.x + c.width / 2, cy = c.y + c.height / 2

        if (!self.elSelected.select('textPath').size()) {
          let id = self.elSelected.attr('id')
          let pathId = '#textPath_' + id
          let path = `M${cx - c.width},${cy} q${c.width},0 ${c.width * 2},0`
          let text = self.elSelected.text(), x = self.elSelected.attr('x'), y = self.elSelected.attr('y')
          self.elSelected.text(null).attr('data-x', x).attr('data-y', y).attr('x', null).attr('y', null)
          defs.append('path').attr('id', 'textPath_' + id).attr('d', path)
          self.elSelected.append('textPath').attr('href', pathId).attr('startOffset', '50%').text(text)
        }

        if (!debug.select('circle').size()) {
          debug.append('circle').attr('id', 'textPathControl').attr('r', 1.6)
               .attr('cx', cx).attr('cy', cy)
               .attr('transform', self.elSelected.attr('transform') || null)
               .call(d3.drag().on('start', textPathControlDrag))
        }
      })

      // drag textPath controle point to curve the label
      function textPathControlDrag() {
        let textPath = defs.select('#textPath_' + self.elSelected.attr('id'))
        let path = textPath.attr('d').split(' ')
        let M = path[0].split(',')
        let q = path[1].split(',') // +q[1] to get qy - the only changeble value
        let y = d3.event.y

        d3.event.on('drag', function() {
          let dy = d3.event.y - y
          let total = +q[1] + dy * 8
          d3.select(this).attr('cy', d3.event.y)
          textPath.attr('d', `${M[0]},${+M[1] - dy} ${q[0]},${total} ${path[2]}`)
        })
      }

      // cancel label curvature
      document.getElementById('labelCurveCancel').addEventListener('click', function() {
        if (!self.elSelected.select('textPath').size()) return
        let text = self.elSelected.text(), x = self.elSelected.attr('data-x'), y = self.elSelected.attr('data-y')
        self.elSelected.text()
        self.elSelected.attr('x', x).attr('y', y).attr('data-x', null).attr('data-y', null).text(text)
        defs.select('#textPath_' + self.elSelected.attr('id')).remove()
        debug.select('circle').remove()
      })

      // open legendsEditor
      document.getElementById('labelLegend').addEventListener('click', function() {
        let id = self.elSelected.attr('id')
        let name = self.elSelected.text()
        editLegends(id, name)
      })

      // copy label on click
      document.getElementById('labelCopy').addEventListener('click', function() {
        let group = d3.select(self.elSelected.node().parentNode)
        copy = group.append(f => self.elSelected.node().cloneNode(true))
        let id = 'label' + Date.now().toString().slice(7)
        copy.attr('id', id).attr('class', null).on('click', editLabel)
        let shift = +group.attr('font-size') + 1
        if (copy.select('textPath').size()) {
          let path = defs.select('#textPath_' + self.elSelected.attr('id')).attr('d')
          let textPath = defs.append('path').attr('id', 'textPath_' + id)
          copy.select('textPath').attr('href', '#textPath_' + id)
          let pathArray = path.split(' ')
          let x = +pathArray[0].split(',')[0].slice(1)
          let y = +pathArray[0].split(',')[1]
          textPath.attr('d', `M${x - shift},${y - shift} ${pathArray[1]} ${pathArray[2]}`)
          shift
        } else {
          let x = +self.elSelected.attr('x') - shift
          let y = +self.elSelected.attr('y') - shift
          while (group.selectAll('text[x=\'' + x + '\']').size()) {
            x -= shift
            y -= shift
          }
          copy.attr('x', x).attr('y', y)
        }
      })

      // remove label on click
      document.getElementById('labelRemoveSingle').addEventListener('click', function() {
        alertMessage.innerHTML = 'Are you sure you want to remove the label?'
        $('#alert').dialog({
          resizable: false, title: 'Remove label',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              self.elSelected.remove()
              defs.select('#textPath_' + self.elSelected.attr('id')).remove()
              $('#labelEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    function editRiver() {
      if (self.customization) return
      if (self.elSelected) {
        const self = d3.select(this).attr('id') === self.elSelected.attr('id')
        const point = d3.mouse(this)
        if (self.elSelected.attr('data-river') === 'new') {
          addRiverPoint([point[0], point[1]])
          completeNewRiver()
          return
        } else if (self) {
          riverAddControlPoint(point)
          return
        }
      }

      unselect()
      closeDialogs('#riverEditor, .stable')
      self.elSelected = d3.select(this)
      self.elSelected.call(d3.drag().on('start', riverDrag))

      const tr = parseTransform(self.elSelected.attr('transform'))
      riverAngle.value = tr[2]
      riverAngleValue.innerHTML = Math.abs(+tr[2]) + '°'
      riverScale.value = tr[5]
      riverWidthInput.value = +self.elSelected.attr('data-width')
      riverIncrement.value = +self.elSelected.attr('data-increment')

      $('#riverEditor').dialog({
        title: 'Edit River',
        minHeight: 30, width: 'auto', resizable: false,
        position: {my: 'center top+20', at: 'top', of: d3.event},
        close: function() {
          if ($('#riverNew').hasClass('pressed')) completeNewRiver()
          unselect()
        }
      })

      if (!debug.select('.controlPoints').size()) debug.append('g').attr('class', 'controlPoints')
      riverDrawPoints()

      if (self.modules.editRiver) {return}
      self.modules.editRiver = true

      function riverAddControlPoint(point) {
        let dists = []
        debug.select('.controlPoints').selectAll('circle').each(function() {
          const x = +d3.select(this).attr('cx')
          const y = +d3.select(this).attr('cy')
          dists.push(Math.hypot(point[0] - x, point[1] - y))
        })
        let index = dists.length
        if (dists.length > 1) {
          const sorted = dists.slice(0).sort(function(a, b) {return a - b})
          const closest = dists.indexOf(sorted[0])
          const next = dists.indexOf(sorted[1])
          if (closest <= next) {index = closest + 1} else {index = next + 1}
        }
        const before = ':nth-child(' + (index + 1) + ')'
        debug.select('.controlPoints').insert('circle', before)
             .attr('cx', point[0]).attr('cy', point[1]).attr('r', 0.35)
             .call(d3.drag().on('drag', riverPointDrag))
             .on('click', function(d) {
               $(this).remove()
               redrawRiver()
             })
        redrawRiver()
      }

      function riverDrawPoints() {
        const node = self.elSelected.node()
        // river is a polygon, so divide length by 2 to get course length
        const l = node.getTotalLength() / 2
        const parts = (l / 5) >> 0 // number of points
        let inc = l / parts // increment
        if (inc === Infinity) {inc = l} // 2 control points for short rivers
        // draw control points
        for (let i = l, c = l; i > 0; i -= inc, c += inc) {
          const p1 = node.getPointAtLength(i)
          const p2 = node.getPointAtLength(c)
          const p = [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2]
          addRiverPoint(p)
        }
        // last point should be accurate
        const lp1 = node.getPointAtLength(0)
        const lp2 = node.getPointAtLength(l * 2)
        const p = [(lp1.x + lp2.x) / 2, (lp1.y + lp2.y) / 2]
        addRiverPoint(p)
      }

      function addRiverPoint(point) {
        debug.select('.controlPoints').append('circle')
             .attr('cx', point[0]).attr('cy', point[1]).attr('r', 0.35)
             .call(d3.drag().on('drag', riverPointDrag))
             .on('click', function(d) {
               $(this).remove()
               redrawRiver()
             })
      }

      function riverPointDrag() {
        d3.select(this).attr('cx', d3.event.x).attr('cy', d3.event.y)
        redrawRiver()
      }

      function riverDrag() {
        const x = d3.event.x, y = d3.event.y
        const tr = parseTransform(self.elSelected.attr('transform'))
        d3.event.on('drag', function() {
          let xc = d3.event.x, yc = d3.event.y
          let transform = `translate(${(+tr[0] + xc - x)},${(+tr[1] + yc - y)}) rotate(${tr[2]} ${tr[3]} ${tr[4]}) scale(${tr[5]})`
          self.elSelected.attr('transform', transform)
          debug.select('.controlPoints').attr('transform', transform)
        })
      }

      function redrawRiver() {
        let points = []
        debug.select('.controlPoints').selectAll('circle').each(function() {
          const el = d3.select(this)
          points.push([+el.attr('cx'), +el.attr('cy')])
        })
        const width = +riverWidthInput.value
        const increment = +riverIncrement.value
        const d = drawRiverSlow(points, width, increment)
        self.elSelected.attr('d', d)
      }

      $('#riverWidthInput, #riverIncrement').change(function() {
        const width = +riverWidthInput.value
        const increment = +riverIncrement.value
        self.elSelected.attr('data-width', width).attr('data-increment', increment)
        redrawRiver()
      })

      $('#riverRegenerate').click(function() {
        let points = []
        let amended = []
        let x
        let y
        let p1
        let p2
        const node = self.elSelected.node()
        const l = node.getTotalLength() / 2
        const parts = (l / 8) >> 0 // number of points
        let inc = l / parts // increment
        if (inc === Infinity) {inc = l} // 2 control points for short rivers
        for (let i = l, e = l; i > 0; i -= inc, e += inc) {
          p1 = node.getPointAtLength(i)
          p2 = node.getPointAtLength(e)
          x = (p1.x + p2.x) / 2, y = (p1.y + p2.y) / 2
          points.push([x, y])
        }
        // last point should be accurate
        p1 = node.getPointAtLength(0)
        p2 = node.getPointAtLength(l * 2)
        x = (p1.x + p2.x) / 2, y = (p1.y + p2.y) / 2
        points.push([x, y])
        // amend points
        const rndFactor = 0.3 + Math.random() * 1.4 // random factor in range 0.2-1.8
        for (let i = 0; i < points.length; i++) {
          x = points[i][0], y = points[i][1]
          amended.push([x, y])
          // add additional semi-random point
          if (i + 1 < points.length) {
            const x2 = points[i + 1][0], y2 = points[i + 1][1]
            let side = Math.random() > 0.5 ? 1 : -1
            const angle = Math.atan2(y2 - y, x2 - x)
            const serpentine = 2 / (i + 1)
            const meandr = serpentine + 0.3 + Math.random() * rndFactor
            x = (x + x2) / 2, y = (y + y2) / 2
            x += -Math.sin(angle) * meandr * side
            y += Math.cos(angle) * meandr * side
            amended.push([x, y])
          }
        }
        const width = +riverWidthInput.value * 0.6 + Math.random()
        const increment = +riverIncrement.value * 0.9 + Math.random() * 0.2
        riverWidthInput.value = width
        riverIncrement.value = increment
        self.elSelected.attr('data-width', width).attr('data-increment', increment)
        const d = drawRiverSlow(amended, width, increment)
        self.elSelected.attr('d', d).attr('data-width', width).attr('data-increment', increment)
        debug.select('.controlPoints').selectAll('*').remove()
        amended.map(function(p) {addRiverPoint(p)})
      })

      $('#riverAngle').on('input', function() {
        const tr = parseTransform(self.elSelected.attr('transform'))
        riverAngleValue.innerHTML = Math.abs(+this.value) + '°'
        const c = self.elSelected.node().getBBox()
        const angle = +this.value, scale = +tr[5]
        const transform = `translate(${tr[0]},${tr[1]}) rotate(${angle} ${(c.x + c.width / 2) * scale} ${(c.y + c.height / 2) * scale}) scale(${scale})`
        self.elSelected.attr('transform', transform)
        debug.select('.controlPoints').attr('transform', transform)
      })

      $('#riverReset').click(function() {
        self.elSelected.attr('transform', '')
        debug.select('.controlPoints').attr('transform', '')
        riverAngle.value = 0
        riverAngleValue.innerHTML = '0°'
        riverScale.value = 1
      })

      $('#riverScale').change(function() {
        const tr = parseTransform(self.elSelected.attr('transform'))
        const scaleOld = +tr[5], scale = +this.value
        const c = self.elSelected.node().getBBox()
        const cx = c.x + c.width / 2, cy = c.y + c.height / 2
        const trX = +tr[0] + cx * (scaleOld - scale)
        const trY = +tr[1] + cy * (scaleOld - scale)
        const scX = +tr[3] * scale / scaleOld
        const scY = +tr[4] * scale / scaleOld
        const transform = `translate(${trX},${trY}) rotate(${tr[2]} ${scX} ${scY}) scale(${scale})`
        self.elSelected.attr('transform', transform)
        debug.select('.controlPoints').attr('transform', transform)
      })

      $('#riverNew').click(function() {
        if ($(this).hasClass('pressed')) {
          completeNewRiver()
        } else {
          // enter creation mode
          $('.pressed').removeClass('pressed')
          $(this).addClass('pressed')
          if (self.elSelected) self.elSelected.call(d3.drag().on('drag', null))
          debug.select('.controlPoints').selectAll('*').remove()
          viewbox.style('cursor', 'crosshair').on('click', newRiverAddPoint)
        }
      })

      function newRiverAddPoint() {
        const point = d3.mouse(this)
        addRiverPoint([point[0], point[1]])
        if (!self.elSelected || self.elSelected.attr('data-river') !== 'new') {
          const id = +$('#rivers > path').last().attr('id').slice(5) + 1
          self.elSelected = rivers.append('path').attr('data-river', 'new').attr('id', 'river' + id)
                             .attr('data-width', 2).attr('data-increment', 1)
                             .on('click', completeNewRiver)
        } else {
          redrawRiver()
          let cell = self.diagram.find(point[0], point[1]).index
          let f = self.cells[cell].fn
          let ocean = !self.features[f].land && self.features[f].border
          if (ocean && debug.select('.controlPoints').selectAll('circle')
                            .size() > 5) completeNewRiver()
        }
      }

      function completeNewRiver() {
        $('#riverNew').removeClass('pressed')
        restoreDefaultEvents()
        if (!self.elSelected || self.elSelected.attr('data-river') !== 'new') return
        redrawRiver()
        self.elSelected.attr('data-river', '')
        self.elSelected.call(d3.drag().on('start', riverDrag)).on('click', editRiver)
        const r = +self.elSelected.attr('id').slice(5)
        debug.select('.controlPoints').selectAll('circle').each(function() {
          const x = +d3.select(this).attr('cx')
          const y = +d3.select(this).attr('cy')
          const cell = self.diagram.find(x, y, 3)
          if (!cell) return
          if (self.cells[cell.index].river === undefined) self.cells[cell.index].river = r
        })
        unselect()
        debug.append('g').attr('class', 'controlPoints')
      }

      $('#riverCopy').click(function() {
        const tr = parseTransform(self.elSelected.attr('transform'))
        const d = self.elSelected.attr('d')
        let x = 2, y = 2
        let transform = `translate(${tr[0] - x},${tr[1] - y}) rotate(${tr[2]} ${tr[3]} ${tr[4]}) scale(${tr[5]})`
        while (rivers.selectAll('[transform=\'' + transform + '\'][d=\'' + d + '\']').size() > 0) {
          x += 2
          y += 2
          transform =
            `translate(${tr[0] - x},${tr[1] - y}) rotate(${tr[2]} ${tr[3]} ${tr[4]}) scale(${tr[5]})`
        }
        const river = +$('#rivers > path').last().attr('id').slice(5) + 1
        rivers.append('path').attr('d', d)
              .attr('transform', transform)
              .attr('id', 'river' + river).on('click', editRiver)
              .attr('data-width', self.elSelected.attr('data-width'))
              .attr('data-increment', self.elSelected.attr('data-increment'))
        unselect()
      })

      // open legendsEditor
      document.getElementById('riverLegend').addEventListener('click', function() {
        let id = self.elSelected.attr('id')
        editLegends(id, id)
      })

      $('#riverRemove').click(function() {
        alertMessage.innerHTML = `Are you sure you want to remove the river?`
        $('#alert').dialog({
          resizable: false, title: 'Remove river',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              const river = +self.elSelected.attr('id').slice(5)
              const avPrec = _.round(precInput.value / Math.sqrt(self.cells.length), 2)
              self.land.map(function(l) {
                if (l.river === river) {
                  l.river = undefined
                  l.flux = avPrec
                }
              })
              self.elSelected.remove()
              unselect()
              $('#riverEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

    }

    function editRoute() {
      if (self.customization) {return}
      if (self.elSelected) {
        const self = d3.select(this).attr('id') === self.elSelected.attr('id')
        const point = d3.mouse(this)
        if (self.elSelected.attr('data-route') === 'new') {
          addRoutePoint({x: point[0], y: point[1]})
          completeNewRoute()
          return
        } else if (self) {
          routeAddControlPoint(point)
          return
        }
      }

      unselect()
      closeDialogs('#routeEditor, .stable')

      if (this && this !== window) {
        self.elSelected = d3.select(this)
        if (!debug.select('.controlPoints').size()) debug.append('g')
                                                         .attr('class', 'controlPoints')
        routeDrawPoints()
        routeUpdateGroups()
        let routeType = d3.select(this.parentNode).attr('id')
        routeGroup.value = routeType

        $('#routeEditor').dialog({
          title: 'Edit Route',
          minHeight: 30, width: 'auto', resizable: false,
          position: {my: 'center top+20', at: 'top', of: d3.event},
          close: function() {
            if ($('#addRoute').hasClass('pressed')) completeNewRoute()
            if ($('#routeSplit').hasClass('pressed')) $('#routeSplit').removeClass('pressed')
            unselect()
          }
        })
      } else {self.elSelected = null}

      if (self.modules.editRoute) {return}
      self.modules.editRoute = true

      function routeAddControlPoint(point) {
        let dists = []
        debug.select('.controlPoints').selectAll('circle').each(function() {
          const x = +d3.select(this).attr('cx')
          const y = +d3.select(this).attr('cy')
          dists.push(Math.hypot(point[0] - x, point[1] - y))
        })
        let index = dists.length
        if (dists.length > 1) {
          const sorted = dists.slice(0).sort(function(a, b) {return a - b})
          const closest = dists.indexOf(sorted[0])
          const next = dists.indexOf(sorted[1])
          if (closest <= next) {index = closest + 1} else {index = next + 1}
        }
        const before = ':nth-child(' + (index + 1) + ')'
        debug.select('.controlPoints').insert('circle', before)
             .attr('cx', point[0]).attr('cy', point[1]).attr('r', 0.35)
             .call(d3.drag().on('drag', routePointDrag))
             .on('click', function(d) {
               $(this).remove()
               routeRedraw()
             })
        routeRedraw()
      }

      function routeDrawPoints() {
        if (!self.elSelected.size()) return
        const node = self.elSelected.node()
        const l = node.getTotalLength()
        const parts = (l / 5) >> 0 // number of points
        let inc = l / parts // increment
        if (inc === Infinity) inc = l // 2 control points for short routes
        // draw control points
        for (let i = 0; i <= l; i += inc) {
          const p = node.getPointAtLength(i)
          addRoutePoint(p)
        }
        // convert length to distance
        routeLength.innerHTML = Math.round(l * distanceScale.value) + ' ' + distanceUnit.value
      }

      function addRoutePoint(point) {
        const controlPoints = debug.select('.controlPoints').size()
                              ? debug.select('.controlPoints')
                              : debug.append('g').attr('class', 'controlPoints')
        controlPoints.append('circle')
                     .attr('cx', point.x).attr('cy', point.y).attr('r', 0.35)
                     .call(d3.drag().on('drag', routePointDrag))
                     .on('click', function(d) {
                       if ($('#routeSplit').hasClass('pressed')) {
                         routeSplitInPoint(this)
                       } else {
                         $(this).remove()
                         routeRedraw()
                       }
                     })
      }

      function routePointDrag() {
        d3.select(this).attr('cx', d3.event.x).attr('cy', d3.event.y)
        routeRedraw()
      }

      function routeRedraw() {
        let points = []
        debug.select('.controlPoints').selectAll('circle').each(function() {
          const el = d3.select(this)
          points.push({scX: +el.attr('cx'), scY: +el.attr('cy')})
        })
        lineGen.curve(d3.curveCatmullRom.alpha(0.1))
        self.elSelected.attr('d', lineGen(points))
        // get route distance
        const l = self.elSelected.node().getTotalLength()
        routeLength.innerHTML = Math.round(l * distanceScale.value) + ' ' + distanceUnit.value
      }

      function addNewRoute() {
        let routeType = self.elSelected && self.elSelected.node() ? self.elSelected.node().parentNode.id :
                        'searoutes'
        const group = routes.select('#' + routeType)
        const id = routeType + '' + group.selectAll('*').size()
        self.elSelected =
          group.append('path').attr('data-route', 'new').attr('id', id).on('click', editRoute)
        routeUpdateGroups()
        $('#routeEditor').dialog({
          title: 'Edit Route', minHeight: 30, width: 'auto', resizable: false,
          close: function() {
            if ($('#addRoute').hasClass('pressed')) completeNewRoute()
            if ($('#routeSplit').hasClass('pressed')) $('#routeSplit').removeClass('pressed')
            unselect()
          }
        })
      }

      function newRouteAddPoint() {
        const point = d3.mouse(this)
        const x = _.round(point[0], 2), y = _.round(point[1], 2)
        addRoutePoint({x, y})
        routeRedraw()
      }

      function completeNewRoute() {
        $('#routeNew, #addRoute').removeClass('pressed')
        restoreDefaultEvents()
        if (!self.elSelected.size()) return
        if (self.elSelected.attr('data-route') === 'new') {
          routeRedraw()
          self.elSelected.attr('data-route', '')
          const node = self.elSelected.node()
          const l = node.getTotalLength()
          let pathCells = []
          for (let i = 0; i <= l; i++) {
            const p = node.getPointAtLength(i)
            const cell = self.diagram.find(p.x, p.y)
            if (!cell) {return}
            pathCells.push(cell.index)
          }
          const uniqueCells = [...new Set(pathCells)]
          uniqueCells.map(function(c) {
            if (self.cells[c].path !== undefined) {self.cells[c].path += 1} else {self.cells[c].path = 1}
          })
        }
        tip('', true)
      }

      function routeUpdateGroups() {
        routeGroup.innerHTML = ''
        routes.selectAll('g').each(function() {
          const opt = document.createElement('option')
          opt.value = opt.innerHTML = this.id
          routeGroup.add(opt)
        })
      }

      function routeSplitInPoint(clicked) {
        const group = d3.select(self.elSelected.node().parentNode)
        $('#routeSplit').removeClass('pressed')
        const points1 = []
        const points2 = []
        let points = points1
        debug.select('.controlPoints').selectAll('circle').each(function() {
          const el = d3.select(this)
          points.push({scX: +el.attr('cx'), scY: +el.attr('cy')})
          if (this === clicked) {
            points = points2
            points.push({scX: +el.attr('cx'), scY: +el.attr('cy')})
          }
          el.remove()
        })
        lineGen.curve(d3.curveCatmullRom.alpha(0.1))
        self.elSelected.attr('d', lineGen(points1))
        const id = routeGroup.value + '' + group.selectAll('*').size()
        group.append('path').attr('id', id).attr('d', lineGen(points2)).on('click', editRoute)
        routeDrawpoints()
      }

      $('#routeGroup').change(function() {
        $(self.elSelected.node()).detach().appendTo($('#' + this.value))
      })

      // open legendsEditor
      document.getElementById('routeLegend').addEventListener('click', function() {
        let id = self.elSelected.attr('id')
        editLegends(id, id)
      })

      $('#routeNew').click(function() {
        if ($(this).hasClass('pressed')) {
          completeNewRoute()
        } else {
          // enter creation mode
          $('.pressed').removeClass('pressed')
          $('#routeNew, #addRoute').addClass('pressed')
          debug.select('.controlPoints').selectAll('*').remove()
          addNewRoute()
          viewbox.style('cursor', 'crosshair').on('click', newRouteAddPoint)
          tip('Click on map to add route point', true)
        }
      })

      $('#routeRemove').click(function() {
        alertMessage.innerHTML = `Are you sure you want to remove the route?`
        $('#alert').dialog({
          resizable: false, title: 'Remove route',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              self.elSelected.remove()
              $('#routeEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    function editIcon() {
      if (self.customization) return
      if (self.elSelected) if (this.isSameNode(self.elSelected.node())) return

      unselect()
      closeDialogs('#iconEditor, .stable')
      self.elSelected =
        d3.select(this).call(d3.drag().on('start', elementDrag)).classed('draggable', true)

      // update group parameters
      const group = d3.select(this.parentNode)
      iconUpdateGroups()
      iconGroup.value = group.attr('id')
      iconFillColor.value = group.attr('fill')
      iconStrokeColor.value = group.attr('stroke')
      iconSize.value = group.attr('size')
      iconStrokeWidth.value = group.attr('stroke-width')

      $('#iconEditor').dialog({
        title: 'Edit icon: ' + group.attr('id'),
        minHeight: 30, width: 'auto', resizable: false,
        position: {my: 'center top+20', at: 'top', of: d3.event},
        close: unselect
      })

      if (self.modules.editIcon) {return}
      self.modules.editIcon = true

      $('#iconGroups').click(function() {
        $('#iconEditor > button').not(this).toggle()
        $('#iconGroupsSelection').toggle()
      })

      function iconUpdateGroups() {
        iconGroup.innerHTML = ''
        const anchor = group.attr('id').includes('anchor')
        icons.selectAll('g').each(function(d) {
          const id = d3.select(this).attr('id')
          if (id === 'burgs') return
          if (!anchor && id.includes('anchor')) return
          if (anchor && !id.includes('anchor')) return
          const opt = document.createElement('option')
          opt.value = opt.innerHTML = id
          iconGroup.add(opt)
        })
      }

      $('#iconGroup').change(function() {
        const newGroup = this.value
        const to = $('#icons > #' + newGroup)
        $(self.elSelected.node()).detach().appendTo(to)
      })

      $('#iconCopy').click(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        const copy = self.elSelected.node().cloneNode()
        copy.removeAttribute('data-id') // remove assignment to burg if any
        const tr = parseTransform(copy.getAttribute('transform'))
        const shift = 10 / Math.sqrt(scale)
        let transform = 'translate(' + _.round(tr[0] - shift, 1) + ',' + _.round(tr[1] - shift, 1) + ')'
        for (let i = 2; group.selectAll("[transform='" + transform + "']").size() > 0; i++) {
          transform =
            'translate(' + _.round(tr[0] - shift * i, 1) + ',' + _.round(tr[1] - shift * i, 1) + ')'
        }
        copy.setAttribute('transform', transform)
        group.node().insertBefore(copy, null)
        copy.addEventListener('click', editIcon)
      })

      $('#iconRemoveGroup').click(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        const count = group.selectAll('*').size()
        if (count < 2) {
          group.remove()
          $('#labelEditor').dialog('close')
          return
        }
        const message = 'Are you sure you want to remove all \'' + iconGroup.value + '\' icons (' + count + ')?'
        alertMessage.innerHTML = message
        $('#alert').dialog({
          resizable: false, title: 'Remove icon group',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              group.remove()
              $('#iconEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

      $('#iconColors').click(function() {
        $('#iconEditor > button').not(this).toggle()
        $('#iconColorsSection').toggle()
      })

      $('#iconFillColor').change(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        group.attr('fill', this.value)
      })

      $('#iconStrokeColor').change(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        group.attr('stroke', this.value)
      })

      $('#iconSetSize').click(function() {
        $('#iconEditor > button').not(this).toggle()
        $('#iconSizeSection').toggle()
      })

      $('#iconSize').change(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        const size = +this.value
        group.attr('size', size)
        group.selectAll('*')
             .each(function() {d3.select(this).attr('width', size).attr('height', size)})
      })

      $('#iconStrokeWidth').change(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        group.attr('stroke-width', this.value)
      })

      $('#iconRemove').click(function() {
        alertMessage.innerHTML = `Are you sure you want to remove the icon?`
        $('#alert').dialog({
          resizable: false, title: 'Remove icon',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              self.elSelected.remove()
              $('#iconEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    function editReliefIcon() {
      if (self.customization) return
      if (self.elSelected) if (this.isSameNode(self.elSelected.node())) return

      unselect()
      closeDialogs('#reliefEditor, .stable')
      self.elSelected =
        d3.select(this).raise().call(d3.drag().on('start', elementDrag)).classed('draggable', true)
      const group = self.elSelected.node().parentNode.id
      reliefGroup.value = group

      let bulkRemoveSection = document.getElementById('reliefBulkRemoveSection')
      if (bulkRemoveSection.style.display != 'none') reliefBulkRemove.click()

      $('#reliefEditor').dialog({
        title: 'Edit relief icon',
        minHeight: 30, width: 'auto', resizable: false,
        position: {my: 'center top+40', at: 'top', of: d3.event},
        close: unselect
      })

      if (self.modules.editReliefIcon) {return}
      self.modules.editReliefIcon = true

      $('#reliefGroups').click(function() {
        $('#reliefEditor > button').not(this).toggle()
        $('#reliefGroupsSelection').toggle()
      })

      $('#reliefGroup').change(function() {
        const type = this.value
        const bbox = self.elSelected.node().getBBox()
        const cx = bbox.x
        const cy = bbox.y + bbox.height / 2
        const cell = self.diagram.find(cx, cy).index
        const height = cell !== undefined ? self.cells[cell].height : 50
        self.elSelected.remove()
        self.elSelected = addReliefIcon(height / 100, type, cx, cy, cell)
        self.elSelected.call(d3.drag().on('start', elementDrag))
      })

      $('#reliefCopy').click(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        const copy = self.elSelected.node().cloneNode(true)
        const tr = parseTransform(copy.getAttribute('transform'))
        const shift = 10 / Math.sqrt(scale)
        let transform = 'translate(' + _.round(tr[0] - shift, 1) + ',' + _.round(tr[1] - shift, 1) + ')'
        for (let i = 2; group.selectAll("[transform='" + transform + "']").size() > 0; i++) {
          transform =
            'translate(' + _.round(tr[0] - shift * i, 1) + ',' + _.round(tr[1] - shift * i, 1) + ')'
        }
        copy.setAttribute('transform', transform)
        group.node().insertBefore(copy, null)
        copy.addEventListener('click', editReliefIcon)
      })

      $('#reliefAddfromEditor').click(function() {
        clickToAdd() // to load on click event function
        $('#addRelief').click()
      })

      $('#reliefRemoveGroup').click(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        const count = group.selectAll('*').size()
        if (count < 2) {
          group.selectAll('*').remove()
          $('#labelEditor').dialog('close')
          return
        }
        const message = 'Are you sure you want to remove all \'' + reliefGroup.value + '\' icons (' + count + ')?'
        alertMessage.innerHTML = message
        $('#alert').dialog({
          resizable: false, title: 'Remove all icons within group',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              group.selectAll('*').remove()
              $('#reliefEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

      $('#reliefBulkRemove').click(function() {
        $('#reliefEditor > button').not(this).toggle()
        let section = document.getElementById('reliefBulkRemoveSection')
        if (section.style.display === 'none') {
          section.style.display = 'inline-block'
          tip('Drag to remove relief icons in radius', true)
          viewbox.style('cursor', 'crosshair').call(d3.drag().on('drag', dragToRemoveReliefIcons))
          self.customization = 5
        } else {
          section.style.display = 'none'
          restoreDefaultEvents()
          self.customization = 0
        }
      })

      function dragToRemoveReliefIcons() {
        let point = d3.mouse(this)
        let cell = self.diagram.find(point[0], point[1]).index
        let radius = +reliefBulkRemoveRadius.value
        let r = Math.round(6 / self.graphSize * radius, 1)
        moveCircle(point[0], point[1], r)
        let selection = defineBrushSelection(cell, radius)
        if (selection) removeReliefIcons(selection)
      }

      function removeReliefIcons(selection) {
        if (selection.length === 0) return
        selection.map(function(index) {
          const selected = terrain.selectAll('g').selectAll('g[data-cell=\'' + index + '\']')
          selected.remove()
        })
      }

      $('#reliefRemove').click(function() {
        alertMessage.innerHTML = `Are you sure you want to remove the icon?`
        $('#alert').dialog({
          resizable: false, title: 'Remove relief icon',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              self.elSelected.remove()
              $('#reliefEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    function editBurg() {
      if (self.customization) return
      unselect()
      closeDialogs('#burgEditor, .stable')
      self.elSelected = d3.select(this)
      const id = +self.elSelected.attr('data-id')
      if (id === undefined) return
      d3.selectAll('[data-id=\'' + id + '\']').call(d3.drag().on('start', elementDrag))
        .classed('draggable', true)

      // update Burg details
      const type = self.elSelected.node().parentNode.id
      const labelGroup = burgLabels.select('#' + type)
      const iconGroup = burgIcons.select('#' + type)
      burgNameInput.value = self.manors[id].name
      updateBurgsGroupOptions()
      burgSelectGroup.value = labelGroup.attr('id')
      burgSelectDefaultFont.value = FONTS.indexOf(labelGroup.attr('data-font'))
      burgSetLabelSize.value = labelGroup.attr('data-size')
      burgLabelColorInput.value = toHEX(labelGroup.attr('fill'))
      burgLabelOpacity.value =
        labelGroup.attr('opacity') === undefined ? 1 : +labelGroup.attr('opacity')
      const tr = parseTransform(self.elSelected.attr('transform'))
      burgLabelAngle.value = tr[2]
      burgLabelAngleOutput.innerHTML = Math.abs(+tr[2]) + '°'
      burgIconSize.value = iconGroup.attr('size')
      burgIconFillOpacity.value =
        iconGroup.attr('fill-opacity') === undefined ? 1 : +iconGroup.attr('fill-opacity')
      burgIconFillColor.value = iconGroup.attr('fill')
      burgIconStrokeWidth.value = iconGroup.attr('stroke-width')
      burgIconStrokeOpacity.value =
        iconGroup.attr('stroke-opacity') === undefined ? 1 : +iconGroup.attr('stroke-opacity')
      burgIconStrokeColor.value = iconGroup.attr('stroke')
      const cell = self.cells[self.manors[id].cell]
      if (cell.region !== 'neutral' && cell.region !== undefined) {
        burgToggleCapital.disabled = false
        const capital = self.states[self.manors[id].region] ?
                        id === self.states[self.manors[id].region].capital ? 1 : 0 : 0
        d3.select('#burgToggleCapital').classed('pressed', capital)
      } else {
        burgToggleCapital.disabled = true
        d3.select('#burgToggleCapital').classed('pressed', false)
      }
      d3.select('#burgTogglePort').classed('pressed', cell.port !== undefined)
      burgPopulation.value = self.manors[id].population
      burgPopulationFriendly.value =
        Math.round(self.manors[id].population * urbanization.value * populationRate.value * 1000)

      $('#burgEditor').dialog({
        title: 'Edit Burg: ' + self.manors[id].name,
        minHeight: 30, width: 'auto', resizable: false,
        position: {my: 'center top+40', at: 'top', of: d3.event},
        close: function() {
          d3.selectAll('[data-id=\'' + id + '\']').call(d3.drag().on('drag', null))
            .classed('draggable', false)
          self.elSelected = null
        }
      })

      if (self.modules.editBurg) return
      self.modules.editBurg = true

      loadDefaultFonts()

      function updateBurgsGroupOptions() {
        burgSelectGroup.innerHTML = ''
        burgIcons.selectAll('g').each(function(d) {
          const opt = document.createElement('option')
          opt.value = opt.innerHTML = d3.select(this).attr('id')
          burgSelectGroup.add(opt)
        })
      }

      $('#burgEditor > button').not('#burgAddfromEditor').not('#burgRelocate').not('#burgRemove')
                               .click(function() {
                                 if ($(this).next().is(':visible')) {
                                   $('#burgEditor > button').show()
                                   $(this).next('div').hide()
                                 } else {
                                   $('#burgEditor > *').not(this).hide()
                                   $(this).next('div').show()
                                 }
                               })

      $('#burgEditor > div > button').click(function() {
        if ($(this).next().is(':visible')) {
          $('#burgEditor > div > button').show()
          $(this).parent().prev().show()
          $(this).next('div').hide()
        } else {
          $('#burgEditor > div > button').not(this).hide()
          $(this).parent().prev().hide()
          $(this).next('div').show()
        }
      })

      $('#burgSelectGroup').change(function() {
        const id = +self.elSelected.attr('data-id')
        const g = this.value
        moveBurgToGroup(id, g)
      })

      $('#burgInputGroup').change(function() {
        let newGroup = this.value.toLowerCase().replace(/ /g, '_').replace(/[^\w\s]/gi, '')
        if (Number.isFinite(+newGroup.charAt(0))) newGroup = 'g' + newGroup
        if (burgLabels.select('#' + newGroup).size()) {
          tip('The group "' + newGroup + '" is already exists')
          return
        }
        burgInputGroup.value = ''
        // clone old group assigning new id
        const id = self.elSelected.node().parentNode.id
        const l = burgLabels.select('#' + id).node().cloneNode(false)
        l.id = newGroup
        const i = burgIcons.select('#' + id).node().cloneNode(false)
        i.id = newGroup
        burgLabels.node().insertBefore(l, null)
        burgIcons.node().insertBefore(i, null)
        // select new group
        const opt = document.createElement('option')
        opt.value = opt.innerHTML = newGroup
        burgSelectGroup.add(opt)
        $('#burgSelectGroup').val(newGroup).change()
        $('#burgSelectGroup, #burgInputGroup').toggle()
        updateLabelGroups()
      })

      $('#burgAddGroup').click(function() {
        if ($('#burgInputGroup').css('display') === 'none') {
          $('#burgInputGroup').css('display', 'inline-block')
          $('#burgSelectGroup').css('display', 'none')
          burgInputGroup.focus()
        } else {
          $('#burgSelectGroup').css('display', 'inline-block')
          $('#burgInputGroup').css('display', 'none')
        }
      })

      $('#burgRemoveGroup').click(function() {
        const group = d3.select(self.elSelected.node().parentNode)
        const type = group.attr('id')
        const id = +self.elSelected.attr('data-id')
        const count = group.selectAll('*').size()
        const message = 'Are you sure you want to remove all Burgs (' + count + ') of that group?'
        alertMessage.innerHTML = message
        $('#alert').dialog({
          resizable: false, title: 'Remove Burgs',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              group.selectAll('*').each(function(d) {
                const id = +d3.select(this).attr('data-id')
                if (id === undefined) return
                const cell = self.manors[id].cell
                const state = self.manors[id].region
                if (self.states[state]) {
                  if (self.states[state].capital === id) self.states[state].capital = 'select'
                  self.states[state].burgs--
                }
                self.manors[id].region = 'removed'
                self.cells[cell].manor = undefined
              })
              burgLabels.select('#' + type).selectAll('*').remove()
              burgIcons.select('#' + type).selectAll('*').remove()
              $('#icons g[id*=\'anchors\'] [data-id=' + id + ']').parent().children().remove()
              closeDialogs('.stable')
              updateCountryEditors()
              $('#burgEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })

      })

      $('#burgNameInput').on('input', function() {
        if (this.value === '') {
          tip(
            'Name should not be blank, set opacity to 0 to hide label or remove button to delete')
          return
        }
        const id = +self.elSelected.attr('data-id')
        burgLabels.selectAll('[data-id=\'' + id + '\']').text(this.value)
        self.manors[id].name = this.value
        $('div[aria-describedby=\'burgEditor\'] .ui-dialog-title').text('Edit Burg: ' + this.value)
      })

      $('#burgNameReCulture, #burgNameReRandom').click(function() {
        const id = +self.elSelected.attr('data-id')
        const culture = this.id === 'burgNameReCulture' ? self.manors[id].culture :
                        Math.floor(Math.random() * self.cultures.length)
        const name = generateName(culture)
        burgLabels.selectAll('[data-id=\'' + id + '\']').text(name)
        self.manors[id].name = name
        burgNameInput.value = name
        $('div[aria-describedby=\'burgEditor\'] .ui-dialog-title').text('Edit Burg: ' + name)
      })

      $('#burgToggleExternalFont').click(function() {
        if ($('#burgInputExternalFont').css('display') === 'none') {
          $('#burgInputExternalFont').css('display', 'inline-block')
          $('#burgSelectDefaultFont').css('display', 'none')
          burgInputExternalFont.focus()
        } else {
          $('#burgSelectDefaultFont').css('display', 'inline-block')
          $('#burgInputExternalFont').css('display', 'none')
        }
      })

      $('#burgSelectDefaultFont').change(function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgLabels.select('#' + type)
        if (burgSelectDefaultFont.value === '') return
        const font = FONTS[burgSelectDefaultFont.value].split(':')[0].replace(/\+/g, ' ')
        group.attr('font-family', font).attr('data-font', FONTS[burgSelectDefaultFont.value])
      })

      $('#burgInputExternalFont').change(function() {
        fetchFonts(this.value).then(fetched => {
          if (!fetched) return
          burgToggleExternalFont.click()
          burgInputExternalFont.value = ''
          if (fetched === 1) $('#burgSelectDefaultFont').val(FONTS.length - 1).change()
        })
      })

      $('#burgSetLabelSize').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgLabels.select('#' + type)
        group.attr('data-size', +this.value)
        invokeActiveZooming()
      })

      $('#burgLabelColorInput').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgLabels.select('#' + type)
        group.attr('fill', this.value)
      })

      $('#burgLabelOpacity').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgLabels.select('#' + type)
        group.attr('opacity', +this.value)
      })

      $('#burgLabelAngle').on('input', function() {
        const id = +self.elSelected.attr('data-id')
        const el = burgLabels.select('[data-id=\'' + id + '\']')
        const tr = parseTransform(el.attr('transform'))
        const c = el.node().getBBox()
        burgLabelAngleOutput.innerHTML = Math.abs(+this.value) + '°'
        const angle = +this.value
        const transform = `translate(${tr[0]},${tr[1]}) rotate(${angle} ${(c.x + c.width / 2)} ${(c.y + c.height / 2)})`
        el.attr('transform', transform)
      })

      $('#burgIconSize').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgIcons.select('#' + type)
        const size = +this.value
        group.attr('size', size)
        group.selectAll('*').each(function() {d3.select(this).attr('r', size)})
      })

      $('#burgIconFillOpacity').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgIcons.select('#' + type)
        group.attr('fill-opacity', +this.value)
      })

      $('#burgIconFillColor').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgIcons.select('#' + type)
        group.attr('fill', this.value)
      })

      $('#burgIconStrokeWidth').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgIcons.select('#' + type)
        group.attr('stroke-width', +this.value)
      })

      $('#burgIconStrokeOpacity').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgIcons.select('#' + type)
        group.attr('stroke-opacity', +this.value)
      })

      $('#burgIconStrokeColor').on('input', function() {
        const type = self.elSelected.node().parentNode.id
        const group = burgIcons.select('#' + type)
        group.attr('stroke', this.value)
      })

      $('#burgToggleCapital').click(function() {
        const id = +self.elSelected.attr('data-id')
        const state = self.manors[id].region
        if (self.states[state] === undefined) return
        const capital = self.states[self.manors[id].region] ?
                        id === self.states[self.manors[id].region].capital ? 0 : 1 : 1
        if (capital && self.states[state].capital !== 'select') {
          // move oldCapital to a town group
          const oldCapital = self.states[state].capital
          moveBurgToGroup(oldCapital, 'towns')
        }
        self.states[state].capital = capital ? id : 'select'
        d3.select('#burgToggleCapital').classed('pressed', capital)
        const g = capital ? 'capitals' : 'towns'
        moveBurgToGroup(id, g)
      })

      $('#burgTogglePort').click(function() {
        const id = +self.elSelected.attr('data-id')
        const cell = self.cells[self.manors[id].cell]
        const markAsPort = cell.port === undefined ? true : undefined
        cell.port = markAsPort
        d3.select('#burgTogglePort').classed('pressed', markAsPort)
        if (markAsPort) {
          const type = self.elSelected.node().parentNode.id
          const ag = type === 'capitals' ? '#capital-anchors' : '#town-anchors'
          const group = icons.select(ag)
          const size = +group.attr('size')
          const x = _.round(self.manors[id].x - size * 0.47, 2)
          const y = _.round(self.manors[id].y - size * 0.47, 2)
          group.append('use').attr('xlink:href', '#icon-anchor').attr('data-id', id)
               .attr('x', x).attr('y', y).attr('width', size).attr('height', size)
               .on('click', editIcon)
        } else {
          $('#icons g[id*=\'anchors\'] [data-id=' + id + ']').remove()
        }
      })

      $('#burgPopulation').on('input', function() {
        const id = +self.elSelected.attr('data-id')
        burgPopulationFriendly.value =
          Math.round(this.value * urbanization.value * populationRate.value * 1000)
        self.manors[id].population = +this.value
      })

      $('#burgRelocate').click(function() {
        if ($(this).hasClass('pressed')) {
          $('.pressed').removeClass('pressed')
          restoreDefaultEvents()
          tip('', true)
        } else {
          $('.pressed').removeClass('pressed')
          const id = self.elSelected.attr('data-id')
          $(this).addClass('pressed').attr('data-id', id)
          viewbox.style('cursor', 'crosshair').on('click', relocateBurgOnClick)
          tip('Click on map to relocate burg. Hold Shift for continuous move', true)
        }
      })

      // open legendsEditor
      document.getElementById('burglLegend').addEventListener('click', function() {
        let burg = +self.elSelected.attr('data-id')
        let id = 'burg' + burg
        let name = self.manors[burg].name
        editLegends(id, name)
      })

      // move burg to a different cell
      function relocateBurgOnClick() {
        const point = d3.mouse(this)
        const index = getIndex(point)
        const i = +$('#burgRelocate').attr('data-id')
        if (isNaN(i) || !self.manors[i]) return

        if (self.cells[index].height < 20) {
          tip('Cannot place burg in the water! Select a land cell', null, 'error')
          return
        }

        if (self.cells[index].manor !== undefined && self.cells[index].manor !== i) {
          tip('There is already a burg in this cell. Please select a free cell', null, 'error')
          $('#grid').fadeIn()
          d3.select('#toggleGrid').classed('buttonoff', false)
          return
        }

        let region = self.cells[index].region
        const oldRegion = self.manors[i].region
        // relocating capital to other country you "conquer" target cell
        if (self.states[oldRegion] && self.states[oldRegion].capital === i) {
          if (region !== oldRegion) {
            tip('Capital cannot be moved to another country!', null, 'error')
            return
          }
        }

        if (d3.event.shiftKey === false) {
          $('#burgRelocate').removeClass('pressed')
          restoreDefaultEvents()
          tip('', true)
          if (region !== oldRegion) {
            recalculateStateData(oldRegion)
            recalculateStateData(region)
            updateCountryEditors()
          }
        }

        const x = _.round(point[0], 2), y = _.round(point[1], 2)
        burgIcons.select('circle[data-id=\'' + i + '\']').attr('transform', null).attr('cx', x)
                 .attr('cy', y)
        burgLabels.select('text[data-id=\'' + i + '\']').attr('transform', null).attr('x', x)
                  .attr('y', y)
        const anchor = icons.select('use[data-id=\'' + i + '\']')
        if (anchor.size()) {
          const size = anchor.attr('width')
          const xa = _.round(x - size * 0.47, 2)
          const ya = _.round(y - size * 0.47, 2)
          anchor.attr('transform', null).attr('x', xa).attr('y', ya)
        }
        self.cells[index].manor = i
        self.cells[self.manors[i].cell].manor = undefined
        self.manors[i].x = x, self.manors[i].y = y, self.manors[i].region = region, self.manors[i].cell = index
      }

      // open in MFCG
      $('#burgSeeInMFCG').click(function() {
        const id = +self.elSelected.attr('data-id')
        const name = self.manors[id].name
        const cell = self.manors[id].cell
        const pop = Math.round(self.manors[id].population)
        const size = pop > 65 ? 65 : pop < 6 ? 6 : pop
        const s = self.seed + '' + id
        const hub = self.cells[cell].crossroad > 2 ? 1 : 0
        const river = self.cells[cell].river ? 1 : 0
        const coast = self.cells[cell].port !== undefined ? 1 : 0
        const sec = pop > 40 ? 1 : Math.random() < pop / 100 ? 1 : 0
        const thr = sec && Math.random() < 0.8 ? 1 : 0
        const url = 'http://fantasycities.watabou.ru/'
        let params = `?name=${name}&size=${size}&seed=${s}&hub=${hub}&random=0&continuous=0`
        params +=
          `&river=${river}&coast=${coast}&citadel=${id & 1}&plaza=${sec}&temple=${thr}&walls=${sec}&shantytown=${sec}`
        const win = window.open(url + self.params, '_blank')
        win.focus()
      })

      $('#burgAddfromEditor').click(function() {
        clickToAdd() // to load on click event function
        $('#addBurg').click()
      })

      $('#burgRemove').click(function() {
        alertMessage.innerHTML = `Are you sure you want to remove the Burg?`
        $('#alert').dialog({
          resizable: false, title: 'Remove Burg',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              const id = +self.elSelected.attr('data-id')
              d3.selectAll('[data-id=\'' + id + '\']').remove()
              const cell = self.manors[id].cell
              const state = self.manors[id].region
              if (self.states[state]) {
                if (self.states[state].capital === id) self.states[state].capital = 'select'
                self.states[state].burgs--
              }
              self.manors[id].region = 'removed'
              self.cells[cell].manor = undefined
              closeDialogs('.stable')
              updateCountryEditors()
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    function editMarker() {
      if (self.customization) return

      unselect()
      closeDialogs('#markerEditor, .stable')
      self.elSelected =
        d3.select(this).call(d3.drag().on('start', elementDrag)).classed('draggable', true)

      $('#markerEditor').dialog({
        title: 'Edit Marker',
        minHeight: 30, width: 'auto', maxWidth: 275, resizable: false,
        position: {my: 'center top+30', at: 'bottom', of: d3.event},
        close: unselect
      })

      // update inputs
      let id = self.elSelected.attr('href')
      let symbol = d3.select('#defs-markers').select(id)
      let icon = symbol.select('text')
      markerSelectGroup.value = id.slice(1)
      markerIconSize.value = parseFloat(icon.attr('font-size'))
      markerIconShiftX.value = parseFloat(icon.attr('x'))
      markerIconShiftY.value = parseFloat(icon.attr('y'))
      markerIconFill.value = icon.attr('fill')
      markerIconStrokeWidth.value = icon.attr('stroke-width')
      markerIconStroke.value = icon.attr('stroke')
      markerSize.value = self.elSelected.attr('data-size')
      markerBase.value = symbol.select('path').attr('fill')
      markerFill.value = symbol.select('circle').attr('fill')
      let opacity = symbol.select('circle').attr('opacity')
      markerToggleBubble.className = opacity === '0' ? 'icon-info' : 'icon-info-circled'

      let table = document.getElementById('markerIconTable')
      let selected = table.getElementsByClassName('selected')
      if (selected.length) selected[0].removeAttribute('class')
      selected = document.querySelectorAll('#markerIcon' + icon.text().codePointAt())
      if (selected.length) selected[0].className = 'selected'
      markerIconCustom.value = selected.length ? '' : icon.text()

      if (self.modules.editMarker) return
      self.modules.editMarker = true

      $('#markerGroup').click(function() {
        $('#markerEditor > button').not(this).toggle()
        $('#markerGroupSection').toggle()
        updateMarkerGroupOptions()
      })

      function updateMarkerGroupOptions() {
        markerSelectGroup.innerHTML = ''
        d3.select('#defs-markers').selectAll('symbol').each(function() {
          let opt = document.createElement('option')
          opt.value = opt.innerHTML = this.id
          markerSelectGroup.add(opt)
        })
        let id = self.elSelected.attr('href').slice(1)
        markerSelectGroup.value = id
      }

      // on add marker type click
      document.getElementById('markerAddGroup').addEventListener('click', function() {
        if ($('#markerInputGroup').css('display') === 'none') {
          $('#markerInputGroup').css('display', 'inline-block')
          $('#markerSelectGroup').css('display', 'none')
          markerInputGroup.focus()
        } else {
          $('#markerSelectGroup').css('display', 'inline-block')
          $('#markerInputGroup').css('display', 'none')
        }
      })

      // on marker type change
      document.getElementById('markerSelectGroup').addEventListener('change', function() {
        self.elSelected.attr('href', '#' + this.value)
        self.elSelected.attr('data-id', '#' + this.value)
      })

      // on new type input
      document.getElementById('markerInputGroup').addEventListener('change', function() {
        let newGroup = this.value.toLowerCase().replace(/ /g, '_').replace(/[^\w\s]/gi, '')
        if (Number.isFinite(+newGroup.charAt(0))) newGroup = 'm' + newGroup
        if (d3.select('#defs-markers').select('#' + newGroup).size()) {
          tip('The type "' + newGroup + '" is already exists')
          return
        }
        markerInputGroup.value = ''
        // clone old group assigning new id
        let id = self.elSelected.attr('href')
        let l = d3.select('#defs-markers').select(id).node().cloneNode(true)
        l.id = newGroup
        self.elSelected.attr('href', '#' + newGroup)
        self.elSelected.attr('data-id', '#' + newGroup)
        document.getElementById('defs-markers').insertBefore(l, null)

        // select new group
        let opt = document.createElement('option')
        opt.value = opt.innerHTML = newGroup
        markerSelectGroup.add(opt)
        $('#markerSelectGroup').val(newGroup).change()
        $('#markerSelectGroup, #markerInputGroup').toggle()
        updateMarkerGroupOptions()
      })

      $('#markerIconButton').click(function() {
        $('#markerEditor > button').not(this).toggle()
        $('#markerIconButtons').toggle()
        if (!$('#markerIconTable').text()) drawIconsList(icons)
      })

      $('#markerRemoveGroup').click(function() {
        let id = self.elSelected.attr('href')
        let used = document.querySelectorAll('use[data-id=\'' + id + '\']')
        let count = used.length === 1 ? '1 element' : used.length + ' elements'
        const message = 'Are you sure you want to remove the marker (' + count + ')?'
        alertMessage.innerHTML = message
        $('#alert').dialog({
          resizable: false, title: 'Remove marker',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              if (id !== '#marker0') d3.select('#defs-markers').select(id).remove()
              used.forEach(function(e) {e.remove()})
              updateMarkerGroupOptions()
              $('#markerEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

      function drawIconsList() {
        let table = document.getElementById('markerIconTable'), row = ''
        table.addEventListener('click', clickMarkerIconTable, false)
        table.addEventListener('mouseover', hoverMarkerIconTable, false)

        for (let i = 0; i < ICONS.length; i++) {
          if (i % 20 === 0) row = table.insertRow(0)
          let cell = row.insertCell(0)
          let icon = String.fromCodePoint(parseInt(ICONS[i][0], 16))
          cell.innerHTML = icon
          cell.id = 'markerIcon' + icon.codePointAt()
          cell.setAttribute('data-desc', ICONS[i][2])
        }
      }

      function clickMarkerIconTable(e) {
        if (e.target !== e.currentTarget) {
          let table = document.getElementById('markerIconTable')
          let selected = table.getElementsByClassName('selected')
          if (selected.length) selected[0].removeAttribute('class')
          e.target.className = 'selected'
          let id = self.elSelected.attr('href')
          let icon = e.target.innerHTML
          d3.select('#defs-markers').select(id).select('text').text(icon)
        }
        e.stopPropagation()
      }

      function hoverMarkerIconTable(e) {
        if (e.target !== e.currentTarget) {
          let desc = e.target.getAttribute('data-desc')
          tip(e.target.innerHTML + ' ' + desc)
        }
        e.stopPropagation()
      }

      // change marker icon size
      document.getElementById('markerIconSize').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').attr('font-size', this.value + 'px')
      })

      // change marker icon x shift
      document.getElementById('markerIconShiftX').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').attr('x', this.value + '%')
      })

      // change marker icon y shift
      document.getElementById('markerIconShiftY').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').attr('y', this.value + '%')
      })

      // apply custom unicode icon on input
      document.getElementById('markerIconCustom').addEventListener('input', function() {
        if (!this.value) return
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').text(this.value)
      })

      $('#markerStyleButton').click(function() {
        $('#markerEditor > button').not(this).toggle()
        $('#markerStyleButtons').toggle()
      })

      // change marker size
      document.getElementById('markerSize').addEventListener('input', function() {
        let id = self.elSelected.attr('data-id')
        let used = document.querySelectorAll('use[data-id=\'' + id + '\']')
        let size = this.value
        used.forEach(function(e) {e.setAttribute('data-size', size)})
        invokeActiveZooming()
      })

      // change marker base color
      document.getElementById('markerBase').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select(id).select('path').attr('fill', this.value)
        d3.select(id).select('circle').attr('stroke', this.value)
      })

      // change marker fill color
      document.getElementById('markerFill').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select(id).select('circle').attr('fill', this.value)
      })

      // change marker icon y shift
      document.getElementById('markerIconFill').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').attr('fill', this.value)
      })

      // change marker icon y shift
      document.getElementById('markerIconStrokeWidth').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').attr('stroke-width', this.value)
      })

      // change marker icon y shift
      document.getElementById('markerIconStroke').addEventListener('input', function() {
        let id = self.elSelected.attr('href')
        d3.select('#defs-markers').select(id).select('text').attr('stroke', this.value)
      })

      // toggle marker bubble display
      document.getElementById('markerToggleBubble').addEventListener('click', function() {
        let id = self.elSelected.attr('href')
        let show = 1
        if (this.className === 'icon-info-circled') {
          this.className = 'icon-info'
          show = 0
        } else {
          this.className = 'icon-info-circled'

        }
        d3.select(id).select('circle').attr('opacity', show)
        d3.select(id).select('path').attr('opacity', show)
      })

      // open legendsEditor
      document.getElementById('markerLegendButton').addEventListener('click', function() {
        let id = self.elSelected.attr('id')
        let symbol = self.elSelected.attr('href')
        let icon = d3.select('#defs-markers').select(symbol).select('text').text()
        let name = 'Marker ' + icon
        editLegends(id, name)
      })

      // click on master button to add new markers on click
      document.getElementById('markerAdd').addEventListener('click', function() {
        document.getElementById('addMarker').click()
      })

      // remove marker on click
      document.getElementById('markerRemove').addEventListener('click', function() {
        alertMessage.innerHTML = 'Are you sure you want to remove the marker?'
        $('#alert').dialog({
          resizable: false, title: 'Remove marker',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              self.elSelected.remove()
              $('#markerEditor').dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    // clear elSelected variable
    function unselect() {
      tip('', true)
      restoreDefaultEvents()
      if (self.customization === 5) self.customization = 0
      if (!self.elSelected) return
      self.elSelected.call(d3.drag().on('drag', null)).attr('class', null)
      debug.selectAll('*').remove()
      viewbox.style('cursor', 'default')
      self.elSelected = null
    }

    // transform string to array [translateX,translateY,rotateDeg,rotateX,rotateY,scale]
    function parseTransform(string) {
      if (!string) {return [0, 0, 0, 0, 0, 1]}
      const a = string.replace(/[a-z()]/g, '').replace(/[ ]/g, ',').split(',')
      return [a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0, a[4] || 0, a[5] || 1]
    }

    // generic function to move any burg to any group
    function moveBurgToGroup(id, g) {
      $('#burgLabels [data-id=' + id + ']').detach().appendTo($('#burgLabels > #' + g))
      $('#burgIcons [data-id=' + id + ']').detach().appendTo($('#burgIcons > #' + g))
      const rSize = $('#burgIcons > #' + g).attr('size')
      $('#burgIcons [data-id=' + id + ']').attr('r', rSize)
      const el = $('#icons g[id*=\'anchors\'] [data-id=' + id + ']')
      if (el.length) {
        const to = g === 'towns' ? $('#town-anchors') : $('#capital-anchors')
        el.detach().appendTo(to)
        const useSize = to.attr('size')
        const x = _.round(self.manors[id].x - useSize * 0.47, 2)
        const y = _.round(self.manors[id].y - useSize * 0.47, 2)
        el.attr('x', x).attr('y', y).attr('width', useSize).attr('height', useSize)
      }
      updateCountryEditors()
    }

    function manorsAndRegions() {
      console.group('manorsAndRegions')
      self.calculateChains()
      rankPlacesGeography()
      locateCapitals()
      generateMainRoads()
      rankPlacesEconomy()
      locateTowns()
      getNames()
      shiftSettlements()
      checkAccessibility()
      defineRegions('withCultures')
      generatePortRoads()
      generateSmallRoads()
      generateOceanRoutes()
      calculatePopulation()
      drawManors()
      drawRegions()
      console.groupEnd('manorsAndRegions')
    }

    // Assess cells geographycal suitability for settlement
    function rankPlacesGeography() {
      console.time('rankPlacesGeography')
      self.land.map(function(c) {
        let score = 0
        c.flux = _.round(c.flux, 2)
        // get base score from height (will be biom)
        if (c.height <= 40) score = 2
        else if (c.height <= 50) score = 1.8
        else if (c.height <= 60) score = 1.6
        else if (c.height <= 80) score = 1.4
        score += (1 - c.height / 100) / 3
        if (c.ctype && Math.random() < 0.8 && !c.river) {
          c.score = 0 // ignore 80% of extended cells
        } else {
          if (c.harbor) {
            if (c.harbor === 1) {score += 1} else {score -= 0.3} // good sea harbor is valued
          }
          if (c.river) score += 1 // coastline is valued
          if (c.river && c.ctype === 1) score += 1 // estuary is valued
          if (c.flux > 1) score += Math.pow(c.flux, 0.3) // riverbank is valued
          if (c.confluence) score += Math.pow(c.confluence, 0.7) // confluence is valued;
          const neighbEv = c.neighbors.map(
            function(n) {if (self.cells[n].height >= 20) return self.cells[n].height})
          const difEv = c.height - d3.mean(neighbEv)
          // if (!isNaN(difEv)) score += difEv * 10 * (1 - c.height / 100); // local height maximums are valued
        }
        c.score = _.round(Math.random() * score + score, 3) // add random factor
      })
      self.land.sort(function(a, b) {return b.score - a.score})
      console.timeEnd('rankPlacesGeography')
    }

    // Assess the cells economical suitability for settlement
    function rankPlacesEconomy() {
      console.time('rankPlacesEconomy')
      self.land.map(function(c) {
        let score = c.score
        let path = c.path || 0 // roads are valued
        if (path) {
          path = Math.pow(path, 0.2)
          const crossroad = c.crossroad || 0 // crossroads are valued
          score = score + path + crossroad
        }
        c.score = _.round(Math.random() * score + score, 2) // add random factor
      })
      self.land.sort(function(a, b) {return b.score - a.score})
      console.timeEnd('rankPlacesEconomy')
    }

    // calculate population for manors, cells and states
    function calculatePopulation() {
      // neutral population factors < 1 as neutral lands are usually pretty wild
      const ruralFactor = 0.5, urbanFactor = 0.9

      // calculate population for each burg (based on trade/people attractors)
      self.manors.map(function(m) {
        const cell = self.cells[m.cell]
        let score = cell.score
        if (score <= 0) {score = _.round(Math.random(), 2)}
        if (cell.crossroad) {score += cell.crossroad} // crossroads
        if (cell.confluence) {score += Math.pow(cell.confluence, 0.3)} // confluences
        if (m.i !== m.region && cell.port) {score *= 1.5} // ports (not capital)
        if (m.i === m.region && !cell.port) {score *= 2} // land-capitals
        if (m.i === m.region && cell.port) {score *= 3} // port-capitals
        if (m.region === 'neutral') score *= urbanFactor
        const rnd = 0.6 + Math.random() * 0.8 // random factor
        m.population = _.round(score * rnd, 1)
      })

      // calculate rural population for each cell based on area + elevation (elevation to be changed to biome)
      const graphSizeAdj = 90 / Math.sqrt(self.cells.length, 2) // adjust to different graphSize
      self.land.map(function(l) {
        let population = 0
        const elevationFactor = Math.pow(1 - l.height / 100, 3)
        population = elevationFactor * l.area * graphSizeAdj
        if (l.region === 'neutral') population *= ruralFactor
        l.pop = _.round(population, 1)
      })

      // calculate population for each region
      self.states.map(function(s, i) {
        // define region burgs count
        const burgs = $.grep(self.manors, function(e) {
          return e.region === i
        })
        s.burgs = burgs.length
        // define region total and burgs population
        let burgsPop = 0 // get summ of all burgs population
        burgs.map(function(b) {burgsPop += b.population})
        s.urbanPopulation = _.round(burgsPop, 2)
        const regionCells = $.grep(self.cells, function(e) {
          return e.region === i
        })
        let cellsPop = 0
        regionCells.map(function(c) {cellsPop += c.pop})
        s.cells = regionCells.length
        s.ruralPopulation = _.round(cellsPop, 1)
      })

      // collect data for neutrals
      const neutralCells = $.grep(self.cells, function(e) {return e.region === 'neutral'})
      if (neutralCells.length) {
        let burgs = 0, urbanPopulation = 0, ruralPopulation = 0, area = 0
        self.manors.forEach(function(m) {
          if (m.region !== 'neutral') return
          urbanPopulation += m.population
          burgs++
        })
        neutralCells.forEach(function(c) {
          ruralPopulation += c.pop
          area += self.cells[c.index].area
        })
        self.states.push({
          i: self.states.length, color: 'neutral', name: 'Neutrals', capital: 'neutral',
          cells: neutralCells.length, burgs, urbanPopulation: _.round(urbanPopulation, 2),
          ruralPopulation: _.round(ruralPopulation, 2), area: Math.round(area)
        })
      }
    }

    function locateCapitals() {
      console.time('locateCapitals')
      // min distance detween capitals
      const count = +regionsInput.value
      let spacing = (self.graphWidth + self.graphHeight) / 2 / count
      console.log(' states: ' + count)

      for (let l = 0; self.manors.length < count; l++) {
        const region = self.manors.length
        const x = self.land[l].data[0], y = self.land[l].data[1]
        let minDist = 10000 // dummy value
        for (let c = 0; c < self.manors.length; c++) {
          const dist = Math.hypot(x - self.manors[c].x, y - self.manors[c].y)
          if (dist < minDist) minDist = dist
          if (minDist < spacing) break
        }
        if (minDist >= spacing) {
          const cell = self.land[l].index
          const closest = self.cultureTree.find(x, y)
          const culture = getCultureId(closest)
          self.manors.push({i: region, cell, x, y, region, culture})
        }
        if (l === self.land.length - 1) {
          console.error('Cannot place capitals with current spacing. Trying again with reduced spacing')
          l = -1
          self.manors = []
          spacing /= 1.2
        }
      }

      // For each capital create a country
      const scheme = count <= 8 ? colors8 : colors20
      const mod = +powerInput.value
      self.manors.forEach(function(m, i) {
        const power = _.round(Math.random() * mod / 2 + 1, 1)
        const color = scheme(i / count)
        self.states.push({i, color, power, capital: i})
        const p = self.cells[m.cell]
        p.manor = i
        p.region = i
        p.culture = m.culture
      })
      console.timeEnd('locateCapitals')
    }

    function locateTowns() {
      console.time('locateTowns')
      const count = +manorsInput.value
      const neutral = +neutralInput.value
      const manorTree = d3.quadtree()
      self.manors.forEach(function(m) {manorTree.add([m.x, m.y])})

      for (let l = 0; self.manors.length < count && l < self.land.length; l++) {
        const x = self.land[l].data[0], y = self.land[l].data[1]
        const c = manorTree.find(x, y)
        const d = Math.hypot(x - c[0], y - c[1])
        if (d < 6) continue
        const cell = self.land[l].index
        let region = 'neutral', culture = -1, closest = neutral
        for (let c = 0; c < self.states.length; c++) {
          let dist = Math.hypot(self.manors[c].x - x, self.manors[c].y - y) / self.states[c].power
          const cap = self.manors[c].cell
          if (self.cells[cell].fn !== self.cells[cap].fn) dist *= 3
          if (dist < closest) {
            region = c
            closest = dist
          }
        }
        if (closest > neutral / 5 || region === 'neutral') {
          const closestCulture = self.cultureTree.find(x, y)
          culture = getCultureId(closestCulture)
        } else {
          culture = self.manors[region].culture
        }
        self.land[l].manor = self.manors.length
        self.land[l].culture = culture
        self.land[l].region = region
        self.manors.push({i: self.manors.length, cell, x, y, region, culture})
        manorTree.add([x, y])
      }
      if (self.manors.length < count) {
        const error = 'Cannot place all burgs. Requested ' + count + ', placed ' + self.manors.length
        console.error(error)
      }
      console.timeEnd('locateTowns')
    }

    // shift settlements from cell point
    function shiftSettlements() {
      for (let i = 0; i < self.manors.length; i++) {
        const capital = i < regionsInput.value
        const cell = self.cells[self.manors[i].cell]
        let x = self.manors[i].x, y = self.manors[i].y
        if ((capital && cell.harbor) || cell.harbor === 1) {
          // port: capital with any harbor and towns with good harbors
          if (cell.haven === undefined) {
            cell.harbor = undefined
          } else {
            cell.port = self.cells[cell.haven].fn
            x = cell.coastX
            y = cell.coastY
          }
        }
        if (cell.river && cell.type !== 1) {
          let shift = 0.2 * cell.flux
          if (shift < 0.2) shift = 0.2
          if (shift > 1) shift = 1
          shift = Math.random() > .5 ? shift : shift * -1
          x = _.round(x + shift, 2)
          shift = Math.random() > .5 ? shift : shift * -1
          y = _.round(y + shift, 2)
        }
        cell.data[0] = self.manors[i].x = x
        cell.data[1] = self.manors[i].y = y
      }
    }

    // Validate each island with manors has port
    function checkAccessibility() {
      console.time('checkAccessibility')
      for (let f = 0; f < self.features.length; f++) {
        if (!self.features[f].land) continue
        const manorsOnIsland = $.grep(self.land, function(e) {
          return e.manor !== undefined && e.fn === f
        })
        if (!manorsOnIsland.length) continue

        // if lake port is the only port on lake, remove port
        const lakePorts = $.grep(manorsOnIsland, function(p) {
          return p.port && !self.features[p.port].border
        })
        if (lakePorts.length) {
          const lakes = []
          lakePorts.forEach(function(p) {lakes[p.port] = lakes[p.port] ? lakes[p.port] + 1 : 1})
          lakePorts.forEach(function(p) {if (lakes[p.port] === 1) p.port = undefined})
        }

        // check how many ocean ports are there on island
        const oceanPorts = $.grep(manorsOnIsland, function(p) {
          return p.port && self.features[p.port].border
        })
        if (oceanPorts.length) continue
        const portCandidates = $.grep(manorsOnIsland, function(c) {
          return c.harbor && self.features[self.cells[c.harbor].fn].border && c.ctype === 1
        })
        if (portCandidates.length) {
          // No ports on island. Upgrading first burg to port
          const candidate = portCandidates[0]
          candidate.harbor = 1
          candidate.port = self.cells[candidate.haven].fn
          const manor = self.manors[portCandidates[0].manor]
          candidate.data[0] = manor.x = candidate.coastX
          candidate.data[1] = manor.y = candidate.coastY
          // add score for each burg on island (as it's the only port)
          candidate.score += Math.floor((portCandidates.length - 1) / 2)
        } else {
          // No ports on island. Reducing score for burgs
          manorsOnIsland.forEach(function(e) {e.score -= 2})
        }
      }
      console.timeEnd('checkAccessibility')
    }

    function generateMainRoads() {
      console.time('generateMainRoads')
      lineGen.curve(d3.curveBasis)
      if (self.states.length < 2 || self.manors.length < 2) return
      for (let f = 0; f < self.features.length; f++) {
        if (!self.features[f].land) continue
        const manorsOnIsland = $.grep(self.land,
          function(e) {return e.manor !== undefined && e.fn === f})
        if (manorsOnIsland.length > 1) {
          for (let d = 1; d < manorsOnIsland.length; d++) {
            for (let m = 0; m < d; m++) {
              const path = findLandPath(manorsOnIsland[d].index, manorsOnIsland[m].index, 'main')
              restorePath(manorsOnIsland[m].index, manorsOnIsland[d].index, 'main', path)
            }
          }
        }
      }
      console.timeEnd('generateMainRoads')
    }

    // add roads from port to capital if capital is not a port
    function generatePortRoads() {
      console.time('generatePortRoads')
      if (!self.states.length || self.manors.length < 2) return
      const portless = []
      for (let s = 0; s < self.states.length; s++) {
        const cell = self.manors[s].cell
        if (self.cells[cell].port === undefined) portless.push(s)
      }
      for (let l = 0; l < portless.length; l++) {
        const ports = $.grep(self.land,
          function(l) {return l.port !== undefined && l.region === portless[l]})
        if (!ports.length) continue
        let minDist = 1000, end = -1
        ports.map(function(p) {
          const dist = Math.hypot(e.data[0] - p.data[0], e.data[1] - p.data[1])
          if (dist < minDist && dist > 1) {
            minDist = dist
            end = p.index
          }
        })
        if (end !== -1) {
          const start = self.manors[portless[l]].cell
          const path = findLandPath(start, end, 'direct')
          restorePath(end, start, 'main', path)
        }
      }
      console.timeEnd('generatePortRoads')
    }

    function generateSmallRoads() {
      console.time('generateSmallRoads')
      if (self.manors.length < 2) return
      for (let f = 0; f < self.features.length; f++) {
        const manorsOnIsland = $.grep(self.land, function(e) {
          return e.manor !== undefined && e.fn === f
        })
        const l = manorsOnIsland.length
        if (l > 1) {
          const secondary = Math.round((l + 8) / 10)
          for (let s = 0; s < secondary; s++) {
            var start = manorsOnIsland[Math.floor(Math.random() * l)].index
            var end = manorsOnIsland[Math.floor(Math.random() * l)].index
            var dist = Math.hypot(self.cells[start].data[0] - self.cells[end].data[0],
              self.cells[start].data[1] - self.cells[end].data[1])
            if (dist > 10) {
              var path = findLandPath(start, end, 'direct')
              restorePath(end, start, 'small', path)
            }
          }
          manorsOnIsland.map(function(e, d) {
            if (!e.path && d > 0) {
              const start = e.index
              let end = -1
              const road = $.grep(self.land, function(e) {
                return e.path && e.fn === f
              })
              if (road.length > 0) {
                let minDist = 10000
                road.map(function(i) {
                  const dist = Math.hypot(e.data[0] - i.data[0], e.data[1] - i.data[1])
                  if (dist < minDist) {
                    minDist = dist
                    end = i.index
                  }
                })
              } else {
                end = manorsOnIsland[0].index
              }
              const path = findLandPath(start, end, 'main')
              restorePath(end, start, 'small', path)
            }
          })
        }
      }
      console.timeEnd('generateSmallRoads')
    }

    function generateOceanRoutes() {
      console.time('generateOceanRoutes')
      lineGen.curve(d3.curveBasis)
      const cAnchors = icons.selectAll('#capital-anchors')
      const tAnchors = icons.selectAll('#town-anchors')
      const cSize = cAnchors.attr('size') || 2
      const tSize = tAnchors.attr('size') || 1

      const ports = []
      // groups all ports on water feature
      for (let m = 0; m < self.manors.length; m++) {
        const cell = self.manors[m].cell
        const port = self.cells[cell].port
        if (port === undefined) continue
        if (ports[port] === undefined) ports[port] = []
        ports[port].push(cell)

        // draw anchor icon
        const group = m < self.states.length ? cAnchors : tAnchors
        const size = m < self.states.length ? cSize : tSize
        const x = _.round(self.cells[cell].data[0] - size * 0.47, 2)
        const y = _.round(self.cells[cell].data[1] - size * 0.47, 2)
        group.append('use').attr('xlink:href', '#icon-anchor').attr('data-id', m)
             .attr('x', x).attr('y', y).attr('width', size).attr('height', size)
        icons.selectAll('use').on('click', editIcon)
      }

      for (let w = 0; w < ports.length; w++) {
        if (!ports[w]) continue
        if (ports[w].length < 2) continue
        const onIsland = []
        for (let i = 0; i < ports[w].length; i++) {
          const cell = ports[w][i]
          const fn = self.cells[cell].fn
          if (onIsland[fn] === undefined) onIsland[fn] = []
          onIsland[fn].push(cell)
        }

        for (let fn = 0; fn < onIsland.length; fn++) {
          if (!onIsland[fn]) continue
          if (onIsland[fn].length < 2) continue
          const start = onIsland[fn][0]
          const paths = findOceanPaths(start, -1)

          for (let h = 1; h < onIsland[fn].length; h++) {
            // routes from all ports on island to 1st port on island
            restorePath(onIsland[fn][h], start, 'ocean', paths)
          }

          // inter-island routes
          for (let c = fn + 1; c < onIsland.length; c++) {
            if (!onIsland[c]) continue
            if (!onIsland[c].length) continue
            if (onIsland[fn].length > 3) {
              const end = onIsland[c][0]
              restorePath(end, start, 'ocean', paths)
            }
          }

          if (self.features[w].border && !self.features[fn].border && onIsland[fn].length > 5) {
            // encircle the island
            onIsland[fn].sort(function(a, b) {return self.cells[b].cost - self.cells[a].cost})
            for (let a = 2; a < onIsland[fn].length && a < 10; a++) {
              const from = onIsland[fn][1], to = onIsland[fn][a]
              const dist = Math.hypot(self.cells[from].data[0] - self.cells[to].data[0],
                self.cells[from].data[1] - self.cells[to].data[1])
              const distPath = getPathDist(from, to)
              if (distPath > dist * 4 + 10) {
                const totalCost = self.cells[from].cost + self.cells[to].cost
                const pathsAdd = findOceanPaths(from, to)
                if (self.cells[to].cost < totalCost) {
                  restorePath(to, from, 'ocean', pathsAdd)
                  break
                }
              }
            }
          }

        }

      }
      console.timeEnd('generateOceanRoutes')
    }

    function findLandPath(start, end, type) {
      // A* algorithm
      const queue = new PriorityQueue({
        comparator: function(a, b) {
          return a.p - b.p
        }
      })
      const cameFrom = []
      const costTotal = []
      costTotal[start] = 0
      queue.queue({e: start, p: 0})
      while (queue.length > 0) {
        const next = queue.dequeue().e
        if (next === end) {break}
        const pol = self.cells[next]
        pol.neighbors.forEach(function(e) {
          if (self.cells[e].height >= 20) {
            let cost = self.cells[e].height / 100 * 2
            if (self.cells[e].path && type === 'main') {
              cost = 0.15
            } else {
              if (typeof e.manor === 'undefined') {cost += 0.1}
              if (typeof e.river !== 'undefined') {cost -= 0.1}
              if (self.cells[e].harbor) {cost *= 0.3}
              if (self.cells[e].path) {cost *= 0.5}
              cost +=
                Math.hypot(self.cells[e].data[0] - pol.data[0], self.cells[e].data[1] - pol.data[1]) / 30
            }
            const costNew = costTotal[next] + cost
            if (!cameFrom[e] || costNew < costTotal[e]) { //
              costTotal[e] = costNew
              cameFrom[e] = next
              const dist = Math.hypot(self.cells[e].data[0] - self.cells[end].data[0],
                self.cells[e].data[1] - self.cells[end].data[1]) / 15
              const priority = costNew + dist
              queue.queue({e, p: priority})
            }
          }
        })
      }
      return cameFrom
    }

    function findOceanPaths(start, end) {
      const queue = new PriorityQueue({comparator: function(a, b) {return a.p - b.p}})
      let next
      const cameFrom = [], costTotal = []
      cameFrom[start] = 'no', costTotal[start] = 0
      queue.queue({e: start, p: 0})
      while (queue.length > 0 && next !== end) {
        next = queue.dequeue().e
        const pol = self.cells[next]
        pol.neighbors.forEach(function(e) {
          if (self.cells[e].ctype < 0 || self.cells[e].haven === next) {
            let cost = 1
            if (self.cells[e].ctype > 0) cost += 100
            if (self.cells[e].ctype < -1) {
              const dist = Math.hypot(self.cells[e].data[0] - pol.data[0],
                self.cells[e].data[1] - pol.data[1])
              cost += 50 + dist * 2
            }
            if (self.cells[e].path && self.cells[e].ctype < 0) cost *= 0.8
            const costNew = costTotal[next] + cost
            if (!cameFrom[e]) {
              costTotal[e] = costNew
              self.cells[e].cost = costNew
              cameFrom[e] = next
              queue.queue({e, p: costNew})
            }
          }
        })
      }
      return cameFrom
    }

    function getPathDist(start, end) {
      const queue = new PriorityQueue({
        comparator: function(a, b) {
          return a.p - b.p
        }
      })
      let next, costNew
      const cameFrom = []
      const costTotal = []
      cameFrom[start] = 'no'
      costTotal[start] = 0
      queue.queue({e: start, p: 0})
      while (queue.length > 0 && next !== end) {
        next = queue.dequeue().e
        const pol = self.cells[next]
        pol.neighbors.forEach(function(e) {
          if (self.cells[e].path && (self.cells[e].ctype === -1 || self.cells[e].haven === next)) {
            const dist = Math.hypot(self.cells[e].data[0] - pol.data[0], self.cells[e].data[1] - pol.data[1])
            costNew = costTotal[next] + dist
            if (!cameFrom[e]) {
              costTotal[e] = costNew
              cameFrom[e] = next
              queue.queue({e, p: costNew})
            }
          }
        })
      }
      return costNew
    }

    function restorePath(end, start, type, from) {
      let path = [], current = end
      const limit = 1000
      let prev = self.cells[end]
      if (type === 'ocean' || !prev.path) {
        path.push({scX: prev.data[0], scY: prev.data[1], i: end})
      }
      if (!prev.path) {prev.path = 1}
      for (let i = 0; i < limit; i++) {
        current = from[current]
        let cur = self.cells[current]
        if (!cur) {break}
        if (cur.path) {
          cur.path += 1
          path.push({scX: cur.data[0], scY: cur.data[1], i: current})
          prev = cur
          drawPath()
        } else {
          cur.path = 1
          if (prev) {path.push({scX: prev.data[0], scY: prev.data[1], i: prev.index})}
          prev = undefined
          path.push({scX: cur.data[0], scY: cur.data[1], i: current})
        }
        if (current === start || !from[current]) {break}
      }
      drawPath()

      function drawPath() {
        if (path.length > 1) {
          // mark crossroades
          if (type === 'main' || type === 'small') {
            const plus = type === 'main' ? 4 : 2
            const f = self.cells[path[0].i]
            if (f.path > 1) {
              if (!f.crossroad) {f.crossroad = 0}
              f.crossroad += plus
            }
            const t = self.cells[(path[path.length - 1].i)]
            if (t.path > 1) {
              if (!t.crossroad) {t.crossroad = 0}
              t.crossroad += plus
            }
          }
          // draw path segments
          let line = lineGen(path)
          line = round(line, 1)
          let id = 0 // to create unique route id
          if (type === 'main') {
            id = roads.selectAll('path').size()
            roads.append('path').attr('d', line).attr('id', 'road' + id).on('click', editRoute)
          } else if (type === 'small') {
            id = trails.selectAll('path').size()
            trails.append('path').attr('d', line).attr('id', 'trail' + id).on('click', editRoute)
          } else if (type === 'ocean') {
            id = searoutes.selectAll('path').size()
            searoutes.append('path').attr('d', line).attr('id', 'searoute' + id)
                     .on('click', editRoute)
          }
        }
        path = []
      }
    }

    // Append burg elements
    function drawManors() {
      console.time('drawManors')
      const capitalIcons = burgIcons.select('#capitals')
      const capitalLabels = burgLabels.select('#capitals')
      const townIcons = burgIcons.select('#towns')
      const townLabels = burgLabels.select('#towns')
      const capitalSize = capitalIcons.attr('size') || 1
      const townSize = townIcons.attr('size') || 0.5
      capitalIcons.selectAll('*').remove()
      capitalLabels.selectAll('*').remove()
      townIcons.selectAll('*').remove()
      townLabels.selectAll('*').remove()

      for (let i = 0; i < self.manors.length; i++) {
        const x = self.manors[i].x, y = self.manors[i].y
        const name = self.manors[i].name
        const ic = i < self.states.length ? capitalIcons : townIcons
        const lb = i < self.states.length ? capitalLabels : townLabels
        const size = i < self.states.length ? capitalSize : townSize
        ic.append('circle').attr('id', 'burg' + i).attr('data-id', i).attr('cx', x).attr('cy', y)
          .attr('r', size).on('click', editBurg)
        lb.append('text').attr('data-id', i).attr('x', x).attr('y', y).attr('dy', '-0.35em')
          .text(name).on('click', editBurg)
      }
      console.timeEnd('drawManors')
    }

    // get settlement and country names based on option selected
    function getNames() {
      console.time('getNames')
      // if names source is an external resource
      if (namesInput.value === '1') {
        const request = new XMLHttpRequest()
        const url = 'https://archivist.xalops.com/archivist-core/api/name/settlement?count='
        request.open('GET', url + self.manors.length, true)
        request.onload = function() {
          const names = JSON.parse(request.responseText)
          for (let i = 0; i < self.manors.length; i++) {
            self.manors[i].name = names[i]
            burgLabels.select('[data-id=\'' + i + '\']').text(names[i])
            if (i < self.states.length) {
              self.states[i].name = generateStateName(i)
              labels.select('#countries').select('#regionLabel' + i).text(self.states[i].name)
            }
          }
          console.log(names)
        }
        request.send(null)
      }

      if (namesInput.value !== '0') return
      for (let i = 0; i < self.manors.length; i++) {
        const culture = self.manors[i].culture
        self.manors[i].name = generateName(culture)
        if (i < self.states.length) self.states[i].name = generateStateName(i)
      }
      console.timeEnd('getNames')
    }

    // generate random name using Markov's chain
    function generateName(culture, base) {
      if (base === undefined) {
        if (!self.cultures[culture]) {
          console.error('culture ' + culture + ' is not defined. Will load default cultures and set first culture')
          self.generateCultures()
          culture = 0
        }
        base = self.cultures[culture].base
      }
      if (!self.nameBases[base]) {
        console.error('self.nameBases ' + base + ' is not defined. Will load default names data and first base')
        if (!self.nameBases[0]) self.resetNames()
        base = 0
      }
      const method = self.nameBases[base].method
      const error = function(base) {
        tip('Names data for base ' + self.nameBases[base].name + ' is incorrect. Please fix in Namesbase Editor')
        editNamesbase()
      }

      if (method === 'selection') {
        if (self.nameBases[base].names.length < 1) {
          error(base)
          return
        }
        const rnd = _.random(self.nameBases[base].names.length - 1)
        return self.nameBases[base].names[rnd]
      }

      const data = self.chains[base]
      if (data === undefined || data[' '] === undefined) {
        error(base)
        return
      }
      const max = self.nameBases[base].max
      const min = self.nameBases[base].min
      const d = self.nameBases[base].d
      let word = '', variants = data[' ']
      if (variants === undefined) {
        error(base)
        return
      }
      let cur = variants[_.random(variants.length - 1)]
      for (let i = 0; i < 21; i++) {
        if (cur === ' ' && Math.random() < 0.8) {
          // space means word end, but we don't want to end if word is too short
          if (word.length < min) {
            word = ''
            variants = data[' ']
          } else {break}
        } else {
          const l = method === 'let-to-syl' && cur.length > 1 ? cur[cur.length - 1] : cur
          variants = data[l]
          // word is getting too long, restart
          word += cur // add current el to word
          if (word.length > max) word = ''
        }
        if (variants === undefined) {
          error(base)
          return
        }
        cur = variants[_.random(variants.length - 1)]
      }
      // very rare case, let's just select a random name
      if (word.length < 2)
        word = self.nameBases[base].names[_.random(self.nameBases[base].names.length - 1)]

      // do not allow multi-word name if word is foo short or not allowed for culture
      if (word.includes(' ')) {
        let words = word.split(' ')
        if (Math.random() > self.nameBases[base].m) {word = words.join('')} else {
          for (let i = 0; i < words.length; i++) {
            if (words[i].length < 2) {
              if (!i) words[1] = words[0] + words[1]
              if (i) words[i - 1] += words[i]
              words.splice(i, 1)
              i--
            }
          }
          word = words.join(' ')
        }
      }

      // parse word to get a final name
      return [...word].reduce(function(r, c, i, data) {
        if (c === ' ') {
          if (!r.length) return ''
          if (i + 1 === data.length) return r
        }
        if (!r.length) return c.toUpperCase()
        if (r.slice(-1) === ' ') return r + c.toUpperCase()
        if (c === data[i - 1]) {
          if (!d.includes(c)) return r
          if (c === data[i - 2]) return r
        }
        return r + c
      }, '')
    }

    // Define areas based on the closest manor to a polygon
    function defineRegions(withCultures) {
      console.time('defineRegions')
      const manorTree = d3.quadtree()
      self.manors.forEach(function(m) {if (m.region !== 'removed') manorTree.add([m.x, m.y])})

      const neutral = +neutralInput.value
      self.land.forEach(function(i) {
        if (i.manor !== undefined && self.manors[i.manor].region !== 'removed') {
          i.region = self.manors[i.manor].region
          if (withCultures && self.manors[i.manor].culture !== undefined) i.culture =
            self.manors[i.manor].culture
          return
        }
        const x = i.data[0], y = i.data[1]

        let dist = 100000, manor = null
        if (self.manors.length) {
          const c = manorTree.find(x, y)
          dist = Math.hypot(c[0] - x, c[1] - y)
          manor = getManorId(c)
        }
        if (dist > neutral / 2 || manor === null) {
          i.region = 'neutral'
          if (withCultures) {
            const closestCulture = self.cultureTree.find(x, y)
            i.culture = getCultureId(closestCulture)
          }
        } else {
          const cell = self.manors[manor].cell
          if (self.cells[cell].fn !== i.fn) {
            let minDist = dist * 3
            self.land.forEach(function(l) {
              if (l.fn === i.fn && l.manor !== undefined) {
                if (self.manors[l.manor].region === 'removed') return
                const distN = Math.hypot(l.data[0] - x, l.data[1] - y)
                if (distN < minDist) {
                  minDist = distN
                  manor = l.manor
                }
              }
            })
          }
          i.region = self.manors[manor].region
          if (withCultures) i.culture = self.manors[manor].culture
        }
      })
      console.timeEnd('defineRegions')
    }

    // Define areas cells
    function drawRegions() {
      console.time('drawRegions')
      labels.select('#countries').selectAll('*').remove()

      // arrays to store edge data
      const edges = [], coastalEdges = [], borderEdges = [], neutralEdges = []
      for (let a = 0; a < self.states.length; a++) {
        edges[a] = []
        coastalEdges[a] = []
      }
      const e = self.diagram.edges
      for (let i = 0; i < e.length; i++) {
        if (e[i] === undefined) continue
        const start = e[i][0].join(' ')
        const end = e[i][1].join(' ')
        const p = {start, end}
        if (e[i].left === undefined) {
          const r = e[i].right.index
          const rr = self.cells[r].region
          if (Number.isInteger(rr)) edges[rr].push(p)
          continue
        }
        if (e[i].right === undefined) {
          const l = e[i].left.index
          const lr = self.cells[l].region
          if (Number.isInteger(lr)) edges[lr].push(p)
          continue
        }
        const l = e[i].left.index
        const r = e[i].right.index
        const lr = self.cells[l].region
        const rr = self.cells[r].region
        if (lr === rr) continue
        if (Number.isInteger(lr)) {
          edges[lr].push(p)
          if (rr === undefined) {
            coastalEdges[lr].push(p)
          } else if (rr === 'neutral') {neutralEdges.push(p)}
        }
        if (Number.isInteger(rr)) {
          edges[rr].push(p)
          if (lr === undefined) {
            coastalEdges[rr].push(p)
          } else if (lr === 'neutral') {neutralEdges.push(p)} else if (Number.isInteger(
            lr)) {borderEdges.push(p)}
        }
      }
      edges.map(function(e, i) {
        if (e.length) {
          drawRegion(e, i)
          drawRegionCoast(coastalEdges[i], i)
        }
      })
      drawBorders(borderEdges, 'state')
      drawBorders(neutralEdges, 'neutral')
      console.timeEnd('drawRegions')
    }

    function drawRegion(edges, region) {
      let path = ''
      const array = []
      lineGen.curve(d3.curveLinear)
      while (edges.length > 2) {
        const edgesOrdered = [] // to store points in a correct order
        const start = edges[0].start
        let end = edges[0].end
        edges.shift()
        let spl = start.split(' ')
        edgesOrdered.push({scX: spl[0], scY: spl[1]})
        spl = end.split(' ')
        edgesOrdered.push({scX: spl[0], scY: spl[1]})
        for (let i = 0; end !== start && i < 2000; i++) {
          const next = $.grep(edges, function(e) {
            return (e.start == end || e.end == end)
          })
          if (next.length > 0) {
            if (next[0].start == end) {
              end = next[0].end
            } else if (next[0].end == end) {
              end = next[0].start
            }
            spl = end.split(' ')
            edgesOrdered.push({scX: spl[0], scY: spl[1]})
          }
          const rem = edges.indexOf(next[0])
          edges.splice(rem, 1)
        }
        path += lineGen(edgesOrdered) + 'Z '
        array[array.length] = edgesOrdered.map(function(e) {return [+e.scX, +e.scY]})
      }
      const color = self.states[region].color
      regions.append('path').attr('d', round(path, 1)).attr('fill', color)
             .attr('class', 'region' + region)
      array.sort(function(a, b) {return b.length - a.length})
      let capital = self.states[region].capital
      // add capital cell as a hole
      if (!isNaN(capital)) {
        const capitalCell = self.manors[capital].cell
        array.push(self.polygons[capitalCell])
      }
      const name = self.states[region].name
      const c = polylabel(array, 1.0) // pole of inaccessibility
      labels.select('#countries').append('text').attr('id', 'regionLabel' + region)
            .attr('x', Math.round(c[0])).attr('y', Math.round(c[1])).text(name).on('click', editLabel)
      self.states[region].area = Math.round(Math.abs(d3.polygonArea(array[0]))) // define region area
    }

    function drawRegionCoast(edges, region) {
      let path = ''
      while (edges.length > 0) {
        const edgesOrdered = [] // to store points in a correct order
        const start = edges[0].start
        let end = edges[0].end
        edges.shift()
        let spl = start.split(' ')
        edgesOrdered.push({scX: spl[0], scY: spl[1]})
        spl = end.split(' ')
        edgesOrdered.push({scX: spl[0], scY: spl[1]})
        let next = $.grep(edges, function(e) {
          return (e.start == end || e.end == end)
        })
        while (next.length > 0) {
          if (next[0].start == end) {
            end = next[0].end
          } else if (next[0].end == end) {
            end = next[0].start
          }
          spl = end.split(' ')
          edgesOrdered.push({scX: spl[0], scY: spl[1]})
          const rem = edges.indexOf(next[0])
          edges.splice(rem, 1)
          next = $.grep(edges, function(e) {return (e.start == end || e.end == end)})
        }
        path += lineGen(edgesOrdered)
      }
      const color = self.states[region].color
      regions.append('path').attr('d', round(path, 1)).attr('fill', 'none').attr('stroke', color)
             .attr('stroke-width', 5).attr('class', 'region' + region)
    }

    function drawBorders(edges, type) {
      let path = ''
      if (edges.length < 1) {return}
      while (edges.length > 0) {
        const edgesOrdered = [] // to store points in a correct order
        const start = edges[0].start
        let end = edges[0].end
        edges.shift()
        let spl = start.split(' ')
        edgesOrdered.push({scX: spl[0], scY: spl[1]})
        spl = end.split(' ')
        edgesOrdered.push({scX: spl[0], scY: spl[1]})
        let next = $.grep(edges, function(e) {
          return (e.start == end || e.end == end)
        })
        while (next.length > 0) {
          if (next[0].start == end) {
            end = next[0].end
          } else if (next[0].end == end) {
            end = next[0].start
          }
          spl = end.split(' ')
          edgesOrdered.push({scX: spl[0], scY: spl[1]})
          const rem = edges.indexOf(next[0])
          edges.splice(rem, 1)
          next = $.grep(edges, function(e) {return (e.start == end || e.end == end)})
        }
        path += lineGen(edgesOrdered)
      }
      if (type === 'state') {stateBorders.append('path').attr('d', round(path, 1))}
      if (type === 'neutral') {neutralBorders.append('path').attr('d', round(path, 1))}
    }

    // generate region name
    function generateStateName(state) {
      let culture = null
      if (self.states[state]) if (self.manors[self.states[state].capital]) culture =
        self.manors[self.states[state].capital].culture
      let name = 'NameIdontWant'
      if (Math.random() < 0.85 || culture === null) {
        // culture is random if capital is not yet defined
        if (culture === null) culture = _.random(self.cultures.length - 1)
        // try to avoid too long words as a basename
        for (let i = 0; i < 20 && name.length > 7; i++) {
          name = generateName(culture)
        }
      } else {
        name = self.manors[state].name
      }
      const base = self.cultures[culture].base

      let addSuffix = false
      // handle special cases
      const e = name.slice(-2)
      if (base === 5 && (e === 'sk' || e === 'ev' || e === 'ov')) {
        // remove -sk and -ev/-ov for Ruthenian
        name = name.slice(0, -2)
        addSuffix = true
      } else if (name.length > 5 && base === 1 && name.slice(-3) === 'ton') {
        // remove -ton ending for English
        name = name.slice(0, -3)
        addSuffix = true
      } else if (name.length > 6 && name.slice(-4) === 'berg') {
        // remove -berg ending for any
        name = name.slice(0, -4)
        addSuffix = true
      } else if (base === 12) {
        // Japanese ends on vowels
        if (VOWELS.includes(name.slice(-1))) return name
        return name + 'u'
      } else if (base === 10) {
        // Korean has "guk" suffix
        if (name.slice(-3) === 'guk') return name
        if (name.slice(-1) === 'g') name = name.slice(0, -1)
        if (Math.random() < 0.2 && name.length < 7) name = name + 'guk' // 20% for "guk"
        return name
      } else if (base === 11) {
        // Chinese has "guo" suffix
        if (name.slice(-3) === 'guo') return name
        if (name.slice(-1) === 'g') name = name.slice(0, -1)
        if (Math.random() < 0.3 && name.length < 7) name = name + ' Guo' // 30% for "guo"
        return name
      }

      // define if suffix should be used
      let vowel = VOWELS.includes(name.slice(-1)) // last char is vowel
      if (vowel && name.length > 3) {
        if (Math.random() < 0.85) {
          if (VOWELS.includes(name.slice(-2, -1))) {
            name = name.slice(0, -2)
            addSuffix = true // 85% for vv
          } else if (Math.random() < 0.7) {
            name = name.slice(0, -1)
            addSuffix = true // ~60% for cv
          }
        }
      } else if (Math.random() < 0.6) {
        addSuffix = true // 60% for cc and vc
      }

      if (addSuffix === false) return name
      let suffix = 'ia' // common latin suffix
      const rnd = Math.random()
      if (rnd < 0.05 && base === 3) suffix = 'terra' // 5% "terra" for Italian
      else if (rnd < 0.05 && base === 4) suffix = 'terra' // 5% "terra" for Spanish
      else if (rnd < 0.05 && base == 2) suffix = 'terre' // 5% "terre" for French
      else if (rnd < 0.5 && base == 0) suffix = 'land' // 50% "land" for German
      else if (rnd < 0.4 && base == 1) suffix = 'land' // 40% "land" for English
      else if (rnd < 0.3 && base == 6) suffix = 'land' // 30% "land" for Nordic
      else if (rnd < 0.1 && base == 7) suffix = 'eia' // 10% "eia" for Greek ("ia" is also Greek)
      else if (rnd < 0.4 && base == 9) suffix = 'maa' // 40% "maa" for Finnic
      if (name.slice(-1 * suffix.length) === suffix) return name // no suffix if name already ends with it
      if (name.slice(-1) === suffix.charAt(0)) name = name.slice(0, -1) // remove name last letter if it's a suffix first letter
      return name + suffix
    }

    // re-calculate cultures
    function recalculateCultures(fullRedraw) {
      console.time('recalculateCultures')
      // For each capital find closest culture and assign it to capital
      self.states.forEach(function(s) {
        if (s.capital === 'neutral' || s.capital === 'select') return
        const capital = self.manors[s.capital]
        const c = self.cultureTree.find(capital.x, capital.y)
        capital.culture = getCultureId(c)
      })

      // For each town if distance to its capital > neutral / 2,
      // assign closest culture to the town; else assign capital's culture
      const manorTree = d3.quadtree()
      const neutral = +neutralInput.value
      self.manors.forEach(function(m) {
        if (m.region === 'removed') return
        manorTree.add([m.x, m.y])
        if (m.region === 'neutral') {
          const culture = self.cultureTree.find(m.x, m.y)
          m.culture = getCultureId(culture)
          return
        }
        const c = self.states[m.region].capital
        if (c !== 'neutral' && c !== 'select') {
          const dist = Math.hypot(m.x - self.manors[c].x, m.y - self.manors[c].y)
          if (dist <= neutral / 5) {
            m.culture = self.manors[c].culture
            return
          }
        }
        const culture = self.cultureTree.find(m.x, m.y)
        m.culture = getCultureId(culture)
      })

      // For each land cell if distance to closest manor > neutral / 2,
      // assign closest culture to the cell; else assign manors's culture
      const changed = []
      self.land.forEach(function(i) {
        const x = i.data[0], y = i.data[1]
        const c = manorTree.find(x, y)
        const culture = i.culture
        const dist = Math.hypot(c[0] - x, c[1] - y)
        let manor = getManorId(c)
        if (dist > neutral / 2 || manor === undefined) {
          const closestCulture = self.cultureTree.find(i.data[0], i.data[1])
          i.culture = getCultureId(closestCulture)
        } else {
          const cell = self.manors[manor].cell
          if (self.cells[cell].fn !== i.fn) {
            let minDist = dist * 3
            self.land.forEach(function(l) {
              if (l.fn === i.fn && l.manor !== undefined) {
                if (self.manors[l.manor].region === 'removed') return
                const distN = Math.hypot(l.data[0] - x, l.data[1] - y)
                if (distN < minDist) {
                  minDist = distN
                  manor = l.manor
                }
              }
            })
          }
          i.culture = self.manors[manor].culture
        }
        // re-color cells
        if (i.culture !== culture || fullRedraw) {
          const clr = self.cultures[i.culture].color
          cults.select('#cult' + i.index).attr('fill', clr).attr('stroke', clr)
        }
      })
      console.timeEnd('recalculateCultures')
    }

    // get culture Id from center coordinates
    function getCultureId(c) {
      for (let i = 0; i < self.cultures.length; i++) {
        if (self.cultures[i].center[0] === c[0] && self.cultures[i].center[1] === c[1])
          return i
      }
    }

    // get manor Id from center coordinates
    function getManorId(c) {
      for (let i = 0; i < self.manors.length; i++) {
        if (self.manors[i].x === c[0]) if (self.manors[i].y === c[1]) return i
      }
    }

    // focus on coorditanes, cell or burg provided in searchParams
    function focusOn() {
      if (self.params.get('from') === 'MFCG') {
        // focus on burg from MFCG
        findBurgForMFCG()
        return
      }
      let s = self.params.get('scale') || 8
      let x = self.params.get('x')
      let y = self.params.get('y')
      let c = self.params.get('cell')
      if (c !== null) {
        x = self.cells[+c].data[0]
        y = self.cells[+c].data[1]
      }
      let b = self.params.get('burg')
      if (b !== null) {
        x = self.manors[+b].x
        y = self.manors[+b].y
      }
      if (x !== null && y !== null) zoomTo(x, y, s, 1600)
    }

    // find burg from MFCG and focus on it
    function findBurgForMFCG() {
      if (!self.manors.length) {
        console.error('No burgs generated. Cannot select a burg for MFCG')
        return
      }
      const size = +self.params.get('size')
      let coast = +self.params.get('coast')
      let port = +self.params.get('port')
      let river = +self.params.get('river')
      let selection = defineSelection(coast, port, river)
      if (!selection.length) selection = defineSelection(coast, !port, !river)
      if (!selection.length) selection = defineSelection(!coast, 0, !river)
      if (!selection.length) selection = self.manors[0] // select first if nothing is found
      if (!selection.length) {
        console.error('Cannot find a burg for MFCG')
        return
      }

      function defineSelection(coast, port, river) {
        let selection = []
        if (port && river) selection = $.grep(self.manors,
          function(e) {return self.cells[e.cell].port !== undefined && self.cells[e.cell].river !== undefined})
        else if (!port && coast && river) selection = $.grep(self.manors,
          function(e) {return self.cells[e.cell].port === undefined && self.cells[e.cell].ctype === 1 && self.cells[e.cell].river !== undefined})
        else if (!coast && !river) selection = $.grep(self.manors,
          function(e) {return self.cells[e.cell].ctype !== 1 && self.cells[e.cell].river === undefined})
        else if (!coast && river) selection = $.grep(self.manors,
          function(e) {return self.cells[e.cell].ctype !== 1 && self.cells[e.cell].river !== undefined})
        else if (coast && !river) selection = $.grep(self.manors,
          function(e) {return self.cells[e.cell].ctype === 1 && self.cells[e.cell].river === undefined})
        return selection
      }

      // select a burg with closes population from selection
      const selected = d3.scan(selection,
        function(a, b) {return Math.abs(a.population - size) - Math.abs(b.population - size)})
      const burg = selection[selected].i
      if (size && burg !== undefined) {self.manors[burg].population = size} else {return}

      // focus on found burg
      const label = burgLabels.select('[data-id=\'' + burg + '\']')
      if (!label.size()) {
        console.error('Cannot find a label for MFCG burg ' + burg)
        return
      }
      tip('Here stands the glorious city of ' + self.manors[burg].name, true)
      label.classed('drag', true).on('mouseover', function() {
        d3.select(this).classed('drag', false)
        tip('', true)
      })
      const x = +label.attr('x'), y = +label.attr('y')
      zoomTo(x, y, 8, 1600)
    }

    // draw Cultures
    function toggleCultures() {
      if (cults.selectAll('path').size() == 0) {
        self.land.map(function(i) {
          const color = self.cultures[i.culture].color
          cults.append('path')
               .attr('d', 'M' + self.polygons[i.index].join('L') + 'Z')
               .attr('id', 'cult' + i.index)
               .attr('fill', color)
               .attr('stroke', color)
        })
      } else {
        cults.selectAll('path').remove()
      }
    }

    // clean data to get rid of redundand info
    function cleanData() {
      console.time('cleanData')
      self.cells.map(function(c) {
        delete c.cost
        delete c.used
        delete c.coastX
        delete c.coastY
        if (c.ctype === undefined) delete c.ctype
        if (c.lake === undefined) delete c.lake
        c.height = Math.trunc(c.height)
        if (c.height >= 20) c.flux = _.round(c.flux, 2)
      })
      // restore layers if they was turned on
      if (!$('#toggleHeight').hasClass('buttonoff') && !terrs.selectAll('path')
                                                             .size()) toggleHeight()
      if (!$('#toggleCultures').hasClass('buttonoff') && !cults.selectAll('path')
                                                               .size()) toggleCultures()
      closeDialogs()
      invokeActiveZooming()
      console.timeEnd('cleanData')
    }

    // close all dialogs except stated
    function closeDialogs(except) {
      except = except || '#except'
      $('.dialog:visible').not(except).each(function(e) {
        $(this).dialog('close')
      })
    }

    // change transparency for modal windowa
    function changeDialogsTransparency(v) {
      localStorage.setItem('transparency', v)
      const alpha = (100 - +v) / 100
      const optionsColor = 'rgba(164, 139, 149, ' + alpha + ')' // purple-red
      const dialogsColor = 'rgba(255, 255, 255, ' + alpha + ')' // white
      document.getElementById('options').style.backgroundColor = optionsColor
      document.getElementById('dialogs').style.backgroundColor = dialogsColor
    }

    // Draw the water flux system (for dubugging)
    function toggleFlux() {
      const colorFlux = d3.scaleSequential(d3chromatic.interpolateBlues)
      if (terrs.selectAll('path').size() == 0) {
        self.land.map(function(i) {
          terrs.append('path')
               .attr('d', 'M' + self.polygons[i.index].join('L') + 'Z')
               .attr('fill', colorFlux(0.1 + i.flux))
               .attr('stroke', colorFlux(0.1 + i.flux))
        })
      } else {
        terrs.selectAll('path').remove()
      }
    }

    // Draw the Relief (need to create more beautiness)
    function drawRelief() {
      console.time('drawRelief')
      let h, count, rnd, cx, cy, swampCount = 0
      const hills = terrain.select('#hills')
      const mounts = terrain.select('#mounts')
      const swamps = terrain.select('#swamps')
      const forests = terrain.select('#forests')
      terrain.selectAll('g').selectAll('g').remove()
      // sort the land to Draw the top element first (reduce the elements overlapping)
      self.land.sort(compareY)
      for (let i = 0; i < self.land.length; i++) {
        if (self.land[i].river) continue // no icons on rivers
        const cell = self.land[i].index
        const p = d3.polygonCentroid(self.polygons[cell]) // polygon centroid point
        if (p === undefined) continue // something is wrong with data
        const height = self.land[i].height
        const area = self.land[i].area
        if (height >= 70) {
          // mount icon
          h = (height - 55) * 0.12
          for (let c = 0, a = area; Math.random() < a / 50; c++, a -= 50) {
            if (self.polygons[cell][c] === undefined) break
            const g = mounts.append('g').attr('data-cell', cell)
            if (c < 2) {
              cx = p[0] - h / 100 * (1 - c / 10) - c * 2
              cy = p[1] + h / 400 + c
            } else {
              const p2 = self.polygons[cell][c]
              cx = (p[0] * 1.2 + p2[0] * 0.8) / 2
              cy = (p[1] * 1.2 + p2[1] * 0.8) / 2
            }
            rnd = Math.random() * 0.8 + 0.2
            let mount = 'M' + cx + ',' + cy + ' L' + (cx + h / 3 + rnd) + ',' + (cy - h / 4 - rnd * 1.2) + ' L' + (cx + h / 1.1) + ',' + (cy - h) + ' L' + (cx + h + rnd) + ',' + (cy - h / 1.2 + rnd) + ' L' + (cx + h * 2) + ',' + cy
            let shade = 'M' + cx + ',' + cy + ' L' + (cx + h / 3 + rnd) + ',' + (cy - h / 4 - rnd * 1.2) + ' L' + (cx + h / 1.1) + ',' + (cy - h) + ' L' + (cx + h / 1.5) + ',' + cy
            let dash = 'M' + (cx - 0.1) + ',' + (cy + 0.3) + ' L' + (cx + 2 * h + 0.1) + ',' + (cy + 0.3)
            dash +=
              'M' + (cx + 0.4) + ',' + (cy + 0.6) + ' L' + (cx + 2 * h - 0.3) + ',' + (cy + 0.6)
            g.append('path').attr('d', round(mount, 1)).attr('stroke', '#5c5c70')
            g.append('path').attr('d', round(shade, 1)).attr('fill', '#999999')
            g.append('path').attr('d', round(dash, 1)).attr('class', 'strokes')
          }
        } else if (height > 50) {
          // hill icon
          h = (height - 40) / 10
          if (h > 1.7) h = 1.7
          for (let c = 0, a = area; Math.random() < a / 30; c++, a -= 30) {
            if (self.land[i].ctype === 1 && c > 0) break
            if (self.polygons[cell][c] === undefined) break
            const g = hills.append('g').attr('data-cell', cell)
            if (c < 2) {
              cx = p[0] - h - c * 1.2
              cy = p[1] + h / 4 + c / 1.6
            } else {
              const p2 = self.polygons[cell][c]
              cx = (p[0] * 1.2 + p2[0] * 0.8) / 2
              cy = (p[1] * 1.2 + p2[1] * 0.8) / 2
            }
            let hill = 'M' + cx + ',' + cy + ' Q' + (cx + h) + ',' + (cy - h) + ' ' + (cx + 2 * h) + ',' + cy
            let shade = 'M' + (cx + 0.6 * h) + ',' + (cy + 0.1) + ' Q' + (cx + h * 0.95) + ',' + (cy - h * 0.91) + ' ' + (cx + 2 * h * 0.97) + ',' + cy
            let dash = 'M' + (cx - 0.1) + ',' + (cy + 0.2) + ' L' + (cx + 2 * h + 0.1) + ',' + (cy + 0.2)
            dash +=
              'M' + (cx + 0.4) + ',' + (cy + 0.4) + ' L' + (cx + 2 * h - 0.3) + ',' + (cy + 0.4)
            g.append('path').attr('d', round(hill, 1)).attr('stroke', '#5c5c70')
            g.append('path').attr('d', round(shade, 1)).attr('fill', 'white')
            g.append('path').attr('d', round(dash, 1)).attr('class', 'strokes')
          }
        }

        // swamp icons
        if (height >= 21 && height < 22 && swampCount < +swampinessInput.value && self.land[i].used != 1) {
          const g = swamps.append('g').attr('data-cell', cell)
          swampCount++
          self.land[i].used = 1
          let swamp = drawSwamp(p[0], p[1])
          self.land[i].neighbors.forEach(function(e) {
            if (self.cells[e].height >= 20 && self.cells[e].height < 30 && !self.cells[e].river && self.cells[e].used != 1) {
              self.cells[e].used = 1
              swamp += drawSwamp(self.cells[e].data[0], self.cells[e].data[1])
            }
          })
          g.append('path').attr('d', round(swamp, 1))
        }

        // forest icons
        if (Math.random() < height / 100 && height >= 22 && height < 48) {
          for (let c = 0, a = area; Math.random() < a / 15; c++, a -= 15) {
            if (self.land[i].ctype === 1 && c > 0) break
            if (self.polygons[cell][c] === undefined) break
            const g = forests.append('g').attr('data-cell', cell)
            if (c === 0) {
              cx = _.round(p[0] - 1 - Math.random(), 1)
              cy = p[1] - 2
            } else {
              const p2 = self.polygons[cell][c]
              if (c > 1) {
                const dist = Math.hypot(p2[0] - self.polygons[cell][c - 1][0],
                  p2[1] - self.polygons[cell][c - 1][1])
                if (dist < 2) continue
              }
              cx = (p[0] * 0.5 + p2[0] * 1.5) / 2
              cy = (p[1] * 0.5 + p2[1] * 1.5) / 2 - 1
            }
            const forest = 'M' + cx + ',' + cy + ' q-1,0.8 -0.05,1.25 v0.75 h0.1 v-0.75 q0.95,-0.47 -0.05,-1.25 z '
            const light = 'M' + cx + ',' + cy + ' q-1,0.8 -0.05,1.25 h0.1 q0.95,-0.47 -0.05,-1.25 z '
            const shade = 'M' + cx + ',' + cy + ' q-1,0.8 -0.05,1.25 q-0.2,-0.55 0,-1.1 z '
            g.append('path').attr('d', forest)
            g.append('path').attr('d', light).attr('fill', 'white').attr('stroke', 'none')
            g.append('path').attr('d', shade).attr('fill', '#999999').attr('stroke', 'none')
          }
        }
      }
      terrain.selectAll('g').selectAll('g').on('click', editReliefIcon)
      console.timeEnd('drawRelief')
    }

    function addReliefIcon(height, type, cx, cy, cell) {
      const g = terrain.select('#' + type).append('g').attr('data-cell', cell)
      if (type === 'mounts') {
        const h = height >= 0.7 ? (height - 0.55) * 12 : 1.8
        const rnd = Math.random() * 0.8 + 0.2
        let mount = 'M' + cx + ',' + cy + ' L' + (cx + h / 3 + rnd) + ',' + (cy - h / 4 - rnd * 1.2) + ' L' + (cx + h / 1.1) + ',' + (cy - h) + ' L' + (cx + h + rnd) + ',' + (cy - h / 1.2 + rnd) + ' L' + (cx + h * 2) + ',' + cy
        let shade = 'M' + cx + ',' + cy + ' L' + (cx + h / 3 + rnd) + ',' + (cy - h / 4 - rnd * 1.2) + ' L' + (cx + h / 1.1) + ',' + (cy - h) + ' L' + (cx + h / 1.5) + ',' + cy
        let dash = 'M' + (cx - 0.1) + ',' + (cy + 0.3) + ' L' + (cx + 2 * h + 0.1) + ',' + (cy + 0.3)
        dash += 'M' + (cx + 0.4) + ',' + (cy + 0.6) + ' L' + (cx + 2 * h - 0.3) + ',' + (cy + 0.6)
        g.append('path').attr('d', round(mount, 1)).attr('stroke', '#5c5c70')
        g.append('path').attr('d', round(shade, 1)).attr('fill', '#999999')
        g.append('path').attr('d', round(dash, 1)).attr('class', 'strokes')
      }
      if (type === 'hills') {
        let h = height > 0.5 ? (height - 0.4) * 10 : 1.2
        if (h > 1.8) h = 1.8
        let hill = 'M' + cx + ',' + cy + ' Q' + (cx + h) + ',' + (cy - h) + ' ' + (cx + 2 * h) + ',' + cy
        let shade = 'M' + (cx + 0.6 * h) + ',' + (cy + 0.1) + ' Q' + (cx + h * 0.95) + ',' + (cy - h * 0.91) + ' ' + (cx + 2 * h * 0.97) + ',' + cy
        let dash = 'M' + (cx - 0.1) + ',' + (cy + 0.2) + ' L' + (cx + 2 * h + 0.1) + ',' + (cy + 0.2)
        dash += 'M' + (cx + 0.4) + ',' + (cy + 0.4) + ' L' + (cx + 2 * h - 0.3) + ',' + (cy + 0.4)
        g.append('path').attr('d', round(hill, 1)).attr('stroke', '#5c5c70')
        g.append('path').attr('d', round(shade, 1)).attr('fill', 'white')
        g.append('path').attr('d', round(dash, 1)).attr('class', 'strokes')
      }
      if (type === 'swamps') {
        const swamp = drawSwamp(cx, cy)
        g.append('path').attr('d', round(swamp, 1))
      }
      if (type === 'forests') {
        const rnd = Math.random()
        const h = rnd * 0.4 + 0.6
        const forest = 'M' + cx + ',' + cy + ' q-1,0.8 -0.05,1.25 v0.75 h0.1 v-0.75 q0.95,-0.47 -0.05,-1.25 z '
        const light = 'M' + cx + ',' + cy + ' q-1,0.8 -0.05,1.25 h0.1 q0.95,-0.47 -0.05,-1.25 z '
        const shade = 'M' + cx + ',' + cy + ' q-1,0.8 -0.05,1.25 q-0.2,-0.55 0,-1.1 z '
        g.append('path').attr('d', forest)
        g.append('path').attr('d', light).attr('fill', 'white').attr('stroke', 'none')
        g.append('path').attr('d', shade).attr('fill', '#999999').attr('stroke', 'none')
      }
      g.on('click', editReliefIcon)
      return g
    }

    function compareY(a, b) {
      if (a.data[1] > b.data[1]) return 1
      if (a.data[1] < b.data[1]) return -1
      return 0
    }

    function drawSwamp(x, y) {
      const h = 0.6
      let line = ''
      for (let c = 0; c < 3; c++) {
        let cx
        let cy
        if (c == 0) {
          cx = x
          cy = y - 0.5 - Math.random()
        }
        if (c == 1) {
          cx = x + h + Math.random()
          cy = y + h + Math.random()
        }
        if (c == 2) {
          cx = x - h - Math.random()
          cy = y + 2 * h + Math.random()
        }
        line +=
          'M' + cx + ',' + cy + ' H' + (cx - h / 6) + ' M' + cx + ',' + cy + ' H' + (cx + h / 6) + ' M' + cx + ',' + cy + ' L' + (cx - h / 3) + ',' + (cy - h / 2) + ' M' + cx + ',' + cy + ' V' + (cy - h / 1.5) + ' M' + cx + ',' + cy + ' L' + (cx + h / 3) + ',' + (cy - h / 2)
        line +=
          'M' + (cx - h) + ',' + cy + ' H' + (cx - h / 2) + ' M' + (cx + h / 2) + ',' + cy + ' H' + (cx + h)
      }
      return line
    }

    // Complete the map for the "customize" mode
    function getMap() {
      if (self.customization !== 1) {
        tip('Nothing to complete! Click on "Edit" or "Clear all" to enter a heightmap customization mode', null, 'error')
        return
      }
      if (+landmassCounter.innerHTML < 150) {
        tip('Insufficient land area! Please add more land cells to complete the map', null, 'error')
        return
      }
      exitCustomization()
      console.time('TOTAL')
      markFeatures()
      drawOcean()
      elevateLakes()
      resolveDepressionsPrimary()
      reGraph()
      resolveDepressionsSecondary()
      flux()
      addLakes()
      if (!changeHeights.checked) restoreCustomHeights()
      drawCoastline()
      drawRelief()
      const keepData = self.states.length && self.manors.length
      if (keepData) {
        restoreRegions()
      } else {
        self.generateCultures()
        manorsAndRegions()
      }
      cleanData()
      console.timeEnd('TOTAL')
    }

    // Add support "click to add" button events
    $('#customizeTab').click(clickToAdd)

    function clickToAdd() {
      if (self.modules.clickToAdd) return
      self.modules.clickToAdd = true

      // add label on click
      $('#addLabel').click(function() {
        if ($(this).hasClass('pressed')) {
          $('.pressed').removeClass('pressed')
          restoreDefaultEvents()
        } else {
          $('.pressed').removeClass('pressed')
          $(this).addClass('pressed')
          closeDialogs('.stable')
          viewbox.style('cursor', 'crosshair').on('click', addLabelOnClick)
        }
      })

      function addLabelOnClick() {
        const point = d3.mouse(this)
        const x = _.round(point[0], 2), y = _.round(point[1], 2)

        // get culture in clicked point to generate a name
        const closest = self.find(x, y)
        const culture = self.cultureTree.data().indexOf(closest) || 0
        const name = generateName(culture)

        let group = labels.select('#addedLabels')
        if (!group.size()) {
          group = labels.append('g').attr('id', 'addedLabels')
                        .attr('fill', '#3e3e4b').attr('opacity', 1)
                        .attr('font-family', 'Almendra SC').attr('data-font', 'Almendra+SC')
                        .attr('font-size', 18).attr('data-size', 18)
        }
        let id = 'label' + Date.now().toString().slice(7)
        group.append('text').attr('id', id).attr('x', x).attr('y', y).text(name)
             .on('click', editLabel)

        if (d3.event.shiftKey === false) {
          $('#addLabel').removeClass('pressed')
          restoreDefaultEvents()
        }
      }

      // add burg on click
      $('#addBurg').click(function() {
        if ($(this).hasClass('pressed')) {
          $('.pressed').removeClass('pressed')
          restoreDefaultEvents()
          tip('', true)
        } else {
          $('.pressed').removeClass('pressed')
          $(this).attr('data-state', -1).addClass('pressed')
          $('#burgAdd, #burgAddfromEditor').addClass('pressed')
          viewbox.style('cursor', 'crosshair').on('click', addBurgOnClick)
          tip('Click on map to place burg icon with a label. Hold Shift to place several', true)
        }
      })

      function addBurgOnClick() {
        const point = d3.mouse(this)
        const index = getIndex(point)
        const x = _.round(point[0], 2), y = _.round(point[1], 2)

        // get culture in clicked point to generate a name
        let culture = self.cells[index].culture
        if (culture === undefined) culture = 0
        const name = generateName(culture)

        if (self.cells[index].height < 20) {
          tip('Cannot place burg in the water! Select a land cell', null, 'error')
          return
        }
        if (self.cells[index].manor !== undefined) {
          tip('There is already a burg in this cell. Please select a free cell', null, 'error')
          $('#grid').fadeIn()
          d3.select('#toggleGrid').classed('buttonoff', false)
          return
        }
        const i = self.manors.length
        const size = burgIcons.select('#towns').attr('size')
        burgIcons.select('#towns').append('circle').attr('id', 'burg' + i).attr('data-id', i)
                 .attr('cx', x).attr('cy', y).attr('r', size).on('click', editBurg)
        burgLabels.select('#towns').append('text').attr('data-id', i).attr('x', x).attr('y', y)
                  .attr('dy', '-0.35em').text(name).on('click', editBurg)
        invokeActiveZooming()

        if (d3.event.shiftKey === false) {
          $('#addBurg, #burgAdd, #burgAddfromEditor').removeClass('pressed')
          restoreDefaultEvents()
        }

        let region, state = +$('#addBurg').attr('data-state')
        if (state !== -1) {
          region = self.states[state].capital === 'neutral' ? 'neutral' : state
          const oldRegion = self.cells[index].region
          if (region !== oldRegion) {
            self.cells[index].region = region
            redrawRegions()
          }
        } else {
          region = self.cells[index].region
          state = region === 'neutral' ? self.states.length - 1 : region
        }
        self.cells[index].manor = i
        let score = self.cells[index].score
        if (score <= 0) {score = _.round(Math.random(), 2)}
        if (self.cells[index].crossroad) {score += self.cells[index].crossroad} // crossroads
        if (self.cells[index].confluence) {score += Math.pow(self.cells[index].confluence, 0.3)} // confluences
        if (self.cells[index].port !== undefined) {score *= 3} // port-capital
        const population = _.round(score, 1)
        self.manors.push({i, cell: index, x, y, region, culture, name, population})
        recalculateStateData(state)
        updateCountryEditors()
        tip('', true)
      }

      // add river on click
      $('#addRiver').click(function() {
        if ($(this).hasClass('pressed')) {
          $('.pressed').removeClass('pressed')
          unselect()
        } else {
          $('.pressed').removeClass('pressed')
          unselect()
          $(this).addClass('pressed')
          closeDialogs('.stable')
          viewbox.style('cursor', 'crosshair').on('click', addRiverOnClick)
          tip('Click on map to place new river or extend an existing one', true)
        }
      })

      function addRiverOnClick() {
        const point = d3.mouse(this)
        const index = self.diagram.find(point[0], point[1]).index
        let cell = self.cells[index]
        if (cell.river || cell.height < 20) return
        const dataRiver = [] // to store river points
        const last = $('#rivers > path').last()
        const river = last.length ? +last.attr('id').slice(5) + 1 : 0
        cell.flux = 0.85
        while (cell) {
          cell.river = river
          const x = cell.data[0], y = cell.data[1]
          dataRiver.push({x, y, cell: index})
          const nHeights = []
          cell.neighbors.forEach(function(e) {nHeights.push(self.cells[e].height)})
          const minId = nHeights.indexOf(d3.min(nHeights))
          const min = cell.neighbors[minId]
          const tx = self.cells[min].data[0], ty = self.cells[min].data[1]
          if (self.cells[min].height < 20) {
            const px = (x + tx) / 2
            const py = (y + ty) / 2
            dataRiver.push({x: px, y: py, cell: index})
            cell = undefined
          } else {
            if (self.cells[min].river === undefined) {
              self.cells[min].flux += cell.flux
              cell = self.cells[min]
            } else {
              const r = self.cells[min].river
              const riverEl = $('#river' + r)
              const riverCells = $.grep(self.land, function(e) {return e.river === r})
              riverCells.sort(function(a, b) {return b.height - a.height})
              const riverCellsUpper = $.grep(riverCells,
                function(e) {return e.height > self.cells[min].height})
              if (dataRiver.length > riverCellsUpper.length) {
                // new river is more perspective
                const avPrec = _.round(precInput.value / Math.sqrt(self.cells.length), 2)
                let dataRiverMin = []
                riverCells.map(function(c) {
                  if (c.height < self.cells[min].height) {
                    self.cells[c.index].river = undefined
                    self.cells[c.index].flux = avPrec
                  } else {
                    dataRiverMin.push({x: c.data[0], y: c.data[1], cell: c.index})
                  }
                })
                self.cells[min].flux += cell.flux
                if (self.cells[min].confluence) {
                  self.cells[min].confluence += riverCellsUpper.length
                } else {self.cells[min].confluence = riverCellsUpper.length}
                cell = self.cells[min]
                // redraw old river's upper part or remove if small
                if (dataRiverMin.length > 1) {
                  var riverAmended = amendRiver(dataRiverMin, 1)
                  var d = drawRiver(riverAmended, 1.3, 1)
                  riverEl.attr('d', d).attr('data-width', 1.3).attr('data-increment', 1)
                } else {
                  riverEl.remove()
                  dataRiverMin.map(function(c) {self.cells[c.cell].river = undefined})
                }
              } else {
                if (self.cells[min].confluence) {
                  self.cells[min].confluence += dataRiver.length
                } else {self.cells[min].confluence = dataRiver.length}
                self.cells[min].flux += cell.flux
                dataRiver.push({x: tx, y: ty, cell: min})
                cell = undefined
              }
            }
          }
        }
        const rndFactor = 0.2 + Math.random() * 1.6 // random factor in range 0.2-1.8
        var riverAmended = amendRiver(dataRiver, rndFactor)
        var d = drawRiver(riverAmended, 1.3, 1)
        rivers.append('path').attr('d', d).attr('id', 'river' + river)
              .attr('data-width', 1.3).attr('data-increment', 1).on('click', editRiver)
      }

      // add relief icon on click
      $('#addRelief').click(function() {
        if ($(this).hasClass('pressed')) {
          $('.pressed').removeClass('pressed')
          restoreDefaultEvents()
        } else {
          $('.pressed').removeClass('pressed')
          $(this).addClass('pressed')
          closeDialogs('.stable')
          viewbox.style('cursor', 'crosshair').on('click', addReliefOnClick)
          tip('Click on map to place relief icon. Hold Shift to place several', true)
        }
      })

      function addReliefOnClick() {
        const point = d3.mouse(this)
        const index = getIndex(point)
        const height = self.cells[index].height
        if (height < 20) {
          tip('Cannot place icon in the water! Select a land cell')
          return
        }

        const x = _.round(point[0], 2), y = _.round(point[1], 2)
        const type = reliefGroup.value
        addReliefIcon(height / 100, type, x, y, index)

        if (d3.event.shiftKey === false) {
          $('#addRelief').removeClass('pressed')
          restoreDefaultEvents()
        }
        tip('', true)
      }

      // add route on click
      $('#addRoute').click(function() {
        if (!self.modules.editRoute) editRoute()
        $('#routeNew').click()
      })

      // add marker on click
      $('#addMarker').click(function() {
        if ($(this).hasClass('pressed')) {
          $('.pressed').removeClass('pressed')
          restoreDefaultEvents()
        } else {
          $('.pressed').removeClass('pressed')
          $(this).addClass('pressed')
          $('#markerAdd').addClass('pressed')
          viewbox.style('cursor', 'crosshair').on('click', addMarkerOnClick)
        }
      })

      function addMarkerOnClick() {
        const point = d3.mouse(this)
        let x = _.round(point[0], 2), y = _.round(point[1], 2)
        let selected = markerSelectGroup.value
        let valid = selected && d3.select('#defs-markers').select('#' + selected).size() === 1
        let symbol = valid ? '#' + selected : '#marker0'
        let desired = valid ? markers.select('[data-id=\'' + symbol + '\']').attr('data-size') : 1
        if (isNaN(desired)) desired = 1
        let id = 'marker' + Date.now().toString().slice(7) // unique id
        let size = desired * 5 + 25 / scale

        markers.append('use').attr('id', id).attr('xlink:href', symbol).attr('data-id', symbol)
               .attr('data-x', x).attr('data-y', y).attr('x', x - size / 2).attr('y', y - size)
               .attr('data-size', desired).attr('width', size).attr('height', size)
               .on('click', editMarker)

        if (d3.event.shiftKey === false) {
          $('#addMarker, #markerAdd').removeClass('pressed')
          restoreDefaultEvents()
        }
      }

    }

    // return cell / polly Index or error
    function getIndex(point) {
      let c = self.diagram.find(point[0], point[1])
      if (!c) {
        console.error('Cannot find closest cell for points' + point[0] + ', ' + point[1])
        return
      }
      return c.index
    }

    // re-calculate data for a particular state
    function recalculateStateData(state) {
      const s = self.states[state] || self.states[self.states.length - 1]
      if (s.capital === 'neutral') state = 'neutral'
      const burgs = $.grep(self.manors, function(e) {return e.region === state})
      s.burgs = burgs.length
      let burgsPop = 0 // get summ of all burgs population
      burgs.map(function(b) {burgsPop += b.population})
      s.urbanPopulation = _.round(burgsPop, 1)
      const regionCells = $.grep(self.cells, function(e) {return (e.region === state)})
      let cellsPop = 0, area = 0
      regionCells.map(function(c) {
        cellsPop += c.pop
        area += c.area
      })
      s.cells = regionCells.length
      s.area = Math.round(area)
      s.ruralPopulation = _.round(cellsPop, 1)
    }

    function changeSelectedOnClick() {
      const point = d3.mouse(this)
      const index = self.diagram.find(point[0], point[1]).index
      if (self.cells[index].height < 20) return
      $('.selected').removeClass('selected')
      let color

      // select state
      if (self.customization === 2) {
        const assigned = regions.select('#temp').select('path[data-cell=\'' + index + '\']')
        let s = assigned.size() ? assigned.attr('data-state') : self.cells[index].region
        if (s === 'neutral') s = self.states.length - 1
        color = self.states[s].color
        if (color === 'neutral') color = 'white'
        $('#state' + s).addClass('selected')
      }

      // select culture
      if (self.customization === 4) {
        const assigned = cults.select('#cult' + index)
        const c = assigned.attr('data-culture') !== null
                  ? +assigned.attr('data-culture')
                  : self.cells[index].culture
        color = self.cultures[c].color
        $('#culture' + c).addClass('selected')
      }

      debug.selectAll('.circle').attr('stroke', color)
    }

    // fetch default fonts if not done before
    function loadDefaultFonts() {
      if (!$('link[href="fonts.css"]').length) {
        $('head').append('<link rel="stylesheet" type="text/css" href="fonts.css">')
        const fontsToAdd = ['Amatic+SC:700', 'IM+Fell+English', 'Great+Vibes', 'MedievalSharp', 'Metamorphous',
                            'Nova+Script', 'Uncial+Antiqua', 'Underdog', 'Caesar+Dressing', 'Bitter', 'Yellowtail', 'Montez',
                            'Shadows+Into+Light', 'Fredericka+the+Great', 'Orbitron', 'Dancing+Script:700',
                            'Architects+Daughter', 'Kaushan+Script', 'Gloria+Hallelujah', 'Satisfy', 'Comfortaa:700', 'Cinzel']
        fontsToAdd.forEach(function(f) {if (FONTS.indexOf(f) === -1) FONTS.push(f)})
        updateFontOptions()
      }
    }

    function fetchFonts(url) {
      return new Promise((resolve, reject) => {
        if (url === '') {
          tip(
            'Use a direct link to any @font-face declaration or just font name to fetch from Google Fonts')
          return
        }
        if (url.indexOf('http') === -1) {
          url = url.replace(url.charAt(0), url.charAt(0).toUpperCase()).split(' ').join('+')
          url = 'https://fonts.googleapis.com/css?family=' + url
        }
        const fetched = addFonts(url).then(fetched => {
          if (fetched === undefined) {
            tip('Cannot fetch font for this value!')
            return
          }
          if (fetched === 0) {
            tip('Already in the fonts list!')
            return
          }
          updateFontOptions()
          if (fetched === 1) {
            tip('Font ' + FONTS[FONTS.length - 1] + ' is fetched')
          } else if (fetched > 1) {
            tip(fetched + ' fonts are added to the list')
          }
          resolve(fetched)
        })
      })
    }

    function addFonts(url) {
      $('head').append('<link rel="stylesheet" type="text/css" href="' + url + '">')
      return fetch(url)
        .then(resp => resp.text())
        .then(text => {
          let s = document.createElement('style')
          s.innerHTML = text
          document.head.appendChild(s)
          let styleSheet = Array.prototype.filter.call(
            document.styleSheets,
            sS => sS.ownerNode === s)[0]
          let FontRule = rule => {
            let family = rule.style.getPropertyValue('font-family')
            let font = family.replace(/['"]+/g, '').replace(/ /g, '+')
            let weight = rule.style.getPropertyValue('font-weight')
            if (weight !== '400') font += ':' + weight
            if (FONTS.indexOf(font) == -1) {
              FONTS.push(font)
              fetched++
            }
          }
          let fetched = 0
          for (let r of styleSheet.cssRules) {FontRule(r)}
          document.head.removeChild(s)
          return fetched
        })
        .catch(function() {})
    }

    // Update font list for Label and Burg Editors
    function updateFontOptions() {
      labelFontSelect.innerHTML = ''
      for (let i = 0; i < FONTS.length; i++) {
        const opt = document.createElement('option')
        opt.value = i
        const font = FONTS[i].split(':')[0].replace(/\+/g, ' ')
        opt.style.fontFamily = opt.innerHTML = font
        labelFontSelect.add(opt)
      }
      burgSelectDefaultFont.innerHTML = labelFontSelect.innerHTML
    }

    // Save in .map format, based on FileSystem API
    function saveMap() {
      console.time('saveMap')
      // data convention: 0 - params; 1 - all points; 2 - cells; 3 - manors; 4 - states;
      // 5 - svg; 6 - options (see below); 7 - cultures;
      // 8 - empty (former self.nameBases); 9 - empty (former self.nameBases); 10 - heights; 11 - notes;
      // size stats: points = 6%, cells = 36%, manors and states = 2%, svg = 56%;
      const date = new Date()
      const dateString = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
      const license = 'File can be loaded in azgaar.github.io/Fantasy-Map-Generator'
      const params = version + '|' + license + '|' + dateString + '|' + self.seed
      const options = self.customization + '|' +
                      distanceUnit.value + '|' + distanceScale.value + '|' + areaUnit.value + '|' +
                      barSize.value + '|' + barLabel.value + '|' + barBackOpacity.value + '|' + barBackColor.value + '|' +
                      populationRate.value + '|' + urbanization.value

      // set zoom / transform values to default
      svg.attr('width', self.graphWidth).attr('height', self.graphHeight)
      const transform = d3.zoomTransform(svg.node())
      viewbox.attr('transform', null)
      const oceanBack = ocean.select('rect')
      const oceanShift = [oceanBack.attr('x'), oceanBack.attr('y'), oceanBack.attr(
        'width'), oceanBack.attr('height')]
      oceanBack.attr('x', 0).attr('y', 0).attr('width', self.graphWidth).attr('height', self.graphHeight)

      const svg_xml = (new XMLSerializer()).serializeToString(svg.node())
      const line = '\r\n'
      let data = params + line + JSON.stringify(self.points) + line + JSON.stringify(self.cells) + line
      data += JSON.stringify(self.manors) + line + JSON.stringify(self.states) + line + svg_xml + line + options + line
      data += JSON.stringify(self.cultures) + line + '' + line + '' + line + self.heights + line + JSON.stringify(self.notes) + line
      const dataBlob = new Blob([data], {type: 'text/plain'})
      const dataURL = window.URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.download = 'fantasy_map_' + Date.now() + '.map'
      link.href = dataURL
      document.body.appendChild(link)
      link.click()

      // restore initial values
      svg.attr('width', self.svgWidth).attr('height', self.svgHeight)
      zoom.transform(svg, transform)
      oceanBack.attr('x', oceanShift[0]).attr('y', oceanShift[1]).attr('width', oceanShift[2])
               .attr('height', oceanShift[3])

      console.timeEnd('saveMap')
      window.setTimeout(function() {window.URL.revokeObjectURL(dataURL)}, 4000)
    }

    // Map Loader based on FileSystem API
    $('#mapToLoad').change(function() {
      console.time('loadMap')
      closeDialogs()
      const fileToLoad = this.files[0]
      this.value = ''
      uploadFile(fileToLoad)
    })

    function uploadFile(file, callback) {
      console.time('loadMap')
      const fileReader = new FileReader()
      fileReader.onload = function(fileLoadedEvent) {
        const dataLoaded = fileLoadedEvent.target.result
        const data = dataLoaded.split('\r\n')
        // data convention: 0 - params; 1 - all points; 2 - cells; 3 - manors; 4 - states;
        // 5 - svg; 6 - options; 7 - cultures; 8 - none; 9 - none; 10 - heights; 11 - notes;
        const params = data[0].split('|')
        const mapVersion = params[0] || data[0]
        if (mapVersion !== version) {
          let message = `The Map version `
          // mapVersion reference was not added to downloaded map before v. 0.52b, so I cannot support really old files
          if (mapVersion.length <= 10) {
            message += `(${mapVersion}) does not match the Generator version (${version}). The map will be auto-updated.
                  In case of critical issues you may send the .map file
                  <a href="mailto:maxganiev@yandex.ru?Subject=Map%20update%20request" target="_blank">to me</a>
                  or just keep using
                  <a href="https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog" target="_blank">an appropriate version</a>
                  of the Generator`
          } else if (!mapVersion || parseFloat(mapVersion) < 0.54) {
            message += `you are trying to load is too old and cannot be updated. Please re-create the map or just keep using
                  <a href="https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog" target="_blank">an archived version</a>
                  of the Generator. Please note the Generator is still on demo and a lot of changes are being made every month`
          }
          alertMessage.innerHTML = message
          $('#alert').dialog({
            title: 'Warning', buttons: {
              OK: function() {
                loadDataFromMap(data)
              }
            }
          })
        } else {loadDataFromMap(data)}
        if (mapVersion.length > 10) {console.error('Cannot load map') }
      }
      fileReader.readAsText(file, 'UTF-8')
      if (callback) {callback()}
    }

    function loadDataFromMap(data) {
      closeDialogs()
      // update seed
      const params = data[0].split('|')
      if (params[3]) {
        self.seed = params[3]
        $('#optionsSeed').value = self.seed
      }

      // get options
      if (data[0] === '0.52b' || data[0] === '0.53b') {
        self.customization = 0
      } else if (data[6]) {
        const options = data[6].split('|')
        self.customization = +options[0] || 0
        if (options[1]) distanceUnit.value = options[1]
        if (options[2]) distanceScale.value = options[2]
        if (options[3]) areaUnit.value = options[3]
        if (options[4]) barSize.value = options[4]
        if (options[5]) barLabel.value = options[5]
        if (options[6]) barBackOpacity.value = options[6]
        if (options[7]) barBackColor.value = options[7]
        if (options[8]) populationRate.value = options[8]
        if (options[9]) urbanization.value = options[9]
      }

      // replace old svg
      svg.remove()
      if (data[0] === '0.52b' || data[0] === '0.53b') {
        self.states = [] // no states data in old maps
        document.body.insertAdjacentHTML('afterbegin', data[4])
      } else {
        self.states = JSON.parse(data[4])
        document.body.insertAdjacentHTML('afterbegin', data[5])
      }

      svg = d3.select('svg')

      // always change graph size to the size of loaded map
      const nWidth = +svg.attr('width')
      const nHeight = +svg.attr('height')
      self.setDimensions('graph', nHeight, nWidth)
      voronoi = d3.voronoi().extent([[-1, -1], [self.graphWidth + 1, self.graphHeight + 1]])
      zoom.translateExtent([[0, 0], [self.graphWidth, self.graphHeight]])
          .scaleExtent([1, 20])
          .scaleTo(svg, 1)
      viewbox.attr('transform', null)

      // temporary fit loaded svg element to current canvas size
      svg.attr('width', self.svgWidth).attr('height', self.svgHeight)
      if (nWidth !== self.svgWidth || nHeight !== self.svgHeight) {
        alertMessage.innerHTML =
          `The loaded map has size ${nWidth} x ${nHeight} pixels, while the current canvas size is ${self.svgWidth} x ${self.svgHeight} pixels.
                            Click "Rescale" to fit the map to the current canvas size. Click "OK" to browse the map without rescaling`
        $('#alert').dialog({
          title: 'Map size conflict',
          buttons: {
            Rescale: function() {
              applyLoadedData(data)
              // rescale loaded map
              const xRatio = self.svgWidth / nWidth
              const yRatio = self.svgHeight / nHeight
              const scaleTo = _.round(Math.min(xRatio, yRatio), 4)
              // calculate frames to scretch ocean background
              const extent = (100 / scaleTo) + '%'
              const xShift = (nWidth * scaleTo - self.svgWidth) / 2 / scaleTo
              const yShift = (nHeight * scaleTo - self.svgHeight) / 2 / scaleTo
              svg.select('#ocean').selectAll('rect').attr('x', xShift).attr('y', yShift)
                 .attr('width', extent).attr('height', extent)
              zoom.translateExtent([[0, 0], [nWidth, nHeight]])
                  .scaleExtent([scaleTo, 20])
                  .scaleTo(svg, scaleTo)
              $(this).dialog('close')
            },
            OK: function() {
              changeMapSize()
              applyLoadedData(data)
              $(this).dialog('close')
            }
          }
        })
      } else {
        applyLoadedData(data)
      }
    }

    function applyLoadedData(data) {
      // redefine variables
      defs = svg.select('#deftemp')
      viewbox = svg.select('#viewbox')
      ocean = viewbox.select('#ocean')
      oceanLayers = ocean.select('#oceanLayers')
      oceanPattern = ocean.select('#oceanPattern')
      landmass = viewbox.select('#landmass')
      grid = viewbox.select('#grid')
      overlay = viewbox.select('#overlay')
      terrs = viewbox.select('#terrs')
      cults = viewbox.select('#cults')
      routes = viewbox.select('#routes')
      roads = routes.select('#roads')
      trails = routes.select('#trails')
      rivers = viewbox.select('#rivers')
      terrain = viewbox.select('#terrain')
      regions = viewbox.select('#regions')
      borders = viewbox.select('#borders')
      stateBorders = borders.select('#stateBorders')
      neutralBorders = borders.select('#neutralBorders')
      coastline = viewbox.select('#coastline')
      lakes = viewbox.select('#lakes')
      searoutes = routes.select('#searoutes')
      labels = viewbox.select('#labels')
      icons = viewbox.select('#icons')
      markers = viewbox.select('#markers')
      ruler = viewbox.select('#ruler')
      debug = viewbox.select('#debug')

      if (!d3.select('#defs-markers').size()) {
        let symbol = '<g id="defs-markers"><symbol id="marker0" viewBox="0 0 30 30"><path d="M6,19 l9,10 L24,19" fill="#000000" stroke="none"></path><circle cx="15" cy="15" r="10" stroke-width="1" stroke="#000000" fill="#ffffff"></circle><text x="50%" y="50%" fill="#000000" stroke-width="0" stroke="#000000" font-size="22px" dominant-baseline="central">?</text></symbol></g>'
        let cont = document.getElementsByTagName('defs')
        cont[0].insertAdjacentHTML('afterbegin', symbol)
        markers = viewbox.append('g').attr('id', 'markers')
      }

      // version control: ensure required groups are created with correct data
      if (!labels.select('#burgLabels').size()) {
        labels.append('g').attr('id', 'burgLabels')
        $('#labels #capitals, #labels #towns').detach().appendTo($('#burgLabels'))
      }

      if (!icons.select('#burgIcons').size()) {
        icons.append('g').attr('id', 'burgIcons')
        $('#icons #capitals, #icons #towns').detach().appendTo($('#burgIcons'))
        icons.select('#burgIcons').select('#capitals').attr('size', 1).attr('fill-opacity', .7)
             .attr('stroke-opacity', 1)
        icons.select('#burgIcons').select('#towns').attr('size', .5).attr('fill-opacity', .7)
             .attr('stroke-opacity', 1)
      }

      icons.selectAll('g').each(function() {
        const size = this.getAttribute('font-size')
        if (size === null || size === undefined) return
        this.removeAttribute('font-size')
        this.setAttribute('size', size)
      })

      icons.select('#burgIcons').selectAll('circle').each(function() {
        this.setAttribute('r', this.parentNode.getAttribute('size'))
      })

      icons.selectAll('use').each(function() {
        const size = this.parentNode.getAttribute('size')
        if (size === null || size === undefined) return
        this.setAttribute('width', size)
        this.setAttribute('height', size)
      })

      if (!labels.select('#countries').size()) {
        labels.append('g').attr('id', 'countries')
              .attr('fill', '#3e3e4b').attr('opacity', 1)
              .attr('font-family', 'Almendra SC').attr('data-font', 'Almendra+SC')
              .attr('font-size', 14).attr('data-size', 14)
      }

      burgLabels = labels.select('#burgLabels')
      burgIcons = icons.select('#burgIcons')

      // restore events
      svg.call(zoom)
      restoreDefaultEvents()
      viewbox.on('touchmove mousemove', moved)
      overlay.selectAll('*').call(d3.drag().on('start', elementDrag))
      terrain.selectAll('g').selectAll('g').on('click', editReliefIcon)
      labels.selectAll('text').on('click', editLabel)
      icons.selectAll('circle, path, use').on('click', editIcon)
      burgLabels.selectAll('text').on('click', editBurg)
      burgIcons.selectAll('circle, path, use').on('click', editBurg)
      rivers.selectAll('path').on('click', editRiver)
      routes.selectAll('path').on('click', editRoute)
      markers.selectAll('use').on('click', editMarker)
      svg.select('#scaleBar').call(d3.drag().on('start', elementDrag)).on('click', editScale)
      ruler.selectAll('g').call(d3.drag().on('start', elementDrag))
      ruler.selectAll('g').selectAll('text').on('click', removeParent)
      ruler.selectAll('.opisometer').selectAll('circle')
           .call(d3.drag().on('start', opisometerEdgeDrag))
      ruler.selectAll('.linear').selectAll('circle:not(.center)')
           .call(d3.drag().on('drag', rulerEdgeDrag))
      ruler.selectAll('.linear').selectAll('circle.center')
           .call(d3.drag().on('drag', rulerCenterDrag))

      // update data
      const newPoints = []
      self.riversData = []
      self.queue = []
      self.elSelected = ''
      self.points = JSON.parse(data[1])
      self.cells = JSON.parse(data[2])
      self.manors = JSON.parse(data[3])

      if (data[7])
        self.setCultures({cultures: JSON.parse(data[7])})
      else if (data[7] === undefined)
        self.generateCultures()
      self.verifyBases()

      if (data[11])
        self.notes = JSON.parse(data[11])

      const graphSizeAdj = 90 / Math.sqrt(self.cells.length) // adjust to different graphSize

      // cells validations
      self.cells.forEach(function(c, d) {
        // collect points
        newPoints.push(c.data)

        // update old 0-1 height range to a new 0-100 range
        if (c.height < 1) c.height = Math.trunc(c.height * 100)
        if (c.height === 1 && c.region !== undefined && c.flux !== undefined) c.height = 100

        // check if there are any unavailable cultures
        if (c.culture > self.cultures.length - 1) {
          const center = [c.data[0], c.data[1]]
          const cult = {name: 'AUTO_' + c.culture, color: '#ff0000', base: 0, center}
          self.cultures.push(cult)
        }

        if (c.height >= 20) {
          if (!self.polygons[d] || !self.polygons[d].length) return
          // calculate area
          if (c.area === undefined || isNaN(c.area)) {
            const area = d3.polygonArea(self.polygons[d])
            c.area = _.round(Math.abs(area), 2)
          }
          // calculate population
          if (c.pop === undefined || isNaN(c.pop)) {
            let population = 0
            const elevationFactor = Math.pow((100 - c.height) / 100, 3)
            population = elevationFactor * c.area * graphSizeAdj
            if (c.region === 'neutral') population *= 0.5
            c.pop = _.round(population, 1)
          }
          // if culture is undefined, set to 0
          if (c.culture === undefined || isNaN(c.culture)) c.culture = 0
        }
      })

      self.land = $.grep(self.cells, function(e) {return (e.height >= 20)})
      calculateVoronoi(newPoints)

      // get heights Uint8Array
      if (data[10]) {self.heights = new Uint8Array(data[10].split(','))} else {
        self.heights = new Uint8Array(self.points.length)
        for (let i = 0; i < self.points.length; i++) {
          const cell = self.diagram.find(self.points[i][0], self.points[i][1]).index
          self.heights[i] = self.cells[cell].height
        }
      }

      // restore Heightmap customization mode
      if (self.customization === 1) {
        optionsTrigger.click()
        $('#customizeHeightmap, #customizationMenu').slideDown()
        $('#openEditor').slideUp()
        updateHistory()
        customizeTab.click()
        paintBrushes.click()
        tip('The map is in Heightmap customization mode. Please finalize the Heightmap', true)
      }
      // restore Country Edition mode
      if (self.customization === 2 || self.customization === 3) tip(
        'The map is in Country Edition mode. Please complete the assignment', true)

      // restore layers state
      d3.select('#toggleCultures').classed('buttonoff', !cults.selectAll('path').size())
      d3.select('#toggleHeight').classed('buttonoff', !terrs.selectAll('path').size())
      d3.select('#toggleCountries').classed('buttonoff', regions.style('display') === 'none')
      d3.select('#toggleRivers').classed('buttonoff', rivers.style('display') === 'none')
      d3.select('#toggleOcean').classed('buttonoff', oceanPattern.style('display') === 'none')
      d3.select('#toggleRelief').classed('buttonoff', terrain.style('display') === 'none')
      d3.select('#toggleBorders').classed('buttonoff', borders.style('display') === 'none')
      d3.select('#toggleIcons').classed('buttonoff', icons.style('display') === 'none')
      d3.select('#toggleLabels').classed('buttonoff', labels.style('display') === 'none')
      d3.select('#toggleRoutes').classed('buttonoff', routes.style('display') === 'none')
      d3.select('#toggleGrid').classed('buttonoff', grid.style('display') === 'none')

      // update map to support some old versions and fetch fonts
      labels.selectAll('g').each(function(d) {
        const el = d3.select(this)
        if (el.attr('id') === 'burgLabels') return
        const font = el.attr('data-font')
        if (font && FONTS.indexOf(font) === -1) addFonts(
          'https://fonts.googleapis.com/css?family=' + font)
        if (!el.attr('data-size')) el.attr('data-size', +el.attr('font-size'))
        if (el.style('display') === 'none') el.node().style.display = null
      })

      invokeActiveZooming()
      console.timeEnd('loadMap')
    }

    // Hotkeys, see github.com/Azgaar/Fantasy-Map-Generator/wiki/Hotkeys
    d3.select('body').on('keydown', function() {
      const active = document.activeElement.tagName
      if (active === 'INPUT' || active === 'SELECT' || active === 'TEXTAREA') return
      const key = d3.event.keyCode
      const ctrl = d3.event.ctrlKey
      const p = d3.mouse(this)
      if (key === 117) $('#randomMap').click() // "F6" for new map
      else if (key === 27) closeDialogs() // Escape to close all dialogs
      else if (key === 79) optionsTrigger.click() // "O" to toggle options
      else if (key === 80) saveAsImage('png') // "P" to save as PNG
      else if (key === 83) saveAsImage('svg') // "S" to save as SVG
      else if (key === 77) saveMap() // "M" to save MAP file
      else if (key === 76) mapToLoad.click() // "L" to load MAP
      else if (key === 32) console.table(self.cells[self.diagram.find(p[0], p[1]).index]) // Space to log focused cell data
      else if (key === 192) console.log(self.cells) // "`" to log cells data
      else if (key === 66) console.table(self.manors) // "B" to log burgs data
      else if (key === 67) console.table(self.states) // "C" to log countries data
      else if (key === 70) console.table(self.features) // "F" to log features data
      else if (key === 37) zoom.translateBy(svg, 10, 0) // Left to scroll map left
      else if (key === 39) zoom.translateBy(svg, -10, 0) // Right to scroll map right
      else if (key === 38) zoom.translateBy(svg, 0, 10) // Up to scroll map up
      else if (key === 40) zoom.translateBy(svg, 0, -10) // Up to scroll map up
      else if (key === 107) zoom.scaleBy(svg, 1.2) // Plus to zoom map up
      else if (key === 109) zoom.scaleBy(svg, 0.8) // Minus to zoom map out
      else if (key === 48 || key === 96) resetZoom() // 0 to reset zoom
      else if (key === 49 || key === 97) zoom.scaleTo(svg, 1) // 1 to zoom to 1
      else if (key === 50 || key === 98) zoom.scaleTo(svg, 2) // 2 to zoom to 2
      else if (key === 51 || key === 99) zoom.scaleTo(svg, 3) // 3 to zoom to 3
      else if (key === 52 || key === 100) zoom.scaleTo(svg, 4) // 4 to zoom to 4
      else if (key === 53 || key === 101) zoom.scaleTo(svg, 5) // 5 to zoom to 5
      else if (key === 54 || key === 102) zoom.scaleTo(svg, 6) // 6 to zoom to 6
      else if (key === 55 || key === 103) zoom.scaleTo(svg, 7) // 7 to zoom to 7
      else if (key === 56 || key === 104) zoom.scaleTo(svg, 8) // 8 to zoom to 8
      else if (key === 57 || key === 105) zoom.scaleTo(svg, 9) // 9 to zoom to 9
      else if (key === 9) $('#updateFullscreen').click() // Tab to fit map to fullscreen
      else if (ctrl && key === 90) undo.click() // Ctrl + "Z" to toggle undo
      else if (ctrl && key === 89) redo.click() // Ctrl + "Y" to toggle undo
    })

    // move layers on mapLayers dragging (jquery sortable)
    function moveLayer(event, ui) {
      const el = getLayer(ui.item.attr('id'))
      if (el) {
        const prev = getLayer(ui.item.prev().attr('id'))
        const next = getLayer(ui.item.next().attr('id'))
        if (prev) {el.insertAfter(prev)} else if (next) {el.insertBefore(next)}
      }
    }

    // define connection between option layer buttons and actual svg groups
    function getLayer(id) {
      if (id === 'toggleGrid') {return $('#grid')}
      if (id === 'toggleOverlay') {return $('#overlay')}
      if (id === 'toggleHeight') {return $('#terrs')}
      if (id === 'toggleCultures') {return $('#cults')}
      if (id === 'toggleRoutes') {return $('#routes')}
      if (id === 'toggleRivers') {return $('#rivers')}
      if (id === 'toggleCountries') {return $('#regions')}
      if (id === 'toggleBorders') {return $('#borders')}
      if (id === 'toggleRelief') {return $('#terrain')}
      if (id === 'toggleLabels') {return $('#labels')}
      if (id === 'toggleIcons') {return $('#icons')}
    }

    // UI Button handlers
    $('button, a, li, i').on('click', function() {
      const id = this.id
      const parent = this.parentNode.id
      if (debug.selectAll('.tag').size()) {debug.selectAll('.tag, .line').remove()}
      if (id === 'toggleCountries') {$('#regions').fadeToggle()}
      if (id === 'toggleCultures') {toggleCultures()}
      if (id === 'toggleFlux') {toggleFlux()}
      if (parent === 'mapLayers' || parent === 'styleContent') {$(this).toggleClass('buttonoff')}
      if (id === 'randomMap' || id === 'regenerate') {
        changeSeed()
        exitCustomization()
        undraw()
        resetZoom(1000)
        generate()
        return
      }
      if (id === 'editCountries') editCountries()
      if (id === 'editCultures') editCultures()
      if (id === 'editScale' || id === 'editScaleCountries' || id === 'editScaleBurgs') editScale()
      if (id === 'countriesManually') {
        self.customization = 2
        tip('Click to select a country, drag the circle to re-assign', true)
        mockRegions()
        let temp = regions.append('g').attr('id', 'temp')
        $('#countriesBottom').children().hide()
        $('#countriesManuallyButtons').show()
        // highlight capital cells as it's not allowed to change capital's state that way
        self.states.map(function(s) {
          if (s.capital === 'neutral' || s.capital === 'select') return
          const capital = s.capital
          const index = self.manors[capital].cell
          temp.append('path')
              .attr('data-cell', index).attr('data-state', s.i)
              .attr('d', 'M' + self.polygons[index].join('L') + 'Z')
              .attr('fill', s.color).attr('stroke', 'red').attr('stroke-width', .7)
        })
        viewbox.style('cursor', 'crosshair').call(drag).on('click', changeSelectedOnClick)
      }
      if (id === 'countriesRegenerate') {
        self.customization = 3
        tip('Manually change "Expansion" value for a country or click on "Randomize" button',
          true)
        mockRegions()
        regions.append('g').attr('id', 'temp')
        $('#countriesBottom').children().hide()
        $('#countriesRegenerateButtons').show()
        $('.statePower, .icon-resize-full, .stateCells, .icon-check-empty').toggleClass('hidden')
        $('div[data-sortby=\'expansion\'],div[data-sortby=\'cells\']').toggleClass('hidden')
      }
      if (id === 'countriesManuallyComplete') {
        debug.selectAll('.circle').remove()
        const changedCells = regions.select('#temp').selectAll('path')
        let changedStates = []
        changedCells.each(function() {
          const el = d3.select(this)
          const cell = +el.attr('data-cell')
          let stateOld = self.cells[cell].region
          if (stateOld === 'neutral') {stateOld = self.states.length - 1}
          const stateNew = +el.attr('data-state')
          const region = self.states[stateNew].color === 'neutral' ? 'neutral' : stateNew
          self.cells[cell].region = region
          if (self.cells[cell].manor !== undefined) {self.manors[self.cells[cell].manor].region = region}
          changedStates.push(stateNew, stateOld)
        })
        changedStates = [...new Set(changedStates)]
        changedStates.map(function(s) {recalculateStateData(s)})
        const last = self.states.length - 1
        if (self.states[last].capital === 'neutral' && self.states[last].cells === 0) {
          $('#state' + last).remove()
          self.states.splice(-1)
        }
        $('#countriesManuallyCancel').click()
        if (changedStates.length) {editCountries()}
      }
      if (id === 'countriesManuallyCancel') {
        redrawRegions()
        debug.selectAll('.circle').remove()
        if (grid.style('display') === 'inline') {toggleGrid.click()}
        if (labels.style('display') === 'none') {toggleLabels.click()}
        $('#countriesBottom').children().show()
        $('#countriesManuallyButtons, #countriesRegenerateButtons').hide()
        $('.selected').removeClass('selected')
        $('div[data-sortby=\'expansion\'],.statePower, .icon-resize-full').addClass('hidden')
        $('div[data-sortby=\'cells\'],.stateCells, .icon-check-empty').removeClass('hidden')
        self.customization = 0
        restoreDefaultEvents()
      }
      if (id === 'countriesApply') {$('#countriesManuallyCancel').click()}
      if (id === 'countriesRandomize') {
        const mod = +powerInput.value * 2
        $('.statePower').each(function(e, i) {
          const state = +(this.parentNode.id).slice(5)
          if (self.states[state].capital === 'neutral') return
          const power = _.round(Math.random() * mod / 2 + 1, 1)
          $(this).val(power)
          $(this).parent().attr('data-expansion', power)
          self.states[state].power = power
        })
        regenerateCountries()
      }
      if (id === 'countriesAddM' || id === 'countriesAddR' || id === 'countriesAddG') {
        let i = self.states.length
        // move neutrals to the last line
        if (self.states[i - 1].capital === 'neutral') {
          self.states[i - 1].i = i
          i -= 1
        }
        var name = generateStateName(0)
        const color = colors20(i)
        self.states.push({
          i,
          color,
          name,
          capital: 'select',
          cells: 0,
          burgs: 0,
          urbanPopulation: 0,
          ruralPopulation: 0,
          area: 0,
          power: 1
        })
        self.states.sort(function(a, b) {return a.i - b.i})
        editCountries()
      }
      if (id === 'countriesRegenerateNames') {
        const editor = d3.select('#countriesBody')
        self.states.forEach(function(s) {
          if (s.capital === 'neutral') return
          s.name = generateStateName(s.i)
          labels.select('#regionLabel' + s.i).text(s.name)
          editor.select('#state' + s.i).select('.stateName').attr('value', s.name)
        })
      }
      if (id === 'countriesPercentage') {
        var el = $('#countriesEditor')
        if (el.attr('data-type') === 'absolute') {
          el.attr('data-type', 'percentage')
          const totalCells = self.land.length
          const totalBurgs = +countriesFooterBurgs.innerHTML
          let totalArea = countriesFooterArea.innerHTML
          totalArea = getInteger(totalArea.split(' ')[0])
          const totalPopulation = getInteger(countriesFooterPopulation.innerHTML)
          $('#countriesBody > .states').each(function() {
            const cells = Math.round($(this).attr('data-cells') / totalCells * 100)
            const burgs = Math.round($(this).attr('data-burgs') / totalBurgs * 100)
            const area = Math.round($(this).attr('data-area') / totalArea * 100)
            const population = Math.round($(this).attr('data-population') / totalPopulation * 100)
            $(this).children().filter('.stateCells').text(cells + '%')
            $(this).children().filter('.stateBurgs').text(burgs + '%')
            $(this).children().filter('.stateArea').text(area + '%')
            $(this).children().filter('.statePopulation').val(population + '%')
          })
        } else {
          el.attr('data-type', 'absolute')
          editCountries()
        }
      }
      if (id === 'countriesExport') {
        if ($('.statePower').length === 0) {return}
        const unit = areaUnit.value === 'square' ? distanceUnit.value + '2' : areaUnit.value
        let data = 'Country,Capital,Cells,Burgs,Area (' + unit + '),Population\n' // countries headers
        $('#countriesBody > .states').each(function() {
          const country = $(this).attr('data-country')
          if (country === 'bottom') {data += 'neutral,'} else {data += country + ','}
          const capital = $(this).attr('data-capital')
          if (capital === 'bottom' || capital === 'select') {data += ','} else {
            data += capital + ','
          }
          data += $(this).attr('data-cells') + ','
          data += $(this).attr('data-burgs') + ','
          data += $(this).attr('data-area') + ','
          const population = +$(this).attr('data-population')
          data += population + '\n'
        })
        data += '\nBurg,Country,Culture,Population\n' // burgs headers
        self.manors.map(function(m) {
          if (m.region === 'removed') return // skip removed burgs
          data += m.name + ','
          const country = m.region === 'neutral' ? 'neutral' : self.states[m.region].name
          data += country + ','
          data += self.cultures[m.culture].name + ','
          const population = m.population * urbanization.value * populationRate.value * 1000
          data += population + '\n'
        })
        const dataBlob = new Blob([data], {type: 'text/plain'})
        const url = window.URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        document.body.appendChild(link)
        link.download = 'countries_data' + Date.now() + '.csv'
        link.href = url
        link.click()
        window.setTimeout(function() {window.URL.revokeObjectURL(url)}, 2000)
      }

      if (id === 'burgNamesImport') burgsListToLoad.click()

      if (id === 'removeCountries') {
        alertMessage.innerHTML = `Are you sure you want remove all countries?`
        $('#alert').dialog({
          resizable: false, title: 'Remove countries',
          buttons: {
            Cancel: function() {$(this).dialog('close')},
            Remove: function() {
              $(this).dialog('close')
              $('#countriesBody').empty()
              self.manors.map(function(m) {m.region = 'neutral'})
              self.land.map(function(l) {l.region = 'neutral'})
              self.states.map(function(s) {
                const c = +s.capital
                if (isNaN(c)) return
                moveBurgToGroup(c, 'towns')
              })
              removeAllLabelsInGroup('countries')
              regions.selectAll('path').remove()
              self.states = []
              self.states.push({i: 0, color: 'neutral', capital: 'neutral', name: 'Neutrals'})
              recalculateStateData(0)
              if ($('#burgsEditor').is(':visible')) {$('#burgsEditor').dialog('close')}
              editCountries()
            }
          }
        })
      }
      if (id === 'removeBurgs') {
        alertMessage.innerHTML =
          `Are you sure you want to remove all burgs associated with the country?`
        $('#alert').dialog({
          resizable: false, title: 'Remove associated burgs',
          buttons: {
            Cancel: function() {$(this).dialog('close')},
            Remove: function() {
              $(this).dialog('close')
              const state = +$('#burgsEditor').attr('data-state')
              const region = self.states[state].capital === 'neutral' ? 'neutral' : state
              $('#burgsBody').empty()
              self.manors.map(function(m) {
                if (m.region !== region) {return}
                m.region = 'removed'
                self.cells[m.cell].manor = undefined
                labels.select('[data-id=\'' + m.i + '\']').remove()
                icons.selectAll('[data-id=\'' + m.i + '\']').remove()
              })
              self.states[state].urbanPopulation = 0
              self.states[state].burgs = 0
              self.states[state].capital = 'select'
              if ($('#countriesEditor').is(':visible')) {
                editCountries()
                $('#burgsEditor').dialog('moveToTop')
              }
              burgsFooterBurgs.innerHTML = 0
              burgsFooterPopulation.value = 0
            }
          }
        })
      }
      if (id === 'changeCapital') {
        if ($(this).hasClass('pressed')) {
          $(this).removeClass('pressed')
        } else {
          $('.pressed').removeClass('pressed')
          $(this).addClass('pressed')
        }
      }
      if (id === 'regenerateBurgNames') {
        var s = +$('#burgsEditor').attr('data-state')
        $('.burgName').each(function(e, i) {
          const b = +(this.parentNode.id).slice(5)
          const name = generateName(self.manors[b].culture)
          $(this).val(name)
          $(this).parent().attr('data-burg', name)
          self.manors[b].name = name
          labels.select('[data-id=\'' + b + '\']').text(name)
        })
        if ($('#countriesEditor').is(':visible')) {
          if (self.states[s].capital === 'neutral') {return}
          var c = self.states[s].capital
          $('#state' + s).attr('data-capital', self.manors[c].name)
          $('#state' + s + ' > .stateCapital').val(self.manors[c].name)
        }
      }
      if (id === 'burgAdd') {
        var state = +$('#burgsEditor').attr('data-state')
        clickToAdd() // to load on click event function
        $('#addBurg').click().attr('data-state', state)
      }
      if (id === 'toggleScaleBar') {$('#scaleBar').toggleClass('hidden')}
      if (id === 'addRuler') {
        $('#ruler').show()
        const rulerNew = ruler.append('g').attr('class', 'linear')
                              .call(d3.drag().on('start', elementDrag))
        const factor = _.round(1 / Math.pow(scale, 0.3), 1)
        const y = Math.floor(Math.random() * self.graphHeight * 0.5 + self.graphHeight * 0.25)
        const x1 = self.graphWidth * 0.2, x2 = self.graphWidth * 0.8
        const dash = _.round(30 / distanceScale.value, 2)
        rulerNew.append('line').attr('x1', x1).attr('y1', y).attr('x2', x2).attr('y2', y)
                .attr('class', 'white').attr('stroke-width', factor)
        rulerNew.append('line').attr('x1', x1).attr('y1', y).attr('x2', x2).attr('y2', y)
                .attr('class', 'gray').attr('stroke-width', factor).attr('stroke-dasharray', dash)
        rulerNew.append('circle').attr('r', 2 * factor).attr('stroke-width', 0.5 * factor)
                .attr('cx', x1).attr('cy', y).attr('data-edge', 'left')
                .call(d3.drag().on('drag', rulerEdgeDrag))
        rulerNew.append('circle').attr('r', 2 * factor).attr('stroke-width', 0.5 * factor)
                .attr('cx', x2).attr('cy', y).attr('data-edge', 'rigth')
                .call(d3.drag().on('drag', rulerEdgeDrag))
        rulerNew.append('circle').attr('r', 1.2 * factor).attr('stroke-width', 0.3 * factor)
                .attr('cx', self.graphWidth / 2).attr('cy', y).attr('class', 'center')
                .call(d3.drag().on('start', rulerCenterDrag))
        const dist = Math.round(x2 - x1)
        const label = Math.round(dist * distanceScale.value) + ' ' + distanceUnit.value
        rulerNew.append('text').attr('x', self.graphWidth / 2).attr('y', y).attr('dy', -1)
                .attr('data-dist', dist).text(label).text(label).on('click', removeParent)
                .attr('font-size', 10 * factor)
        return
      }
      if (id === 'addOpisometer' || id === 'addPlanimeter') {
        if ($(this).hasClass('pressed')) {
          restoreDefaultEvents()
          $(this).removeClass('pressed')
        } else {
          $(this).addClass('pressed')
          viewbox.style('cursor', 'crosshair').call(drag)
        }
        return
      }
      if (id === 'removeAllRulers') {
        if ($('#ruler > g').length < 1) {return}
        alertMessage.innerHTML = `Are you sure you want to remove all placed rulers?`
        $('#alert').dialog({
          resizable: false, title: 'Remove all rulers',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              $('#ruler > g').remove()
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
        return
      }
      if (id === 'editHeightmap') {$('#customizeHeightmap').slideToggle()}
      if (id === 'fromScratch') {
        alertMessage.innerHTML =
          'Are you sure you want to clear the map? All progress will be lost'
        $('#alert').dialog({
          resizable: false, title: 'Clear map',
          buttons: {
            Clear: function() {
              closeDialogs()
              undraw()
              placePoints()
              calculateVoronoi(self.points)
              detectNeighbors('grid')
              drawScaleBar()
              customizeHeightmap()
              openBrushesPanel()
              $(this).dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      }
      if (id === 'fromHeightmap') {
        const message = `Hightmap is a basic element on which secondary data (rivers, burgs, countries etc) is based.
  If you want to significantly change the hightmap, it may be better to clean up all the secondary data
  and let the system to re-generate it based on the updated hightmap. In case of minor changes, you can keep the data.
  Newly added lands will be considered as neutral. Burgs located on a removed land cells will be deleted.
  Rivers and small lakes will be re-gerenated based on updated heightmap. Routes won't be regenerated.`
        alertMessage.innerHTML = message
        $('#alert').dialog({
          resizable: false, title: 'Edit Heightmap',
          buttons: {
            'Clean up': function() {
              editHeightmap('clean')
              $(this).dialog('close')
            },
            Keep: function() {
              $(this).dialog('close')
              editHeightmap('keep')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
        return
      }
      // heightmap customization buttons
      if (self.customization === 1) {
        if (id === 'paintBrushes') {openBrushesPanel()}
        if (id === 'rescaleExecute') {
          const subject = rescaleLower.value + '-' + rescaleHigher.value
          const sign = conditionSign.value
          let modifier = rescaleModifier.value
          if (sign === '×') {modifyHeights(subject, 0, +modifier)}
          if (sign === '÷') {modifyHeights(subject, 0, (1 / modifier))}
          if (sign === '+') {modifyHeights(subject, +modifier, 1)}
          if (sign === '-') {modifyHeights(subject, (-1 * modifier), 1)}
          if (sign === '^') {modifyHeights(subject, 0, '^' + modifier)}
          updateHeightmap()
          updateHistory()
        }
        if (id === 'rescaleButton') {
          $('#modifyButtons').children().not('#rescaleButton, .condition').toggle()
        }
        if (id === 'rescaleCondButton') {
          $('#modifyButtons').children().not('#rescaleCondButton, #rescaler').toggle()
        }
        if (id === 'undo' || id === 'templateUndo') {restoreHistory(self.historyStage - 1)}
        if (id === 'redo' || id === 'templateRedo') {restoreHistory(self.historyStage + 1)}
        if (id === 'smoothHeights') {
          smoothHeights(4)
          updateHeightmap()
          updateHistory()
        }
        if (id === 'disruptHeights') {
          disruptHeights()
          updateHeightmap()
          updateHistory()
        }
        if (id === 'getMap') getMap()
        if (id === 'applyTemplate') {
          if ($('#templateEditor').is(':visible')) {return}
          $('#templateEditor').dialog({
            title: 'Template Editor',
            minHeight: 'auto', width: 'auto', resizable: false,
            position: {my: 'right top', at: 'right-10 top+10', of: 'svg'}
          })
        }
        if (id === 'convertImage') {convertImage()}
        if (id === 'convertImageGrid') {$('#grid').fadeToggle()}
        if (id === 'convertImageHeights') {$('#landmass').fadeToggle()}
        if (id === 'perspectiveView') {
          if ($('#perspectivePanel').is(':visible')) return
          $('#perspectivePanel').dialog({
            title: 'Perspective View',
            width: 520, height: 190,
            position: {my: 'center center', at: 'center center', of: 'svg'}
          })
          drawPerspective()
          return
        }
      }
      if (parent === 'mapFilters') {
        $('svg').attr('filter', '')
        if ($(this).hasClass('pressed')) {
          $('#mapFilters .pressed').removeClass('pressed')
        } else {
          $('#mapFilters .pressed').removeClass('pressed')
          $(this).addClass('pressed')
          $('svg').attr('filter', 'url(#filter-' + id + ')')
        }
        return
      }
      if (id === 'updateFullscreen') {
        mapWidthInput.value = window.innerWidth
        mapHeightInput.value = window.innerHeight
        localStorage.removeItem('mapHeight')
        localStorage.removeItem('mapWidth')
        changeMapSize()
      }
      if (id === 'zoomExtentDefault') {
        zoomExtentMin.value = 1
        zoomExtentMax.value = 20
        zoom.scaleExtent([1, 20]).scaleTo(svg, 1)
      }
      if (id === 'saveButton') {$('#saveDropdown').slideToggle()}
      if (id === 'loadMap') {mapToLoad.click()}
      if (id === 'zoomReset') {resetZoom(1000)}
      if (id === 'zoomPlus') {
        scale += 1
        if (scale > 40) {scale = 40}
        invokeActiveZooming()
      }
      if (id === 'zoomMinus') {
        scale -= 1
        if (scale <= 1) {
          scale = 1
          viewX = 0
          viewY = 0
        }
        invokeActiveZooming()
      }
      if (id === 'styleFontPlus' || id === 'styleFontMinus') {
        var el = viewbox.select('#' + styleElementSelect.value)
        var mod = id === 'styleFontPlus' ? 1.1 : 0.9
        el.selectAll('g').each(function() {
          const el = d3.select(this)
          let size = _.round(el.attr('data-size') * mod, 2)
          if (size < 2) {size = 2}
          el.attr('data-size', size).attr('font-size', _.round((size + (size / scale)) / 2, 2))
        })
        invokeActiveZooming()
        return
      }
      if (id === 'brushClear') {
        if (self.customization === 1) {
          var message = 'Are you sure you want to clear the map?'
          alertMessage.innerHTML = message
          $('#alert').dialog({
            resizable: false, title: 'Clear map',
            buttons: {
              Clear: function() {
                $(this).dialog('close')
                viewbox.style('cursor', 'crosshair').call(drag)
                landmassCounter.innerHTML = '0'
                $('#landmass').empty()
                self.heights = new Uint8Array(self.heights.length)
                // clear history
                self.history = []
                self.historyStage = 0
                updateHistory()
                redo.disabled = templateRedo.disabled = true
                undo.disabled = templateUndo.disabled = true
              },
              Cancel: function() {$(this).dialog('close')}
            }
          })
        } else {
          start.click()
        }
      }
      if (id === 'templateComplete') getMap()
      if (id === 'convertColorsMinus') {
        var current = +convertColors.value - 1
        if (current < 4) {current = 3}
        convertColors.value = current
        heightsFromImage(current)
      }
      if (id === 'convertColorsPlus') {
        var current = +convertColors.value + 1
        if (current > 255) {current = 256}
        convertColors.value = current
        heightsFromImage(current)
      }
      if (id === 'convertOverlayButton') {
        $('#convertImageButtons').children().not(this).not('#convertColors').toggle()
      }
      if (id === 'convertAutoLum') {autoAssing('lum')}
      if (id === 'convertAutoHue') {autoAssing('hue')}
      if (id === 'convertComplete') {completeConvertion()}
    })

    // support save options
    $('#saveDropdown > div').click(function() {
      const id = this.id
      let dns_allow_popup_message = localStorage.getItem('dns_allow_popup_message')
      if (!dns_allow_popup_message) {
        localStorage.clear()
        let message = 'Generator uses pop-up window to download files. '
        message += 'Please ensure your browser does not block popups. '
        message += 'Please check browser settings and turn off adBlocker if it is enabled'
        alertMessage.innerHTML = message
        $('#alert').dialog({
          title: 'File saver. Please enable popups!',
          buttons: {
            'Don\'t show again': function() {
              localStorage.setItem('dns_allow_popup_message', true)
              $(this).dialog('close')
            },
            Close: function() {$(this).dialog('close')}
          },
          position: {my: 'center', at: 'center', of: 'svg'}
        })
      }
      if (id === 'saveMap') {saveMap()}
      if (id === 'saveSVG') {saveAsImage('svg')}
      if (id === 'savePNG') {saveAsImage('png')}
      $('#saveDropdown').slideUp('fast')
    })

    function editHeightmap(type) {
      closeDialogs()
      const regionData = [], cultureData = []
      if (type !== 'clean') {
        for (let i = 0; i < self.points.length; i++) {
          let cell = self.diagram.find(self.points[i][0], self.points[i][1]).index
          // if closest cell is a small lake, try to find a land neighbor
          if (self.cells[cell].lake === 2) self.cells[cell].neighbors.forEach(function(n) {
            if (self.cells[n].height >= 20) {cell = n }
          })
          let region = self.cells[cell].region
          if (region === undefined) region = -1
          regionData.push(region)
          let culture = self.cells[cell].culture
          if (culture === undefined) culture = -1
          cultureData.push(culture)
        }
      } else {undraw()}
      calculateVoronoi(self.points)
      detectNeighbors('grid')
      drawScaleBar()
      if (type === 'keep') {
        svg.selectAll(
          '#lakes, #coastline, #terrain, #rivers, #grid, #terrs, #landmass, #ocean, #regions')
           .selectAll('path, circle, line').remove()
        svg.select('#shape').remove()
        for (let i = 0; i < self.points.length; i++) {
          if (regionData[i] !== -1) self.cells[i].region = regionData[i]
          if (cultureData[i] !== -1) self.cells[i].culture = cultureData[i]
        }
      }
      mockHeightmap()
      customizeHeightmap()
      openBrushesPanel()
    }

    function openBrushesPanel() {
      if ($('#brushesPanel').is(':visible')) {return}
      $('#brushesPanel').dialog({
        title: 'Paint Brushes',
        minHeight: 40, width: 'auto', maxWidth: 200, resizable: false,
        position: {my: 'right top', at: 'right-10 top+10', of: 'svg'}
      }).on('dialogclose', function() {
        restoreDefaultEvents()
        $('#brushesButtons > .pressed').removeClass('pressed')
      })

      if (self.modules.openBrushesPanel) return
      self.modules.openBrushesPanel = true

      $('#brushesButtons > button').on('click', function() {
        const rSlider = $('#brushRadiusLabel, #brushRadius')
        debug.selectAll('.circle, .tag, .line').remove()
        if ($(this).hasClass('pressed')) {
          $(this).removeClass('pressed')
          restoreDefaultEvents()
          rSlider.attr('disabled', true).addClass('disabled')
        } else {
          $('#brushesButtons > .pressed').removeClass('pressed')
          $(this).addClass('pressed')
          viewbox.style('cursor', 'crosshair')
          const id = this.id
          if (id === 'brushRange' || id === 'brushTrough') {
            viewbox.on('click', placeLinearFeature)
          } // on click brushes
          else {viewbox.call(drag).on('click', null)} // on drag brushes
          if ($(this).hasClass('feature')) {
            rSlider.attr('disabled', true).addClass('disabled')
          } else {rSlider.attr('disabled', false).removeClass('disabled')}
        }
      })
    }

    function drawPerspective() {
      console.time('drawPerspective')
      const width = 320, height = 180
      const wRatio = self.graphWidth / width, hRatio = self.graphHeight / height
      const lineCount = 320, lineGranularity = 90
      const perspective = document.getElementById('perspective')
      const pContext = perspective.getContext('2d')
      const lines = []
      let i = lineCount
      while (i--) {
        const x = i / lineCount * width | 0
        const canvasPoints = []
        lines.push(canvasPoints)
        let j = Math.floor(lineGranularity)
        while (j--) {
          const y = j / lineGranularity * height | 0
          let index = getCellIndex(x * wRatio, y * hRatio)
          let h = self.heights[index] - 20
          if (h < 1) h = 0
          canvasPoints.push([x, y, h])
        }
      }
      pContext.clearRect(0, 0, perspective.width, perspective.height)
      for (let canvasPoints of lines) {
        for (let i = 0; i < canvasPoints.length - 1; i++) {
          const pt1 = canvasPoints[i]
          const pt2 = canvasPoints[i + 1]
          const avHeight = (pt1[2] + pt2[2]) / 200
          pContext.beginPath()
          pContext.moveTo(...transformPt(pt1))
          pContext.lineTo(...transformPt(pt2))
          let clr = 'rgb(81, 103, 169)' // water
          if (avHeight !== 0) {clr = color(1 - avHeight - 0.2)}
          pContext.strokeStyle = clr
          pContext.stroke()
        }
        for (let i = 0; i < canvasPoints.length - 1; i++) {

        }
      }
      console.timeEnd('drawPerspective')
    }

    // get square grid cell index based on coords
    function getCellIndex(x, y) {
      return self.diagram.find(x, y).index
    }

    function transformPt(pt) {
      const width = 320, maxHeight = 0.2
      let [x, y] = projectIsometric(pt[0], pt[1])
      return [x + width / 2 + 10, y + 10 - pt[2] * maxHeight]
    }

    function projectIsometric(x, y) {
      const scale = 1, yProj = 4
      return [(x - y) * scale, (x + y) / yProj * scale]
    }

    // Execute custom template
    $('#templateRun').on('click', function() {
      if (self.customization !== 1) return
      let steps = $('#templateBody > div').length
      if (!steps) return
      self.heights = new Uint8Array(self.heights.length) // clean all heights
      for (let step = 1; step <= steps; step++) {
        const type = $('#templateBody div:nth-child(' + step + ')').attr('data-type')
        if (type === 'Mountain') {
          addMountain()
          continue
        }
        let count = $('#templateBody div:nth-child(' + step + ') .templateElCount').val()
        const dist = $('#templateBody div:nth-child(' + step + ') .templateElDist').val()
        if (count) {
          if (count[0] !== '-' && count.includes('-')) {
            const lim = count.split('-')
            count = Math.floor(Math.random() * (+lim[1] - +lim[0] + 1) + +lim[0])
          } else {
            count = +count // parse string
          }
        }
        if (type === 'Hill') {addHill(count, +dist)}
        if (type === 'Pit') {addPit(count)}
        if (type === 'Range') {addRange(count)}
        if (type === 'Trough') {addRange(-1 * count)}
        if (type === 'Strait') {addStrait(count)}
        if (type === 'Add') {modifyHeights(dist, count, 1)}
        if (type === 'Multiply') {modifyHeights(dist, 0, count)}
        if (type === 'Smooth') {smoothHeights(count)}
      }
      mockHeightmap()
      updateHistory()
    })

    $('#templateToLoad').change(function() {
      const fileToLoad = this.files[0]
      this.value = ''
      const fileReader = new FileReader()
      fileReader.onload = function(fileLoadedEvent) {
        const dataLoaded = fileLoadedEvent.target.result
        const data = dataLoaded.split('\r\n')
        $('#templateBody').empty()
        if (data.length > 0) {
          $('#templateBody').attr('data-changed', 1)
          $('#templateSelect').attr('data-prev', 'templateCustom').val('templateCustom')
        }
        for (let i = 0; i < data.length; i++) {
          const line = data[i].split(' ')
          this.addStep(line[0], line[1], line[2])
        }
      }
      fileReader.readAsText(fileToLoad, 'UTF-8')
    })

    // Image to Heightmap Converter dialog
    function convertImage() {
      canvas.width = self.svgWidth
      canvas.height = self.svgHeight
      // turn off paint brushes drag and cursor
      $('.pressed').removeClass('pressed')
      restoreDefaultEvents()
      const div = d3.select('#colorScheme')
      if (div.selectAll('*').size() === 0) {
        for (let i = 0; i <= 100; i++) {
          let width = i < 20 || i > 70 ? '1px' : '3px'
          if (i === 0) width = '4px'
          const clr = color(1 - i / 100)
          const style = 'background-color: ' + clr + '; width: ' + width
          div.append('div').attr('data-color', i).attr('style', style)
        }
        div.selectAll('*').on('touchmove mousemove', showHeight).on('click', assignHeight)
      }
      if ($('#imageConverter').is(':visible')) {return}
      $('#imageConverter').dialog({
        title: 'Image to Heightmap Converter',
        minHeight: 30, width: 260, resizable: false,
        position: {my: 'right top', at: 'right-10 top+10', of: 'svg'}
      })
                          .on('dialogclose', function() {completeConvertion()})
    }

    // Load image to convert
    $('#convertImageLoad').on('click', function() {imageToLoad.click()})
    $('#imageToLoad').change(function() {
      console.time('loadImage')
      // set style
      resetZoom()
      grid.attr('stroke-width', .2)
      // load image
      const file = this.files[0]
      this.value = '' // reset input value to get triggered if the same file is uploaded
      const reader = new FileReader()
      const img = new Image
      // draw image
      img.onload = function() {
        ctx.drawImage(img, 0, 0, self.svgWidth, self.svgHeight)
        heightsFromImage(+convertColors.value)
        console.timeEnd('loadImage')
      }
      reader.onloadend = function() {img.src = reader.result}
      reader.readAsDataURL(file)
    })

    function heightsFromImage(count) {
      const imageData = ctx.getImageData(0, 0, self.svgWidth, self.svgHeight)
      const data = imageData.data
      $('#landmass > path, .color-div').remove()
      $('#landmass, #colorsUnassigned').fadeIn()
      $('#colorsAssigned').fadeOut()
      const colors = [], palette = []
      self.points.map(function(i) {
        let x = Math.round(i[0]), y = Math.round(i[1])
        if (y == self.svgHeight) {y--}
        if (x == self.svgWidth) {x--}
        const p = (x + y * self.svgWidth) * 4
        const r = data[p], g = data[p + 1], b = data[p + 2]
        colors.push([r, g, b])
      })
      const cmap = quantize(colors, count)
      self.heights = new Uint8Array(self.points.length)
      self.polygons.map(function(i, d) {
        const nearest = cmap.nearest(colors[d])
        const rgb = 'rgb(' + nearest[0] + ', ' + nearest[1] + ', ' + nearest[2] + ')'
        const hex = toHEX(rgb)
        if (palette.indexOf(hex) === -1) {palette.push(hex)}
        landmass.append('path')
                .attr('d', 'M' + i.join('L') + 'Z').attr('data-i', d)
                .attr('fill', hex).attr('stroke', hex)
      })
      landmass.selectAll('path').on('click', landmassClicked)
      palette.sort(function(a, b) {return d3.lab(a).b - d3.lab(b).b}).map(function(i) {
        $('#colorsUnassigned').append(
          '<div class="color-div" id="' + i.substr(1) + '" style="background-color: ' + i + ';"/>')
      })
      $('.color-div').click(selectColor)
    }

    function landmassClicked() {
      const color = d3.select(this).attr('fill')
      $('#' + color.slice(1)).click()
    }

    function selectColor() {
      landmass.selectAll('.selectedCell').classed('selectedCell', 0)
      const el = d3.select(this)
      if (el.classed('selectedColor')) {
        el.classed('selectedColor', 0)
      } else {
        $('.selectedColor').removeClass('selectedColor')
        el.classed('selectedColor', 1)
        $('#colorScheme .hoveredColor').removeClass('hoveredColor')
        $('#colorsSelectValue').text(0)
        if (el.attr('data-height')) {
          const height = el.attr('data-height')
          $('#colorScheme div[data-color=\'' + height + '\']').addClass('hoveredColor')
          $('#colorsSelectValue').text(height)
        }
        const color = '#' + d3.select(this).attr('id')
        landmass.selectAll('path').classed('selectedCell', 0)
        landmass.selectAll('path[fill=\'' + color + '\']').classed('selectedCell', 1)
      }
    }

    function showHeight() {
      let el = d3.select(this)
      let height = el.attr('data-color')
      $('#colorsSelectValue').text(height)
      $('#colorScheme .hoveredColor').removeClass('hoveredColor')
      el.classed('hoveredColor', 1)
    }

    function assignHeight() {
      const sel = $('.selectedColor')[0]
      const height = +d3.select(this).attr('data-color')
      const rgb = color(1 - height / 100)
      const hex = toHEX(rgb)
      sel.style.backgroundColor = rgb
      sel.setAttribute('data-height', height)
      const cur = '#' + sel.id
      sel.id = hex.substr(1)
      landmass.selectAll('.selectedCell').each(function() {
        d3.select(this).attr('fill', hex).attr('stroke', hex)
        let i = +d3.select(this).attr('data-i')
        self.heights[i] = height
      })
      const parent = sel.parentNode
      if (parent.id === 'colorsUnassigned') {
        colorsAssigned.appendChild(sel)
        $('#colorsAssigned').fadeIn()
        if ($('#colorsUnassigned .color-div').length < 1) {$('#colorsUnassigned').fadeOut()}
      }
      if ($('#colorsAssigned .color-div').length > 1) {sortAssignedColors()}
    }

    // sort colors based on assigned height
    function sortAssignedColors() {
      const data = []
      const colors = d3.select('#colorsAssigned').selectAll('.color-div')
      colors.each(function(d) {
        const id = d3.select(this).attr('id')
        const height = +d3.select(this).attr('data-height')
        data.push({id, height})
      })
      data.sort(function(a, b) {return a.height - b.height}).map(function(i) {
        $('#colorsAssigned').append($('#' + i.id))
      })
    }

    // auto assign color based on luminosity or hue
    function autoAssing(type) {
      const imageData = ctx.getImageData(0, 0, self.svgWidth, self.svgHeight)
      const data = imageData.data
      $('#landmass > path, .color-div').remove()
      $('#colorsAssigned').fadeIn()
      $('#colorsUnassigned').fadeOut()
      self.polygons.forEach(function(i, d) {
        let x = Math.round(i.data[0]), y = Math.round(i.data[1])
        if (y == self.svgHeight) y--
        if (x == self.svgWidth) x--
        const p = (x + y * self.svgWidth) * 4
        const r = data[p], g = data[p + 1], b = data[p + 2]
        const lab = d3.lab('rgb(' + r + ', ' + g + ', ' + b + ')')
        if (type === 'hue') {
          var normalized = _.round(normalize(lab.b + lab.a / 2, -50, 200), 2)
        } else {
          var normalized = _.round(normalize(lab.l, 0, 100), 2)
        }
        const rgb = color(1 - normalized)
        const hex = toHEX(rgb)
        self.heights[d] = normalized * 100
        landmass.append('path').attr('d', 'M' + i.join('L') + 'Z').attr('data-i', d)
                .attr('fill', hex).attr('stroke', hex)
      })
      let unique = [...new Set(self.heights)].sort()
      unique.forEach(function(h) {
        const rgb = color(1 - h / 100)
        const hex = toHEX(rgb)
        $('#colorsAssigned').append('<div class="color-div" id="' + hex.substr(
          1) + '" data-height="' + h + '" style="background-color: ' + hex + ';"/>')
      })
      $('.color-div').click(selectColor)
    }

    function normalize(val, min, max) {
      let normalized = (val - min) / (max - min)
      if (normalized < 0) {normalized = 0}
      if (normalized > 1) {normalized = 1}
      return normalized
    }

    function completeConvertion() {
      mockHeightmap()
      restartHistory()
      $('.color-div').remove()
      $('#colorsAssigned, #colorsUnassigned').fadeOut()
      grid.attr('stroke-width', .1)
      canvas.style.opacity = convertOverlay.value = convertOverlayValue.innerHTML = 0
      // turn on paint brushes drag and cursor
      viewbox.style('cursor', 'crosshair').call(drag)
      $('#imageConverter').dialog('close')
    }

    // Clear the map
    function undraw() {
      viewbox.selectAll('path, circle, line, text, use, #ruler > g').remove()
      defs.selectAll('*').remove()
      landmass.select('rect').remove()
      self.cells = [], self.land = [], self.riversData = [], self.manors = [], self.states = [], self.features = [], self.queue = []
    }

    // Enter Heightmap Customization mode
    function customizeHeightmap() {
      self.customization = 1
      tip('Heightmap customization mode is active. Click on "Complete" to finalize the Heightmap',
        true)
      $('#getMap').removeClass('buttonoff').addClass('glow')
      resetZoom()
      landmassCounter.innerHTML = '0'
      $('#grid').fadeIn()
      $('#toggleGrid').removeClass('buttonoff')
      restartHistory()
      $('#customizationMenu').slideDown()
      $('#openEditor').slideUp()
    }

    // Remove all customization related styles, reset values
    function exitCustomization() {
      self.customization = 0
      tip('', true)
      canvas.style.opacity = 0
      $('#customizationMenu').slideUp()
      $('#getMap').addClass('buttonoff').removeClass('glow')
      $('#landmass').empty()
      $('#grid').empty().fadeOut()
      $('#toggleGrid').addClass('buttonoff')
      restoreDefaultEvents()
      if (!$('#toggleHeight').hasClass('buttonoff')) {toggleHeight()}
      closeDialogs()
      self.history = []
      self.historyStage = 0
      $('#customizeHeightmap').slideUp()
      $('#openEditor').slideDown()
      debug.selectAll('.circle, .tag, .line').remove()
    }

    // open editCountries dialog
    function editCountries() {
      if (cults.selectAll('path').size()) $('#toggleCultures').click()
      if (regions.style('display') === 'none') $('#toggleCountries').click()
      layoutPreset.value = 'layoutPolitical'
      $('#countriesBody').empty()
      $('#countriesHeader').children().removeClass(
        'icon-sort-name-up icon-sort-name-down icon-sort-number-up icon-sort-number-down')
      let totalArea = 0, totalBurgs = 0, unit, areaConv
      if (areaUnit.value === 'square') {unit = ' ' + distanceUnit.value + '²'} else {
        unit = ' ' + areaUnit.value
      }
      let totalPopulation = 0
      for (let s = 0; s < self.states.length; s++) {
        $('#countriesBody').append('<div class="states" id="state' + s + '"></div>')
        const el = $('#countriesBody div:last-child')
        const burgsCount = self.states[s].burgs
        totalBurgs += burgsCount
        // calculate user-friendly area and population
        const area = Math.round(self.states[s].area * Math.pow(distanceScale.value, 2))
        totalArea += area
        areaConv = si(area) + unit
        const urban = Math.round(self.states[s].urbanPopulation * urbanization.value * populationRate.value)
        const rural = _.round(self.states[s].ruralPopulation * populationRate.value)
        var population = (urban + rural) * 1000
        totalPopulation += population
        const populationConv = si(population)
        const title = '\'Total population: ' + populationConv + '; Rural population: ' + rural + 'K; Urban population: ' + urban + 'K\''
        let neutral = self.states[s].color === 'neutral' || self.states[s].capital === 'neutral'
        // append elements to countriesBody
        if (!neutral) {
          el.append(
            '<input onmouseover="tip(\'Country color. Click to change\')" class="stateColor" type="color" value="' + self.states[s].color + '"/>')
          el.append(
            '<input onmouseover="tip(\'Country name. Click and type to change\')" class="stateName" value="' + self.states[s].name + '" autocorrect="off" spellcheck="false"/>')
          var capital = self.states[s].capital !== 'select' ? self.manors[self.states[s].capital].name : 'select'
          if (capital === 'select') {
            el.append(
              '<button onmouseover="tip(\'Click on map to select a capital or to create a new capital\')" class="selectCapital" id="selectCapital' + s + '">★ select</button>')
          } else {
            el.append(
              '<span onmouseover="tip(\'Country capital. Click to enlange\')" class="icon-star-empty enlange"></span>')
            el.append(
              '<input onmouseover="tip(\'Capital name. Click and type to rename\')" class="stateCapital" value="' + capital + '" autocorrect="off" spellcheck="false"/>')
          }
          el.append(
            '<span onmouseover="tip(\'Country expansionism (defines competitive size)\')" class="icon-resize-full hidden"></span>')
          el.append(
            '<input onmouseover="tip(\'Capital expansionism (defines competitive size)\')" class="statePower hidden" type="number" min="0" max="99" step="0.1" value="' + self.states[s].power + '"/>')
        } else {
          el.append('<input class="stateColor placeholder" disabled type="color"/>')
          el.append(
            '<input onmouseover="tip(\'Neutral burgs are united into this group. Click to change the group name\')" class="stateName italic" id="stateName' + s + '" value="' + self.states[s].name + '" autocorrect="off" spellcheck="false"/>')
          el.append('<span class="icon-star-empty placeholder"></span>')
          el.append('<input class="stateCapital placeholder"/>')
          el.append('<span class="icon-resize-full hidden placeholder"></span>')
          el.append('<input class="statePower hidden placeholder" value="0.0"/>')
        }
        el.append('<span onmouseover="tip(\'Cells count\')" class="icon-check-empty"></span>')
        el.append(
          '<div onmouseover="tip(\'Cells count\')" class="stateCells">' + self.states[s].cells + '</div>')
        el.append(
          '<span onmouseover="tip(\'Burgs count. Click to see a full list\')" style="padding-right: 1px" class="stateBIcon icon-dot-circled"></span>')
        el.append(
          '<div onmouseover="tip(\'Burgs count. Click to see a full list\')" class="stateBurgs">' + burgsCount + '</div>')
        el.append(
          '<span onmouseover="tip(\'Country area: ' + (area + unit) + '\')" style="padding-right: 4px" class="icon-map-o"></span>')
        el.append(
          '<div onmouseover="tip(\'Country area: ' + (area + unit) + '\')" class="stateArea">' + areaConv + '</div>')
        el.append('<span onmouseover="tip(' + title + ')" class="icon-male"></span>')
        el.append(
          '<input onmouseover="tip(' + title + ')" class="statePopulation" value="' + populationConv + '">')
        if (!neutral) {
          el.append(
            '<span onmouseover="tip(\'Remove country, all assigned cells will become Neutral\')" class="icon-trash-empty"></span>')
          el.attr('data-country', self.states[s].name).attr('data-capital', capital)
            .attr('data-expansion', self.states[s].power).attr('data-cells', self.states[s].cells)
            .attr('data-burgs', self.states[s].burgs).attr('data-area', area)
            .attr('data-population', population)
        } else {
          el.attr('data-country', 'bottom').attr('data-capital', 'bottom')
            .attr('data-expansion', 'bottom').attr('data-cells', self.states[s].cells)
            .attr('data-burgs', self.states[s].burgs).attr('data-area', area)
            .attr('data-population', population)
        }
      }
      // initialize jQuery dialog
      if (!$('#countriesEditor').is(':visible')) {
        $('#countriesEditor').dialog({
          title: 'Countries Editor',
          minHeight: 'auto', minWidth: Math.min(self.svgWidth, 390),
          position: {my: 'right top', at: 'right-10 top+10', of: 'svg'}
        }).on('dialogclose', function() {
          if (self.customization === 2 || self.customization === 3) {
            $('#countriesManuallyCancel').click()
          }
        })
      }
      // restore customization Editor version
      if (self.customization === 3) {
        $('div[data-sortby=\'expansion\'],.statePower, .icon-resize-full').removeClass('hidden')
        $('div[data-sortby=\'cells\'],.stateCells, .icon-check-empty').addClass('hidden')
      } else {
        $('div[data-sortby=\'expansion\'],.statePower, .icon-resize-full').addClass('hidden')
        $('div[data-sortby=\'cells\'],.stateCells, .icon-check-empty').removeClass('hidden')
      }
      // populate total line on footer
      countriesFooterCountries.innerHTML = self.states.length
      if (self.states[self.states.length - 1].capital === 'neutral') {
        countriesFooterCountries.innerHTML = self.states.length - 1
      }
      countriesFooterBurgs.innerHTML = totalBurgs
      countriesFooterArea.innerHTML = si(totalArea) + unit
      countriesFooterPopulation.innerHTML = si(totalPopulation)
      // handle events
      $('#countriesBody .states').hover(focusOnState, unfocusState)
      $('.enlange').click(function() {
        const s = +(this.parentNode.id).slice(5)
        const capital = self.states[s].capital
        const l = labels.select('[data-id=\'' + capital + '\']')
        const x = +l.attr('x'), y = +l.attr('y')
        zoomTo(x, y, 8, 1600)
      })
      $('.stateName').on('input', function() {
        const s = +(this.parentNode.id).slice(5)
        self.states[s].name = this.value
        labels.select('#regionLabel' + s).text(this.value)
        if ($('#burgsEditor').is(':visible')) {
          if ($('#burgsEditor').attr('data-state') == s) {
            const color = '<input title="Country color. Click to change" type="color" class="stateColor" value="' + self.states[s].color + '"/>'
            $('div[aria-describedby=\'burgsEditor\'] .ui-dialog-title').text('Burgs of ' + this.value)
                                                                       .prepend(color)
          }
        }
      })
      $('.states > .stateColor').on('change', function() {
        const s = +(this.parentNode.id).slice(5)
        self.states[s].color = this.value
        regions.selectAll('.region' + s).attr('fill', this.value).attr('stroke', this.value)
        if ($('#burgsEditor').is(':visible')) {
          if ($('#burgsEditor').attr('data-state') == s) {
            $('.ui-dialog-title > .stateColor').val(this.value)
          }
        }
      })
      $('.stateCapital').on('input', function() {
        const s = +(this.parentNode.id).slice(5)
        const capital = self.states[s].capital
        self.manors[capital].name = this.value
        labels.select('[data-id=\'' + capital + '\']').text(this.value)
        if ($('#burgsEditor').is(':visible')) {
          if ($('#burgsEditor').attr('data-state') == s) {
            $('#burgs' + capital + ' > .burgName').val(this.value)
          }
        }
      }).hover(focusCapital, unfocus)
      $('.stateBurgs, .stateBIcon').on('click', editBurgs).hover(focusBurgs, unfocus)

      $('#countriesBody > .states').on('click', function() {
        if (self.customization === 2) {
          $('.selected').removeClass('selected')
          $(this).addClass('selected')
          const state = +$(this).attr('id').slice(5)
          let color = self.states[state].color
          if (color === 'neutral') {color = 'white'}
          if (debug.selectAll('.circle').size()) debug.selectAll('.circle').attr('stroke', color)
        }
      })

      $('.selectCapital').on('click', function() {
        if ($(this).hasClass('pressed')) {
          $(this).removeClass('pressed')
          tooltip.setAttribute('data-main', '')
          restoreDefaultEvents()
        } else {
          $(this).addClass('pressed')
          viewbox.style('cursor', 'crosshair').on('click', selectCapital)
          tip('Click on the map to select or create a new capital', true)
        }
      })

      function selectCapital() {
        const point = d3.mouse(this)
        const index = getIndex(point)
        const x = _.round(point[0], 2), y = _.round(point[1], 2)

        if (self.cells[index].height < 20) {
          tip('Cannot place capital on the water! Select a land cell')
          return
        }
        const state = +$('.selectCapital.pressed').attr('id').replace('selectCapital', '')
        let oldState = self.cells[index].region
        if (oldState === 'neutral') {oldState = self.states.length - 1}
        if (self.cells[index].manor !== undefined) {
          // cell has burg
          const burg = self.cells[index].manor
          if (self.states[oldState].capital === burg) {
            tip('Existing capital cannot be selected as a new state capital! Select other cell')
            return
          } else {
            // make this burg a new capital
            const urbanFactor = 0.9 // for old neutrals
            self.manors[burg].region = state
            if (oldState === 'neutral') {self.manors[burg].population *= (1 / urbanFactor)}
            self.manors[burg].population *= 2 // give capital x2 population bonus
            self.states[state].capital = burg
            moveBurgToGroup(burg, 'capitals')
          }
        } else {
          // free cell -> create new burg for a capital
          const closest = self.cultureTree.find(x, y)
          const culture = self.cultureTree.data().indexOf(closest) || 0
          const name = generateName(culture)
          const i = self.manors.length
          self.cells[index].manor = i
          self.states[state].capital = i
          let score = self.cells[index].score
          if (score <= 0) {score = _.round(Math.random(), 2)}
          if (self.cells[index].crossroad) {score += self.cells[index].crossroad} // crossroads
          if (self.cells[index].confluence) {score += Math.pow(self.cells[index].confluence, 0.3)} // confluences
          if (self.cells[index].port !== undefined) {score *= 3} // port-capital
          const population = _.round(score, 1)
          self.manors.push({i, cell: index, x, y, region: state, culture, name, population})
          burgIcons.select('#capitals').append('circle').attr('id', 'burg' + i).attr('data-id', i)
                   .attr('cx', x).attr('cy', y).attr('r', 1).on('click', editBurg)
          burgLabels.select('#capitals').append('text').attr('data-id', i).attr('x', x).attr('y', y)
                    .attr('dy', '-0.35em').text(name).on('click', editBurg)
        }
        self.cells[index].region = state
        self.cells[index].neighbors.map(function(n) {
          if (self.cells[n].height < 20) {return}
          if (self.cells[n].manor !== undefined) {return}
          self.cells[n].region = state
        })
        redrawRegions()
        recalculateStateData(oldState) // re-calc old state data
        recalculateStateData(state) // calc new state data
        editCountries()
        restoreDefaultEvents()
      }

      $('.statePower').on('input', function() {
        const s = +(this.parentNode.id).slice(5)
        self.states[s].power = +this.value
        regenerateCountries()
      })
      $('.statePopulation').on('change', function() {
        let s = +(this.parentNode.id).slice(5)
        const popOr = +$(this).parent().attr('data-population')
        const popNew = getInteger(this.value)
        if (!Number.isInteger(popNew) || popNew < 1000) {
          this.value = si(popOr)
          return
        }
        const change = popNew / popOr
        self.states[s].urbanPopulation = _.round(self.states[s].urbanPopulation * change, 2)
        self.states[s].ruralPopulation = _.round(self.states[s].ruralPopulation * change, 2)
        const urban = Math.round(self.states[s].urbanPopulation * urbanization.value * populationRate.value)
        const rural = Math.round(self.states[s].ruralPopulation * populationRate.value)
        const population = (urban + rural) * 1000
        $(this).parent().attr('data-population', population)
        this.value = si(population)
        let total = 0
        $('#countriesBody > div').each(function(e, i) {
          total += +$(this).attr('data-population')
        })
        countriesFooterPopulation.innerHTML = si(total)
        if (self.states[s].capital === 'neutral') {s = 'neutral'}
        self.manors.map(function(m) {
          if (m.region !== s) {return}
          m.population = _.round(m.population * change, 2)
        })
      })
      // fully remove country
      $('#countriesBody .icon-trash-empty').on('click', function() {
        const s = +(this.parentNode.id).slice(5)
        alertMessage.innerHTML =
          `Are you sure you want to remove the country? All lands and burgs will become neutral`
        $('#alert').dialog({
          resizable: false, title: 'Remove country', buttons: {
            Remove: function() {
              removeCountry(s)
              $(this).dialog('close')
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

      function removeCountry(s) {
        const cellsCount = self.states[s].cells
        const capital = +self.states[s].capital
        if (!isNaN(capital)) moveBurgToGroup(capital, 'towns')
        self.states.splice(s, 1)
        self.states.map(function(s, i) {s.i = i})
        self.land.map(function(c) {
          if (c.region === s) c.region = 'neutral'
          else if (c.region > s) c.region -= 1
        })
        // do only if removed state had cells
        if (cellsCount) {
          self.manors.map(function(b) {if (b.region === s) b.region = 'neutral'})
          // re-calculate neutral data
          const i = self.states.length
          if (self.states[i - 1].capital !== 'neutral') {
            self.states.push({i, color: 'neutral', name: 'Neutrals', capital: 'neutral'})
          }
          recalculateStateData(i - 1) // re-calc data for neutrals
          redrawRegions()
        }
        editCountries()
      }

      $('#countriesNeutral, #countriesNeutralNumber').on('change', regenerateCountries)
    }

    // burgs list + editor
    function editBurgs(context, s) {
      if (s === undefined) {s = +(this.parentNode.id).slice(5)}
      $('#burgsEditor').attr('data-state', s)
      $('#burgsBody').empty()
      $('#burgsHeader').children().removeClass(
        'icon-sort-name-up icon-sort-name-down icon-sort-number-up icon-sort-number-down')
      const region = self.states[s].capital === 'neutral' ? 'neutral' : s
      const burgs = $.grep(self.manors, function(e) {
        return (e.region === region)
      })
      const populationArray = []
      burgs.map(function(b) {
        $('#burgsBody').append('<div class="states" id="burgs' + b.i + '"></div>')
        const el = $('#burgsBody div:last-child')
        el.append('<span title="Click to enlarge the burg" style="padding-right: 2px" class="enlarge icon-globe"></span>')
        el.append('<input title="Burg name. Click and type to change" class="burgName" value="' + b.name + '" autocorrect="off" spellcheck="false"/>')
        el.append('<span title="Burg culture" class="icon-book" style="padding-right: 2px"></span>')
        el.append('<div title="Burg culture" class="burgCulture">' + self.cultures[b.culture].name + '</div>')
        let population = b.population * urbanization.value * populationRate.value * 1000
        populationArray.push(population)
        population = population > 1e4 ? si(population) : _.round(population, -1)
        el.append('<span title="Population" class="icon-male"></span>')
        el.append('<input title="Population. Input to change" class="burgPopulation" value="' + population + '"/>')
        const capital = self.states[s].capital
        let type = 'z-burg' // usual burg by default
        if (b.i === capital) {
          el.append('<span title="Capital" class="icon-star-empty"></span>')
          type = 'c-capital'
        } else {
          el.append('<span class="icon-star-empty placeholder"></span>')
        }
        if (self.cells[b.cell].port !== undefined) {
          el.append('<span title="Port" class="icon-anchor small"></span>')
          type = type === 'c-capital' ? 'a-capital-port' : 'p-port'
        } else {
          el.append('<span class="icon-anchor placeholder"></span>')
        }
        if (b.i !== capital) {
          el.append('<span title="Remove burg" class="icon-trash-empty"></span>')
        }
        el.attr('data-burg', b.name).attr('data-culture', self.cultures[b.culture].name)
          .attr('data-population', b.population).attr('data-type', type)
      })
      if (!$('#burgsEditor').is(':visible')) {
        $('#burgsEditor').dialog({
          title: 'Burgs of ' + self.states[s].name,
          minHeight: 'auto', width: 'auto',
          position: {my: 'right bottom', at: 'right-10 bottom-10', of: 'svg'}
        })
        const color = '<input title="Country color. Click to change" type="color" class="stateColor" value="' + self.states[s].color + '"/>'
        if (region !== 'neutral') {
          $('div[aria-describedby=\'burgsEditor\'] .ui-dialog-title').prepend(color)
        }
      }
      // populate total line on footer
      burgsFooterBurgs.innerHTML = burgs.length
      burgsFooterCulture.innerHTML = $('#burgsBody div:first-child .burgCulture').text()
      burgsFooterPopulation.value = _.round(d3.mean(populationArray), -1)
      $('.enlarge').click(function() {
        const b = +(this.parentNode.id).slice(5)
        const l = labels.select('[data-id=\'' + b + '\']')
        const x = +l.attr('x'), y = +l.attr('y')
        zoomTo(x, y, 8, 1600)
      })

      $('#burgsBody > div').hover(focusBurg, unfocus)

      $('#burgsBody > div').click(function() {
        if (!$('#changeCapital').hasClass('pressed')) return
        const s = +$('#burgsEditor').attr('data-state')
        const newCap = +$(this).attr('id').slice(5)
        const oldCap = +self.states[s].capital
        if (newCap === oldCap) {
          tip('This burg is already a capital! Please select a different burg', null, 'error')
          return
        }
        $('#changeCapital').removeClass('pressed')
        self.states[s].capital = newCap
        if (!isNaN(oldCap)) moveBurgToGroup(oldCap, 'towns')
        recalculateStateData(s)
        moveBurgToGroup(newCap, 'capitals')
      })

      $('.burgName').on('input', function() {
        const b = +(this.parentNode.id).slice(5)
        self.manors[b].name = this.value
        labels.select('[data-id=\'' + b + '\']').text(this.value)
        if (b === s && $('#countriesEditor').is(':visible')) {
          $('#state' + s + ' > .stateCapital').val(this.value)
        }
      })
      $('.ui-dialog-title > .stateColor').on('change', function() {
        self.states[s].color = this.value
        regions.selectAll('.region' + s).attr('fill', this.value).attr('stroke', this.value)
        if ($('#countriesEditor').is(':visible')) {
          $('#state' + s + ' > .stateColor').val(this.value)
        }
      })
      $('.burgPopulation').on('change', function() {
        const b = +(this.parentNode.id).slice(5)
        const pop = getInteger(this.value)
        if (!Number.isInteger(pop) || pop < 10) {
          const orig = _.round(self.manors[b].population * urbanization.value * populationRate.value * 1000,
            2)
          this.value = si(orig)
          return
        }
        const populationRaw = _.round(pop / urbanization.value / populationRate.value / 1000, 2)
        const change = populationRaw - self.manors[b].population
        self.manors[b].population = populationRaw
        $(this).parent().attr('data-population', populationRaw)
        this.value = si(pop)
        let state = self.manors[b].region
        if (state === 'neutral') {state = self.states.length - 1}
        self.states[state].urbanPopulation += change
        updateCountryPopulationUI(state)
        const average = self.states[state].urbanPopulation / self.states[state].burgs * urbanization.value * populationRate.value * 1000
        burgsFooterPopulation.value = _.round(average, -1)
      })
      $('#burgsFooterPopulation').on('change', function() {
        const state = +$('#burgsEditor').attr('data-state')
        const newPop = +this.value
        const avPop = self.states[state].urbanPopulation / self.states[state].burgs * urbanization.value * populationRate.value * 1000
        if (!Number.isInteger(newPop) || newPop < 10) {
          this.value = _.round(avPop, -1)
          return
        }
        const change = +this.value / avPop
        $('#burgsBody > div').each(function(e, i) {
          const b = +(this.id).slice(5)
          const pop = _.round(self.manors[b].population * change, 2)
          self.manors[b].population = pop
          $(this).attr('data-population', pop)
          let popUI = pop * urbanization.value * populationRate.value * 1000
          popUI = popUI > 1e4 ? si(popUI) : _.round(popUI, -1)
          $(this).children().filter('.burgPopulation').val(popUI)
        })
        self.states[state].urbanPopulation = _.round(self.states[state].urbanPopulation * change, 2)
        updateCountryPopulationUI(state)
      })
      $('#burgsBody .icon-trash-empty').on('click', function() {
        alertMessage.innerHTML = `Are you sure you want to remove the burg?`
        const b = +(this.parentNode.id).slice(5)
        $('#alert').dialog({
          resizable: false, title: 'Remove burg',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              const state = +$('#burgsEditor').attr('data-state')
              $('#burgs' + b).remove()
              const cell = self.manors[b].cell
              self.manors[b].region = 'removed'
              self.cells[cell].manor = undefined
              self.states[state].burgs = self.states[state].burgs - 1
              burgsFooterBurgs.innerHTML = self.states[state].burgs
              countriesFooterBurgs.innerHTML = +countriesFooterBurgs.innerHTML - 1
              self.states[state].urbanPopulation = self.states[state].urbanPopulation - self.manors[b].population
              const avPop = self.states[state].urbanPopulation / self.states[state].burgs * urbanization.value * populationRate.value * 1000
              burgsFooterPopulation.value = _.round(avPop, -1)
              if ($('#countriesEditor').is(':visible')) {
                $('#state' + state + ' > .stateBurgs').text(self.states[state].burgs)
              }
              labels.select('[data-id=\'' + b + '\']').remove()
              icons.select('[data-id=\'' + b + '\']').remove()
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })
    }

    // onhover style functions
    function focusOnState() {
      const s = +(this.id).slice(5)
      labels.select('#regionLabel' + s).classed('drag', true)
      document.getElementsByClassName('region' + s)[0].style.stroke = 'red'
      document.getElementsByClassName('region' + s)[0].setAttribute('filter', 'url(#blur1)')
    }

    function unfocusState() {
      const s = +(this.id).slice(5)
      labels.select('#regionLabel' + s).classed('drag', false)
      document.getElementsByClassName('region' + s)[0].style.stroke = 'none'
      document.getElementsByClassName('region' + s)[0].setAttribute('filter', null)
    }

    function focusCapital() {
      const s = +(this.parentNode.id).slice(5)
      const capital = self.states[s].capital
      labels.select('[data-id=\'' + capital + '\']').classed('drag', true)
      icons.select('[data-id=\'' + capital + '\']').classed('drag', true)
    }

    function focusBurgs() {
      const s = +(this.parentNode.id).slice(5)
      const stateManors = $.grep(self.manors, function(e) {
        return (e.region === s)
      })
      stateManors.map(function(m) {
        labels.select('[data-id=\'' + m.i + '\']').classed('drag', true)
        icons.select('[data-id=\'' + m.i + '\']').classed('drag', true)
      })
    }

    function focusBurg() {
      const b = +(this.id).slice(5)
      const l = labels.select('[data-id=\'' + b + '\']')
      l.classed('drag', true)
    }

    function unfocus() {$('.drag').removeClass('drag')}

    // save dialog position if "stable" dialog window is dragged
    $('.stable').on('dialogdragstop', function(event, ui) {
      sessionStorage.setItem(this.id, [ui.offset.left, ui.offset.top])
    })

    // restore saved dialog position on "stable" dialog window open
    $('.stable').on('dialogopen', function(event, ui) {
      let pos = sessionStorage.getItem(this.id)
      if (!pos) {return}
      pos = pos.split(',')
      if (pos[0] > $(window).width() - 100 || pos[1] > $(window).width() - 40) {return} // prevent showing out of screen
      const at = `left+${pos[0]} top+${pos[1]}`
      $(this).dialog('option', 'position', {my: 'left top', at: at, of: 'svg'})
    })

    // open editCultures dialog
    function editCultures() {
      if (!cults.selectAll('path').size()) $('#toggleCultures').click()
      if (regions.style('display') !== 'none') $('#toggleCountries').click()
      layoutPreset.value = 'layoutCultural'
      $('#culturesBody').empty()
      $('#culturesHeader').children().removeClass('icon-sort-name-up icon-sort-name-down icon-sort-number-up icon-sort-number-down')

      // collect data
      const cellsC = [], areas = [], rurPops = [], urbPops = []
      const unit = areaUnit.value === 'square' ? ' ' + distanceUnit.value + '²'
                                               : ' ' + areaUnit.value
      self.land.map(function(l) {
        const c = l.culture
        if (c === undefined) return
        cellsC[c] = cellsC[c] ? cellsC[c] + 1 : 1
        areas[c] = areas[c] ? areas[c] + l.area : l.area
        rurPops[c] = rurPops[c] ? rurPops[c] + l.pop : l.pop
      })

      self.manors.map(function(m) {
        const c = m.culture
        if (isNaN(c)) return
        urbPops[c] = urbPops[c] ? urbPops[c] + m.population : m.population
      })

      if (!self.nameBases[0]) self.resetNames()
      for (let c = 0; c < self.cultures.length; c++) {
        $('#culturesBody').append('<div class="states cultures" id="culture' + c + '"></div>')
        if (cellsC[c] === undefined) {
          cellsC[c] = 0
          areas[c] = 0
          rurPops[c] = 0
        }
        if (urbPops[c] === undefined) urbPops[c] = 0
        const area = Math.round(areas[c] * Math.pow(distanceScale.value, 2))
        const areaConv = si(area) + unit
        const urban = Math.round(urbPops[c] * +urbanization.value * populationRate.value)
        const rural = Math.round(rurPops[c] * populationRate.value)
        const population = (urban + rural) * 1000
        const populationConv = si(population)
        const title = '\'Total population: ' + populationConv + '; Rural population: ' + rural + 'K; Urban population: ' + urban + 'K\''
        let b = self.cultures[c].base
        if (b >= self.nameBases.length) b = 0
        const base = self.nameBases[b].name
        const el = $('#culturesBody div:last-child')
        el.append('<input onmouseover="tip(\'Culture color. Click to change\')" class="stateColor" type="color" value="' + self.cultures[c].color + '"/>')
        el.append('<input onmouseover="tip(\'Culture name. Click and type to change\')" class="cultureName" value="' + self.cultures[c].name + '" autocorrect="off" spellcheck="false"/>')
        el.append('<span onmouseover="tip(\'Culture cells count\')" class="icon-check-empty"></span>')
        el.append('<div onmouseover="tip(\'Culture cells count\')" class="stateCells">' + cellsC[c] + '</div>')
        el.append('<span onmouseover="tip(\'Culture area: ' + areaConv + '\')" style="padding-right: 4px" class="icon-map-o"></span>')
        el.append('<div onmouseover="tip(\'Culture area: ' + areaConv + '\')" class="stateArea">' + areaConv + '</div>')
        el.append('<span onmouseover="tip(' + title + ')" class="icon-male"></span>')
        el.append('<div onmouseover="tip(' + title + ')" class="culturePopulation">' + populationConv + '</div>')
        el.append('<span onmouseover="tip(\'Click to re-generate names for burgs with this culture assigned\')" class="icon-arrows-cw"></span>')
        el.append('<select onmouseover="tip(\'Culture namesbase. Click to change\')" class="cultureBase"></select>')
        if (self.cultures.length > 1) {
          el.append('<span onmouseover="tip(\'Remove culture. Remaining cultures will be recalculated\')" class="icon-trash-empty"></span>')
        }
        el.attr('data-color', self.cultures[c].color).attr('data-culture', self.cultures[c].name)
          .attr('data-cells', cellsC[c]).attr('data-area', area).attr('data-population', population)
          .attr('data-base', base)
      }

      addCultureBaseOptions()
      drawCultureCenters()

      let activeCultures = cellsC.reduce(function(s, v) {if (v) {return s + 1} else {return s}}, 0)
      culturesFooterCultures.innerHTML = activeCultures + '/' + self.cultures.length
      culturesFooterCells.innerHTML = self.land.length
      let totalArea = areas.reduce(function(s, v) {return s + v})
      totalArea = Math.round(totalArea * Math.pow(distanceScale.value, 2))
      culturesFooterArea.innerHTML = si(totalArea) + unit
      let totalPopulation = rurPops.reduce(function(s, v) {return s + v}) * urbanization.value
      totalPopulation += urbPops.reduce(function(s, v) {return s + v})
      culturesFooterPopulation.innerHTML = si(totalPopulation * 1000 * populationRate.value)

      // initialize jQuery dialog
      if (!$('#culturesEditor').is(':visible')) {
        $('#culturesEditor').dialog({
          title: 'Cultures Editor',
          minHeight: 'auto', minWidth: Math.min(self.svgWidth, 336),
          position: {my: 'right top', at: 'right-10 top+10', of: 'svg'},
          close: function() {
            debug.select('#cultureCenters').selectAll('*').remove()
            exitCulturesManualAssignment()
          }
        })
      }

      $('.cultures').hover(function() {
        const c = +(this.id).slice(7)
        debug.select('#cultureCenter' + c).attr('stroke', '#000000e6')
      }, function() {
        const c = +(this.id).slice(7)
        debug.select('#cultureCenter' + c).attr('stroke', '#00000080')
      })

      $('.cultures').on('click', function() {
        if (self.customization !== 4) return
        const c = +(this.id).slice(7)
        $('.selected').removeClass('selected')
        $(this).addClass('selected')
        let color = self.cultures[c].color
        debug.selectAll('.circle').attr('stroke', color)
      })

      $('.cultures .stateColor').on('input', function() {
        const c = +(this.parentNode.id).slice(7)
        const old = self.cultures[c].color
        self.setCultureFields(c, {color: this.value})
        debug.select('#cultureCenter' + c).attr('fill', this.value)
        cults.selectAll('[fill="' + old + '"]').attr('fill', this.value).attr('stroke', this.value)
      })

      $('.cultures .cultureName').on('input', function() {
        const c = +(this.parentNode.id).slice(7)
        self.setCultureFields(c, {name: this.value})
      })

      $('.cultures .icon-arrows-cw').on('click', function() {
        const c = +(this.parentNode.id).slice(7)
        self.manors.forEach(function(m) {
          if (m.region === 'removed') return
          if (m.culture !== c) return
          m.name = generateName(c)
          labels.select('[data-id=\'' + m.i + '\']').text(m.name)
        })
      })

      $('#culturesBody .icon-trash-empty').on('click', function() {
        const c = +(this.parentNode.id).slice(7)
        self.deleteCulture(c)
        recalculateCultures('fullRedraw')
        editCultures()
      })

      if (self.modules.editCultures) return
      self.modules.editCultures = true

      function addCultureBaseOptions() {
        $('.cultureBase').each(function() {
          const c = +(this.parentNode.id).slice(7)
          for (let i = 0; i < self.nameBases.length; i++) {
            this.options.add(new Option(self.nameBases[i].name, i))
          }
          this.value = self.cultures[c].base
          this.addEventListener('change', function() {
            self.setCultureFields(c, {base: +this.value})
          })
        })
      }

      function drawCultureCenters() {
        let cultureCenters = debug.select('#cultureCenters')
        if (cultureCenters.size()) {cultureCenters.selectAll('*').remove()} else {
          cultureCenters = debug.append('g').attr('id', 'cultureCenters')
        }
        for (let c = 0; c < self.cultures.length; c++) {
          cultureCenters.append('circle').attr('id', 'cultureCenter' + c)
                        .attr('cx', self.cultures[c].center[0]).attr('cy', self.cultures[c].center[1])
                        .attr('r', 6).attr('stroke-width', 2).attr('stroke', '#00000080')
                        .attr('fill', self.cultures[c].color)
                        .on('mousemove', cultureCenterTip)
                        .on('mouseleave', function() {tip('', true)})
                        .call(d3.drag().on('start', cultureCenterDrag))
        }
      }

      function cultureCenterTip() {
        tip('Drag to move culture center and re-calculate cultures', true)
      }

      function cultureCenterDrag() {
        const el = d3.select(this)
        const c = +this.id.slice(13)

        d3.event.on('drag', function() {
          const x = d3.event.x
          const y = d3.event.y
          el.attr('cx', x).attr('cy', y)
          self.setCultureCenter({index: c, x, y})
          recalculateCultures()
        })
      }

      $('#culturesPercentage').on('click', function() {
        const el = $('#culturesEditor')
        if (el.attr('data-type') === 'absolute') {
          el.attr('data-type', 'percentage')
          const totalCells = self.land.length
          let totalArea = culturesFooterArea.innerHTML
          totalArea = getInteger(totalArea.split(' ')[0])
          const totalPopulation = getInteger(culturesFooterPopulation.innerHTML)
          $('#culturesBody > .cultures').each(function() {
            const cells = Math.round($(this).attr('data-cells') / totalCells * 100)
            const area = Math.round($(this).attr('data-area') / totalArea * 100)
            const population = Math.round($(this).attr('data-population') / totalPopulation * 100)
            $(this).children().filter('.stateCells').text(cells + '%')
            $(this).children().filter('.stateArea').text(area + '%')
            $(this).children().filter('.culturePopulation').text(population + '%')
          })
        } else {
          el.attr('data-type', 'absolute')
          editCultures()
        }
      })

      $('#culturesManually').on('click', function() {
        self.customization = 4
        tip('Click to select a culture, drag the circle to re-assign', true)
        $('#culturesBottom').children().hide()
        $('#culturesManuallyButtons').show()
        viewbox.style('cursor', 'crosshair').call(drag).on('click', changeSelectedOnClick)
        debug.select('#cultureCenters').selectAll('*').remove()
      })

      $('#culturesManuallyComplete').on('click', function() {
        const changed = cults.selectAll('[data-culture]')
        changed.each(function() {
          const i = +(this.id).slice(4)
          const c = +this.getAttribute('data-culture')
          this.removeAttribute('data-culture')
          self.cells[i].culture = c
          const manor = self.cells[i].manor
          if (manor !== undefined) self.manors[manor].culture = c
        })
        exitCulturesManualAssignment()
        if (changed.size()) editCultures()
      })

      $('#culturesManuallyCancel').on('click', function() {
        cults.selectAll('[data-culture]').each(function() {
          const i = +(this.id).slice(4)
          const c = self.cells[i].culture
          this.removeAttribute('data-culture')
          const color = self.cultures[c].color
          this.setAttribute('fill', color)
          this.setAttribute('stroke', color)
        })
        exitCulturesManualAssignment()
        drawCultureCenters()
      })

      function exitCulturesManualAssignment() {
        debug.selectAll('.circle').remove()
        $('#culturesBottom').children().show()
        $('#culturesManuallyButtons').hide()
        $('.selected').removeClass('selected')
        self.customization = 0
        restoreDefaultEvents()
      }

      $('#culturesRandomize').on('click', function() {
        self.recalculateCultureTree()
        recalculateCultures()
        drawCultureCenters()
        editCultures()
      })

      $('#culturesExport').on('click', function() {
        const unit = areaUnit.value === 'square' ? distanceUnit.value + '2' : areaUnit.value
        let data = 'Culture,Cells,Area (' + unit + '),Population,Namesbase\n' // headers
        $('#culturesBody > .cultures').each(function() {
          data += $(this).attr('data-culture') + ','
          data += $(this).attr('data-cells') + ','
          data += $(this).attr('data-area') + ','
          data += $(this).attr('data-population') + ','
          data += $(this).attr('data-base') + '\n'
        })

        const dataBlob = new Blob([data], {type: 'text/plain'})
        const url = window.URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        document.body.appendChild(link)
        link.download = 'cultures_data' + Date.now() + '.csv'
        link.href = url
        link.click()
        window.setTimeout(function() {window.URL.revokeObjectURL(url)}, 2000)
      })

      $('#culturesRegenerateNames').on('click', function() {
        self.manors.forEach(function(m) {
          if (m.region === 'removed') return
          const culture = m.culture
          m.name = generateName(culture)
          labels.select('[data-id=\'' + m.i + '\']').text(m.name)
        })
      })

      $('#culturesEditNamesBase').on('click', editNamesbase)

      $('#culturesAdd').on('click', function() {
        self.addCulture({generateName})
        recalculateCultures()
        editCultures()
      })
    }

    // open editNamesbase dialog
    function editNamesbase() {
      // update list of bases
      const select = document.getElementById('namesbaseSelect')
      for (let i = select.options.length; i < self.nameBases.length; i++) {
        const option = new Option(self.nameBases[i].name, i)
        select.options.add(option)
      }

      // restore previous state
      const textarea = document.getElementById('namesbaseTextarea')
      let selected = +textarea.getAttribute('data-base')
      if (selected >= self.nameBases.length) selected = 0
      select.value = selected
      if (textarea.value === '') namesbaseUpdateInputs(selected)
      const examples = document.getElementById('namesbaseExamples')
      if (examples.innerHTML === '') namesbaseUpdateExamples(selected)

      // open a dialog
      $('#namesbaseEditor').dialog({
        title: 'Namesbase Editor',
        minHeight: 'auto', minWidth: Math.min(self.svgWidth, 400),
        position: {my: 'center', at: 'center', of: 'svg'}
      })

      if (self.modules.editNamesbase) return
      self.modules.editNamesbase = true

      function namesbaseUpdateInputs(selected) {
        const textarea = document.getElementById('namesbaseTextarea')
        textarea.value = self.nameBases[selected].names.join(', ')
        textarea.setAttribute('data-base', selected)
        const name = document.getElementById('namesbaseName')
        const method = document.getElementById('namesbaseMethod')
        const min = document.getElementById('namesbaseMin')
        const max = document.getElementById('namesbaseMax')
        const dublication = document.getElementById('namesbaseDouble')
        name.value = self.nameBases[selected].name
        method.value = self.nameBases[selected].method
        min.value = self.nameBases[selected].min
        max.value = self.nameBases[selected].max
        dublication.value = self.nameBases[selected].d
      }

      function namesbaseUpdateExamples(selected) {
        const examples = document.getElementById('namesbaseExamples')
        let text = ''
        for (let i = 0; i < 10; i++) {
          const name = generateName(false, selected)
          if (name === undefined) {
            text = 'Cannot generate examples. Please verify the data'
            break
          }
          if (i !== 0) text += ', '
          text += name
        }
        examples.innerHTML = text
      }

      $('#namesbaseSelect').on('change', function() {
        const selected = +this.value
        namesbaseUpdateInputs(selected)
        namesbaseUpdateExamples(selected)
      })

      $('#namesbaseName').on('input', function() {
        const index = +textarea.getAttribute('data-base')
        const select = document.getElementById('namesbaseSelect')
        select.options[index].innerHTML = this.value
        self.setNameFields({index, fields: {name: this.value}})
      })

      $('#namesbaseTextarea').on('input', function() {
        const index = +this.getAttribute('data-base')
        const data = textarea.value.replace(/ /g, '').split(',')
        self.setNameFields({index, fields: {names: data}})
        if (data.length < 3) {
          self.resetChain({index})
          const examples = document.getElementById('namesbaseExamples')
          examples.innerHTML = 'Please provide a correct source data'
          return
        }
        const method = document.getElementById('namesbaseMethod').value
        if (method !== 'selection') self.calculateChain({index})
      })

      $('#namesbaseMethod').on('change', function() {
        const index = +textarea.getAttribute('data-base')
        self.setNameFields({index, fields: {method: this.value}})
        if (this.value !== 'selection')
          self.calculateChain({index})
      })

      $('#namesbaseMin').on('change', function() {
        const index = +textarea.getAttribute('data-base')
        if (+this.value > self.nameBases[index].max) {
          tip('Minimal length cannot be greated that maximal')
        } else {
          self.setNameFields({index, fields: {min: +this.value}})
        }
      })

      $('#namesbaseMax').on('change', function() {
        const index = +textarea.getAttribute('data-base')
        if (+this.value < self.nameBases[index].min) {
          tip('Maximal length cannot be less than minimal')
        } else {
          self.setNameFields({index, fields: {max: +this.value}})
        }
      })

      $('#namesbaseDouble').on('change', function() {
        self.setNameFields({index: +textarea.getAttribute('data-base'), fields: {d: this.value}})
      })

      $('#namesbaseDefault').on('click', function() {
        alertMessage.innerHTML = `Are you sure you want to restore the default namesbase?
    All custom bases will be removed and default ones will be assigned to existing cultures.
    Meanwhile existing names will not be changed.`
        $('#alert').dialog({
          resizable: false, title: 'Restore default data',
          buttons: {
            Restore: function() {
              $(this).dialog('close')
              $('#namesbaseEditor').dialog('close')
              const select = document.getElementById('namesbaseSelect')
              select.options.length = 0
              document.getElementById('namesbaseTextarea').value = ''
              document.getElementById('namesbaseTextarea').setAttribute('data-base', 0)
              document.getElementById('namesbaseExamples').innerHTML === ''
              self.resetNames()
              self.verifyBases()
              self.calculateChains()
              editCultures()
              editNamesbase()
            },
            Cancel: function() {$(this).dialog('close')}
          }
        })
      })

      $('#namesbaseAdd').on('click', function() {
        const base = self.nameBases.length
        const name = 'Base' + base
        const method = document.getElementById('namesbaseMethod').value
        const select = document.getElementById('namesbaseSelect')
        select.options.add(new Option(name, base))
        select.value = base
        self.addLanguage({name, method})
        document.getElementById('namesbaseName').value = name
        const textarea = document.getElementById('namesbaseTextarea')
        textarea.value = ''
        textarea.setAttribute('data-base', base)
        document.getElementById('namesbaseExamples').innerHTML = ''
        self.resetChain({index: base})
        editCultures()
      })

      $('#namesbaseExamples, #namesbaseUpdateExamples').on('click', function() {
        const select = document.getElementById('namesbaseSelect')
        namesbaseUpdateExamples(+select.value)
      })

      $('#namesbaseDownload').on('click', function() {
        const dataBlob = new Blob([JSON.stringify(self.nameBases)], {type: 'text/plain'})
        const url = window.URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.download = 'namebase' + Date.now() + '.txt'
        link.href = url
        link.click()
      })

      $('#namesbaseUpload').on('click', function() {namesbaseToLoad.click()})
      $('#namesbaseToLoad').change(function() {
        const fileToLoad = this.files[0]
        this.value = ''
        const fileReader = new FileReader()
        fileReader.onload = function(fileLoadedEvent) {
          self.resetNames(JSON.parse(fileLoadedEvent.target.result))
          document.getElementById('namesbaseSelect').options.length = 0
          document.getElementById('namesbaseTextarea').value = ''
          document.getElementById('namesbaseTextarea').setAttribute('data-base', 0)
          document.getElementById('namesbaseExamples').innerHTML === ''
          self.verifyBases()
          self.calculateChains()
          editCultures()
          editNamesbase()
        }
        fileReader.readAsText(fileToLoad, 'UTF-8')
      })
    }

    // open editLegends dialog
    function editLegends(id, name) {
      // update list of objects
      const select = document.getElementById('legendSelect')
      for (let i = select.options.length; i < self.notes.length; i++) {
        let option = new Option(self.notes[i].id, self.notes[i].id)
        select.options.add(option)
      }

      // select an object
      if (id) {
        let note = self.notes.find(note => note.id === id)
        if (note === undefined) {
          if (!name) name = id
          note = {id, name, legend: ''}
          self.notes.push(note)
          let option = new Option(id, id)
          select.options.add(option)
        }
        select.value = id
        legendName.value = note.name
        legendText.value = note.legend
      }

      // open a dialog
      $('#legendEditor').dialog({
        title: 'Legends Editor',
        minHeight: 'auto', minWidth: Math.min(self.svgWidth, 400),
        position: {my: 'center', at: 'center', of: 'svg'}
      })

      if (self.modules.editLegends) return
      self.modules.editLegends = true

      // select another object
      document.getElementById('legendSelect').addEventListener('change', function() {
        let note = self.notes.find(note => note.id === this.value)
        legendName.value = note.name
        legendText.value = note.legend
      })

      // change note name on input
      document.getElementById('legendName').addEventListener('input', function() {
        let select = document.getElementById('legendSelect')
        let id = select.value
        let note = self.notes.find(note => note.id === id)
        note.name = this.value
      })

      // change note text on input
      document.getElementById('legendText').addEventListener('input', function() {
        let select = document.getElementById('legendSelect')
        let id = select.value
        let note = self.notes.find(note => note.id === id)
        note.legend = this.value
      })

      // hightlight DOM element
      document.getElementById('legendFocus').addEventListener('click', function() {
        let select = document.getElementById('legendSelect')
        let element = document.getElementById(select.value)

        // if element is not found
        if (element === null) {
          const message = 'Related element is not found. Would you like to remove the note (legend item)?'
          alertMessage.innerHTML = message
          $('#alert').dialog({
            resizable: false, title: 'Element not found',
            buttons: {
              Remove: function() {
                $(this).dialog('close')
                removeLegend()
              },
              Keep: function() {$(this).dialog('close')}
            }
          })
          return
        }

        // if element is found
        highlightElement(element)
      })

      function highlightElement(element) {
        if (debug.select('.highlighted').size()) return // allow only 1 highlight element simultaniosly
        let box = element.getBBox()
        let transform = element.getAttribute('transform') || null
        let t = d3.transition().duration(1000).ease(d3.easeBounceOut)
        let r = d3.transition().duration(500).ease(d3.easeLinear)
        let highlight = debug.append('rect').attr('x', box.x).attr('y', box.y)
                             .attr('width', box.width).attr('height', box.height)
                             .attr('transform', transform)
        highlight.classed('highlighted', 1)
                 .transition(t).style('outline-offset', '0px')
                 .transition(r).style('outline-color', 'transparent').remove()
        let tr = parseTransform(transform)
        let x = box.x + box.width / 2
        if (tr[0]) x += tr[0]
        let y = box.y + box.height / 2
        if (tr[1]) y += tr[1]
        if (scale >= 2) zoomTo(x, y, scale, 1600)
      }

      // download legends object as text file
      document.getElementById('legendDownload').addEventListener('click', function() {
        const legendString = JSON.stringify(self.notes)
        const dataBlob = new Blob([legendString], {type: 'text/plain'})
        const url = window.URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.download = 'legends' + Date.now() + '.txt'
        link.href = url
        link.click()
      })

      // upload legends object as text file and parse to json
      document.getElementById('legendUpload').addEventListener('click', function() {
        document.getElementById('lagendsToLoad').click()
      })
      document.getElementById('lagendsToLoad').addEventListener('change', function() {
        const fileToLoad = this.files[0]
        this.value = ''
        const fileReader = new FileReader()
        fileReader.onload = function(fileLoadedEvent) {
          const dataLoaded = fileLoadedEvent.target.result
          if (dataLoaded) {
            self.notes = JSON.parse(dataLoaded)
            const select = document.getElementById('legendSelect')
            select.options.length = 0
            editLegends(self.notes[0].id, self.notes[0].name)
          } else {
            tip('Cannot load a file. Please check the data format')
          }
        }
        fileReader.readAsText(fileToLoad, 'UTF-8')
      })

      // remove the legend item
      document.getElementById('legendRemove').addEventListener('click', function() {
        alertMessage.innerHTML = 'Are you sure you want to remove the selected legend?'
        $('#alert').dialog({
          resizable: false, title: 'Remove legend element',
          buttons: {
            Remove: function() {
              $(this).dialog('close')
              removeLegend()
            },
            Keep: function() {$(this).dialog('close')}
          }
        })
      })

      function removeLegend() {
        let select = document.getElementById('legendSelect')
        let index = self.notes.findIndex(n => n.id === select.value)
        self.notes.splice(index, 1)
        select.options.length = 0
        if (self.notes.length === 0) {
          $('#legendEditor').dialog('close')
          return
        }
        editLegends(self.notes[0].id, self.notes[0].name)
      }

    }

    // Map scale and measurements editor
    function editScale() {
      $('#ruler').fadeIn()
      $('#scaleEditor').dialog({
        title: 'Scale Editor',
        minHeight: 'auto', width: 'auto', resizable: false,
        position: {my: 'center bottom', at: 'center bottom-10', of: 'svg'}
      })
    }

    // update only UI and sorting value in countryEditor screen
    function updateCountryPopulationUI(s) {
      if ($('#countriesEditor').is(':visible')) {
        const urban = Math.round(self.states[s].urbanPopulation * +urbanization.value * populationRate.value)
        const rural = Math.round(self.states[s].ruralPopulation * populationRate.value)
        const population = (urban + rural) * 1000
        $('#state' + s).attr('data-population', population)
        $('#state' + s).children().filter('.statePopulation').val(si(population))
      }
    }

    // update dialogs if measurements are changed
    function updateCountryEditors() {
      if ($('#countriesEditor').is(':visible')) {editCountries()}
      if ($('#burgsEditor').is(':visible')) {
        const s = +$('#burgsEditor').attr('data-state')
        editBurgs(this, s)
      }
    }

    // remove drawn regions and draw all regions again
    function redrawRegions() {
      regions.selectAll('*').remove()
      borders.selectAll('path').remove()
      removeAllLabelsInGroup('countries')
      drawRegions()
    }

    // remove all labels in group including textPaths
    function removeAllLabelsInGroup(group) {
      labels.select('#' + group).selectAll('text').each(function() {
        defs.select('#textPath_' + this.id).remove()
        this.remove()
      })
      if (group !== 'countries') {
        labels.select('#' + group).remove()
        updateLabelGroups()
      }
    }

    // restore keeped region / burgs / cultures data on edit heightmap completion
    function restoreRegions() {
      borders.selectAll('path').remove()
      removeAllLabelsInGroup('countries')
      self.manors.map(function(m) {
        const cell = self.diagram.find(m.x, m.y).index
        if (self.cells[cell].height < 20) {
          // remove manor in ocean
          m.region = 'removed'
          m.cell = cell
          d3.selectAll('[data-id=\'' + m.i + '\']').remove()
        } else {
          m.cell = cell
          self.cells[cell].manor = m.i
        }
      })
      self.cells.map(function(c) {
        if (c.height < 20) {
          // no longer a land cell
          delete c.region
          delete c.culture
          return
        }
        if (c.region === undefined) {
          c.region = 'neutral'
          if (self.states[self.states.length - 1].capital !== 'neutral') {
            self.states.push({i: self.states.length, color: 'neutral', capital: 'neutral', name: 'Neutrals'})
          }
        }
        if (c.culture === undefined) {
          const closest = cultureTree.find(c.data[0], c.data[1])
          c.culture = cultureTree.data().indexOf(closest)
        }
      })
      self.states.map(function(s) {recalculateStateData(s.i)})
      drawRegions()
    }

    function regenerateCountries() {
      regions.selectAll('*').remove()
      const neutral = neutralInput.value = +countriesNeutral.value
      self.manors.forEach(function(m) {
        if (m.region === 'removed') return
        let state = 'neutral', closest = neutral
        self.states.map(function(s) {
          if (s.capital === 'neutral' || s.capital === 'select') return
          const c = self.manors[s.capital]
          let dist = Math.hypot(c.x - m.x, c.y - m.y) / s.power
          if (self.cells[m.cell].fn !== self.cells[c.cell].fn) dist *= 3
          if (dist < closest) {
            state = s.i
            closest = dist
          }
        })
        m.region = state
        self.cells[m.cell].region = state
      })

      defineRegions()
      const temp = regions.append('g').attr('id', 'temp')
      self.land.forEach(function(l) {
        if (l.region === undefined) return
        if (l.region === 'neutral') return
        const color = self.states[l.region].color
        temp.append('path')
            .attr('data-cell', l.index).attr('data-state', l.region)
            .attr('d', 'M' + self.polygons[l.index].join('L') + 'Z')
            .attr('fill', color).attr('stroke', color)
      })
      const neutralCells = $.grep(self.cells, function(e) {return e.region === 'neutral'})
      const last = self.states.length - 1
      const type = self.states[last].color
      if (type === 'neutral' && !neutralCells.length) {
        // remove neutral line
        $('#state' + last).remove()
        self.states.splice(-1)
      }
      // recalculate data for all countries
      self.states.map(function(s) {
        recalculateStateData(s.i)
        $('#state' + s.i + ' > .stateCells').text(s.cells)
        $('#state' + s.i + ' > .stateBurgs').text(s.burgs)
        const area = Math.round(s.area * Math.pow(distanceScale.value, 2))
        const unit = areaUnit.value === 'square' ? ' ' + distanceUnit.value + '²' :
                     ' ' + areaUnit.value
        $('#state' + s.i + ' > .stateArea').text(si(area) + unit)
        const urban = Math.round(s.urbanPopulation * urbanization.value * populationRate.value)
        const rural = Math.round(s.ruralPopulation * populationRate.value)
        const population = (urban + rural) * 1000
        $('#state' + s.i + ' > .statePopulation').val(si(population))
        $('#state' + s.i).attr('data-cells', s.cells).attr('data-burgs', s.burgs)
                         .attr('data-area', area).attr('data-population', population)
      })
      if (type !== 'neutral' && neutralCells.length) {
        // add neutral line
        self.states.push({i: self.states.length, color: 'neutral', capital: 'neutral', name: 'Neutrals'})
        recalculateStateData(self.states.length - 1)
        editCountries()
      }
    }

    // enter state edit mode
    function mockRegions() {
      if (grid.style('display') !== 'inline') {toggleGrid.click()}
      if (labels.style('display') !== 'none') {toggleLabels.click()}
      stateBorders.selectAll('*').remove()
      neutralBorders.selectAll('*').remove()
    }

    // handle DOM elements sorting on header click
    $('.sortable').on('click', function() {
      const el = $(this)
      // remove sorting for all siglings except of clicked element
      el.siblings().removeClass(
        'icon-sort-name-up icon-sort-name-down icon-sort-number-up icon-sort-number-down')
      const type = el.hasClass('alphabetically') ? 'name' : 'number'
      let state = 'no'
      if (el.is('[class*=\'down\']')) {state = 'asc'}
      if (el.is('[class*=\'up\']')) {state = 'desc'}
      const sortby = el.attr('data-sortby')
      const list = el.parent().next() // get list container element (e.g. "countriesBody")
      const lines = list.children('div') // get list elements
      if (state === 'no' || state === 'asc') { // sort desc
        el.removeClass('icon-sort-' + type + '-down')
        el.addClass('icon-sort-' + type + '-up')
        lines.sort(function(a, b) {
          let an = a.getAttribute('data-' + sortby)
          if (an === 'bottom') {return 1}
          let bn = b.getAttribute('data-' + sortby)
          if (bn === 'bottom') {return -1}
          if (type === 'number') {
            an = +an
            bn = +bn
          }
          if (an > bn) {return 1}
          if (an < bn) {return -1}
          return 0
        })
      }
      if (state === 'desc') { // sort asc
        el.removeClass('icon-sort-' + type + '-up')
        el.addClass('icon-sort-' + type + '-down')
        lines.sort(function(a, b) {
          let an = a.getAttribute('data-' + sortby)
          if (an === 'bottom') {return 1}
          let bn = b.getAttribute('data-' + sortby)
          if (bn === 'bottom') {return -1}
          if (type === 'number') {
            an = +an
            bn = +bn
          }
          if (an < bn) {return 1}
          if (an > bn) {return -1}
          return 0
        })
      }
      lines.detach().appendTo(list)
    })

    // load text file with new burg names
    $('#burgsListToLoad').change(function() {
      const fileToLoad = this.files[0]
      this.value = ''
      const fileReader = new FileReader()
      fileReader.onload = function(fileLoadedEvent) {
        const dataLoaded = fileLoadedEvent.target.result
        const data = dataLoaded.split('\r\n')
        if (data.length === 0) {return}
        let change = []
        let message = `Burgs will be renamed as below. Please confirm`
        message +=
          `<div class="overflow-div"><table class="overflow-table"><tr><th>Id</th><th>Current name</th><th>New Name</th></tr>`
        for (let i = 0; i < data.length && i < self.manors.length; i++) {
          const v = data[i]
          if (v === '' || v === undefined) {continue}
          if (v === self.manors[i].name) {continue}
          change.push({i, name: v})
          message +=
            `<tr><td style="width:20%">${i}</td><td style="width:40%">${self.manors[i].name}</td><td style="width:40%">${v}</td></tr>`
        }
        message += `</tr></table></div>`
        alertMessage.innerHTML = message
        $('#alert').dialog({
          title: 'Burgs bulk renaming', position: {my: 'center', at: 'center', of: 'svg'},
          buttons: {
            Cancel: function() {$(this).dialog('close')},
            Confirm: function() {
              for (let i = 0; i < change.length; i++) {
                const id = change[i].i
                self.manors[id].name = change[i].name
                labels.select('[data-id=\'' + id + '\']').text(change[i].name)
              }
              $(this).dialog('close')
              updateCountryEditors()
            }
          }
        })
      }
      fileReader.readAsText(fileToLoad, 'UTF-8')
    })

    // just apply map size that was already set, apply graph size!
    function applyMapSize() {
      self.applyDimensions()
      svg.attr('width', self.svgWidth).attr('height', self.svgHeight)
      // set extent to map borders + 100px to get infinity world reception
      voronoi = d3.voronoi().extent([[-1, -1], [self.graphWidth + 1, self.graphHeight + 1]])
      zoom.translateExtent([[0, 0], [self.graphWidth, self.graphHeight]])
          .scaleExtent([1, 20])
          .scaleTo(svg, 1)
      viewbox.attr('transform', null)
      ocean.selectAll('rect').attr('x', 0).attr('y', 0)
           .attr('width', self.graphWidth)
           .attr('height', self.graphHeight)
    }

    // change svg size on manual size change or window resize, do not change graph size
    function changeMapSize() {
      fitScaleBar()
      self.setDimensions('svg', +mapHeightInput.value, +mapWidthInput.value)
      svg.attr('width', self.svgWidth).attr('height', self.svgHeight)
      const width = Math.max(self.svgWidth, self.graphWidth)
      const height = Math.max(self.svgHeight, self.graphHeight)
      zoom.translateExtent([[0, 0], [width, height]])
      svg.select('#ocean').selectAll('rect').attr('x', 0)
         .attr('y', 0).attr('width', width).attr('height', height)
    }

    // fit full-screen map if window is resized
    $(window).resize(function(e) {
      // trick to prevent resize on download bar opening
      if (self.autoResize === false) return
      mapWidthInput.value = window.innerWidth
      mapHeightInput.value = window.innerHeight
      changeMapSize()
    })

    // fit ScaleBar to map size
    function fitScaleBar() {
      const el = d3.select('#scaleBar')
      if (!el.select('rect').size()) return
      const bbox = el.select('rect').node().getBBox()
      let tr = [self.svgWidth - bbox.width, self.svgHeight - (bbox.height - 10)]
      if (sessionStorage.getItem('scaleBar')) {
        const scalePos = sessionStorage.getItem('scaleBar').split(',')
        tr = [+scalePos[0] - bbox.width, +scalePos[1] - bbox.height]
      }
      el.attr('transform', 'translate(' + Math.round(tr[0]) + ',' + Math.round(tr[1]) + ')')
    }

    // Other Options handlers
    $('input, select').on('input change', function() {
      const id = this.id
      if (id === 'hideLabels') invokeActiveZooming()
      if (id === 'mapWidthInput' || id === 'mapHeightInput') {
        changeMapSize()
        self.autoResize = false
        localStorage.setItem('mapWidth', mapWidthInput.value)
        localStorage.setItem('mapHeight', mapHeightInput.value)
      }
      if (id === 'sizeInput') {
        self.graphSize = sizeOutput.value = +this.value
        if (self.graphSize === 3) {sizeOutput.style.color = 'red'}
        if (self.graphSize === 2) {sizeOutput.style.color = 'yellow'}
        if (self.graphSize === 1) {sizeOutput.style.color = 'green'}
        // localStorage.setItem("graphSize", this.value); - temp off to always start with size 1
      }
      if (id === 'templateInput') {localStorage.setItem('template', this.value)}
      if (id === 'manorsInput') {
        manorsOutput.value = this.value
        localStorage.setItem('manors', this.value)
      }
      if (id === 'regionsInput') {
        regionsOutput.value = this.value
        let size = Math.round(6 - this.value / 20)
        if (size < 3) {size = 3}
        burgLabels.select('#capitals').attr('data-size', size)
        size = Math.round(18 - this.value / 6)
        if (size < 4) {size = 4}
        labels.select('#countries').attr('data-size', size)
        localStorage.setItem('regions', this.value)
      }
      if (id === 'powerInput') {
        powerOutput.value = this.value
        localStorage.setItem('power', this.value)
      }
      if (id === 'neutralInput') {
        neutralOutput.value = countriesNeutral.value = this.value
        localStorage.setItem('neutal', this.value)
      }
      if (id === 'culturesInput') {
        culturesOutput.value = this.value
        localStorage.setItem('cultures', this.value)
      }
      if (id === 'precInput') {
        precOutput.value = +precInput.value
        localStorage.setItem('prec', this.value)
      }
      if (id === 'swampinessInput') {
        swampinessOutput.value = this.value
        localStorage.setItem('swampiness', this.value)
      }
      if (id === 'outlineLayersInput') localStorage.setItem('outlineLayers', this.value)
      if (id === 'transparencyInput') changeDialogsTransparency(this.value)
      if (id === 'pngResolutionInput') localStorage.setItem('pngResolution', this.value)
      if (id === 'zoomExtentMin' || id === 'zoomExtentMax') {
        zoom.scaleExtent([+zoomExtentMin.value, +zoomExtentMax.value])
        zoom.scaleTo(svg, +this.value)
      }

      if (id === 'convertOverlay') {
        canvas.style.opacity = convertOverlayValue.innerHTML = +this.value
      }
      if (id === 'populationRate') {
        populationRateOutput.value = si(+populationRate.value * 1000)
        updateCountryEditors()
      }
      if (id === 'urbanization') {
        urbanizationOutput.value = this.value
        updateCountryEditors()
      }
      if (id === 'distanceUnit' || id === 'distanceScale' || id === 'areaUnit') {
        const dUnit = distanceUnit.value
        if (id === 'distanceUnit' && dUnit === 'custom_name') {
          const custom = prompt('Provide a custom name for distance unit')
          if (custom) {
            const opt = document.createElement('option')
            opt.value = opt.innerHTML = custom
            distanceUnit.add(opt)
            distanceUnit.value = custom
          } else {
            this.value = 'km'
            return
          }
        }
        const scale = distanceScale.value
        scaleOutput.value = scale + ' ' + dUnit
        ruler.selectAll('g').each(function() {
          let label
          const g = d3.select(this)
          const area = +g.select('text').attr('data-area')
          if (area) {
            const areaConv = area * Math.pow(scale, 2) // convert area to distanceScale
            let unit = areaUnit.value
            if (unit === 'square') {unit = dUnit + '²'} else {unit = areaUnit.value}
            label = si(areaConv) + ' ' + unit
          } else {
            const dist = +g.select('text').attr('data-dist')
            label = Math.round(dist * scale) + ' ' + dUnit
          }
          g.select('text').text(label)
        })
        ruler.selectAll('.gray').attr('stroke-dasharray', _.round(30 / scale, 2))
        drawScaleBar()
        updateCountryEditors()
      }
      if (id === 'barSize') {
        barSizeOutput.innerHTML = this.value
        $('#scaleBar').removeClass('hidden')
        drawScaleBar()
      }
      if (id === 'barLabel') {
        $('#scaleBar').removeClass('hidden')
        drawScaleBar()
      }
      if (id === 'barBackOpacity' || id === 'barBackColor') {
        d3.select('#scaleBar > rect')
          .attr('opacity', +barBackOpacity.value)
          .attr('fill', barBackColor.value)
        $('#scaleBar').removeClass('hidden')
      }
    })

    $('#scaleOutput').change(function() {
      if (this.value === '' || isNaN(+this.value) || this.value < 0.01 || this.value > 10) {
        tip('Manually entered distance scale should be a number in a [0.01; 10] range')
        this.value = distanceScale.value + ' ' + distanceUnit.value
        return
      }
      distanceScale.value = +this.value
      scaleOutput.value = this.value + ' ' + distanceUnit.value
      updateCountryEditors()
    })

    $('#populationRateOutput').change(function() {
      if (this.value === '' || isNaN(+this.value) || this.value < 0.001 || this.value > 10) {
        tip('Manually entered population rate should be a number in a [0.001; 10] range')
        this.value = si(populationRate.value * 1000)
        return
      }
      populationRate.value = +this.value
      populationRateOutput.value = si(this.value * 1000)
      updateCountryEditors()
    })

    $('#urbanizationOutput').change(function() {
      if (this.value === '' || isNaN(+this.value) || this.value < 0 || this.value > 10) {
        tip('Manually entered urbanization rate should be a number in a [0; 10] range')
        this.value = urbanization.value
        return
      }
      const val = parseFloat(+this.value)
      if (val > 2) urbanization.setAttribute('max', val)
      urbanization.value = urbanizationOutput.value = val
      updateCountryEditors()
    })

    // lock manually changed option to restrict it randomization
    $('#optionsContent input, #optionsContent select').change(function() {
      const icon = 'lock' + this.id.charAt(0).toUpperCase() + this.id.slice(1)
      const el = document.getElementById(icon)
      if (!el) return
      el.setAttribute('data-locked', 1)
      el.className = 'icon-lock'
    })

    $('#optionsReset').click(restoreDefaultOptions)

    $('#rescaler').change(function() {
      const change = _.round((+this.value - 5), 2)
      modifyHeights('all', change, 1)
      updateHeightmap()
      updateHistory()
      rescaler.value = 5
    })

    $('#layoutPreset').on('change', function() {
      const preset = this.value
      $('#mapLayers li').not('#toggleOcean').addClass('buttonoff')
      $('#toggleOcean').removeClass('buttonoff')
      $('#oceanPattern').fadeIn()
      $('#rivers, #terrain, #borders, #regions, #icons, #labels, #routes, #grid, #markers')
        .fadeOut()
      cults.selectAll('path').remove()
      terrs.selectAll('path').remove()
      if (preset === 'layoutPolitical') {
        toggleRivers.click()
        toggleRelief.click()
        toggleBorders.click()
        toggleCountries.click()
        toggleIcons.click()
        toggleLabels.click()
        toggleRoutes.click()
        toggleMarkers.click()
      }
      if (preset === 'layoutCultural') {
        toggleRivers.click()
        toggleRelief.click()
        toggleBorders.click()
        $('#toggleCultures').click()
        toggleIcons.click()
        toggleLabels.click()
        toggleMarkers.click()
      }
      if (preset === 'layoutHeightmap') {
        $('#toggleHeight').click()
        toggleRivers.click()
      }
    })

    // UI Button handlers
    $('.tab > button').on('click', function() {
      $('.tabcontent').hide()
      $('.tab > button').removeClass('active')
      $(this).addClass('active')
      const id = this.id
      if (id === 'layoutTab') {$('#layoutContent').show()}
      if (id === 'styleTab') {$('#styleContent').show()}
      if (id === 'optionsTab') {$('#optionsContent').show()}
      if (id === 'customizeTab') {$('#customizeContent').show()}
      if (id === 'aboutTab') {$('#aboutContent').show()}
    })

    // re-load page with provided seed
    $('#optionsSeedGenerate').on('click', function() {
      if ($('#optionsSeed').value == self.seed) return
      self.seed = $('#optionsSeed').value
      const url = new URL(window.location.href)
      window.location.href = url.pathname + '?seed=' + self.seed
    })

    // Pull request from @evyatron
    // https://github.com/Azgaar/Fantasy-Map-Generator/pull/49
    function addDragToUpload() {
      document.addEventListener('dragover', function(e) {
        e.stopPropagation()
        e.preventDefault()
        $('#map-dragged').show()
      })

      document.addEventListener('dragleave', function(e) {
        $('#map-dragged').hide()
      })

      document.addEventListener('drop', function(e) {
        e.stopPropagation()
        e.preventDefault()
        $('#map-dragged').hide()
        // no files or more than one
        if (e.dataTransfer.items == null || e.dataTransfer.items.length != 1) {return}
        const file = e.dataTransfer.items[0].getAsFile()
        // not a .map file
        if (file.name.indexOf('.map') == -1) {
          alertMessage.innerHTML =
            'Please upload a <b>.map</b> file you have previously downloaded'
          $('#alert').dialog({
            resizable: false, title: 'Invalid file format',
            width: 400, buttons: {
              Close: function() { $(this).dialog('close') }
            }, position: {my: 'center', at: 'center', of: 'svg'}
          })
          return
        }
        // all good - show uploading text and load the map
        $('#map-dragged > p').text('Uploading<span>.</span><span>.</span><span>.</span>')
        uploadFile(file, function onUploadFinish() {
          $('#map-dragged > p').text('Drop to upload')
        })
      })
    }

    function tip(tip, main, error) {
      const tooltip = d3.select('#tooltip')
      const reg = 'linear-gradient(0.1turn, #ffffff00, #5e5c5c4d, #ffffff00)'
      const red = 'linear-gradient(0.1turn, #ffffff00, #c71d1d66, #ffffff00)'
      tooltip.text(tip).style('background', error ? red : reg)
      if (main) tooltip.attr('data-main', tip)
    }

    window.tip = tip
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
