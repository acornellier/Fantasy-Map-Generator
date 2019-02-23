<template>
<div id="optionsContainer">
  <div id="collapsible">
    <button id="optionsTrigger" onmouseover="tip('Click to toggle options. Hotkey: O')"
            class="options icon-right-open glow"/>
    <button id="regenerate" onmouseover="tip('Click to generate a new map. Hotkey: F6')"
            class="options">
      New Map!
    </button>
  </div>
  <div id="options">
    <div class="drag-trigger" onmouseover="tip('Drag to move options pane')"/>
    <div class="tab">
      <button id="layoutTab" onmouseover="tip('Click to open layout menu')" class="options">
        Layout
      </button>
      <button id="styleTab" onmouseover="tip('Click to style menu')" class="options">
        Style
      </button>
      <button id="optionsTab" onmouseover="tip('Click to change generation options')"
              class="options">
        Options
      </button>
      <button id="customizeTab" onmouseover="tip('Click to open customization menu')"
              class="options">
        Customize
      </button>
      <button id="aboutTab" onmouseover="tip('Click to see Generator info')" class="options">
        ?
      </button>
    </div>
    <LayoutContent
      @toggleOverlay="toggleOverlay"
      @toggleHeight="toggleHeight"
    />
    <StyleContent
      @updateLabelGroups="updateLabelGroups"
      @applyDefaultStyle="applyDefaultStyle"
      @toggleHeight="toggleHeight"
    />
    <OptionsContent/>
    <CustomizeContent/>
    <AboutContent/>
    <Stickied/>
  </div>
</div>
</template>

<script>
import * as $ from 'jquery'
import * as d3 from 'd3'
import LayoutContent from './LayoutContent.vue'
import StyleContent from './StyleContent.vue'
import OptionsContent from './OptionsContent.vue'
import CustomizeContent from './CustomizeContent.vue'
import AboutContent from './AboutContent.vue'
import Stickied from './Stickied.vue'
import {mapState} from 'vuex'

function getHex(radius, type) {
  let x0 = 0, y0 = 0
  let s = type === 'pointyHex' ? 0 : Math.PI / -6
  let thirdPi = Math.PI / 3
  let angles = [s, s + thirdPi, s + 2 * thirdPi, s + 3 * thirdPi, s + 4 * thirdPi, s + 5 * thirdPi]
  return angles.map(function(angle) {
    const x1 = Math.sin(angle) * radius,
      y1 = -Math.cos(angle) * radius,
      dx = x1 - x0,
      dy = y1 - y0
    x0 = x1
    y0 = y1
    return [dx, dy]
  })
}

export default {
  name: 'Options',
  components: {
    LayoutContent,
    StyleContent,
    OptionsContent,
    CustomizeContent,
    AboutContent,
    Stickied,
  },
  mounted() {
    $('#optionsContainer').draggable({handle: '.drag-trigger', snap: 'svg', snapMode: 'both'})
    $('#optionsContainer *').on('mouseout', function() {
      let tooltip = document.getElementById('tooltip')
      tooltip.innerHTML = tooltip.getAttribute('data-main')
    })

    // Toggle Options pane
    $('#optionsTrigger').on('click', function() {
      let tooltip = document.getElementById('tooltip')
      if (tooltip.getAttribute('data-main') === 'Сlick the arrow button to open options') {
        tooltip.setAttribute('data-main', '')
        tooltip.innerHTML = ''
        localStorage.setItem('disable_click_arrow_tooltip', true)
      }
      if ($('#options').css('display') === 'none') {
        $('#regenerate').hide()
        $('#options').fadeIn()
        $('#layoutTab').click()
        $('#optionsTrigger').removeClass('icon-right-open glow').addClass('icon-left-open')
      } else {
        $('#options').fadeOut()
        $('#optionsTrigger').removeClass('icon-left-open').addClass('icon-right-open')
      }
    })
    $('#collapsible').hover(function() {
      if ($('#optionsTrigger').hasClass('glow')) return
      if ($('#options').css('display') === 'none') {
        $('#regenerate').show()
        $('#optionsTrigger').removeClass('glow')
      }
    }, function() {
      $('#regenerate').hide()
    })

    // lock / unlock option randomization
    $('#options i[class^=\'icon-lock\']').click(function() {
      $(this).toggleClass('icon-lock icon-lock-open')
      const locked = +$(this).hasClass('icon-lock')
      $(this).attr('data-locked', locked)
      const option = (this.id).slice(4, -5).toLowerCase()
      const value = $('#' + option + 'Input').val()
      if (locked) {localStorage.setItem(option, value)} else {localStorage.removeItem(option)}
    })
  },
  computed: mapState({
    graphHeight: state => state.graphic.graph.height,
    graphWidth: state => state.graphic.graph.width,
    svgHeight: state => state.graphic.svg.height,
    svgWidth: state => state.graphic.svg.width,
  }),
  methods: {
    updateLabelGroups() { this.$emit('updateLabelGroups') },
    applyDefaultStyle() { this.$emit('applyDefaultStyle') },
    toggleHeight() { this.$emit('toggleHeight') },
    toggleOverlay() {
      const overlay = d3.select('svg').select('#viewbox').select('#overlay')
      if (overlay.selectAll('*').size() !== 0)
        overlay.selectAll('*').remove()

      const type = $('#styleOverlayType').value
      let size = +$('#styleOverlaySize').value
      if (type === 'pointyHex' || type === 'flatHex') {
        let points = this.getHexGridPoints(size, type)
        let hex = 'm' + getHex(size, type).slice(0, 4).join('l')
        let d = points.map(function(p) {return 'M' + p + hex}).join('')
        overlay.append('path').attr('d', d)
      } else if (type === 'square') {
        const x = d3.range(size, this.svgWidth, size)
        const y = d3.range(size, this.svgHeight, size)
        overlay.append('g').selectAll('line').data(x).enter().append('line')
               .attr('x1', function(d) {return d})
               .attr('x2', function(d) {return d})
               .attr('y1', 0).attr('y2', this.svgHeight)
        overlay.append('g').selectAll('line').data(y).enter().append('line')
               .attr('y1', function(d) {return d})
               .attr('y2', function(d) {return d})
               .attr('x1', 0).attr('x2', this.svgWidth)
      } else {
        const tr = `translate(80 80) scale(${size / 20})`
        d3.select('#rose').attr('transform', tr)
        overlay.append('use').attr('xlink:href', '#rose')
      }
      // overlay.call(d3.drag().on('start', elementDrag))

      if ($('#styleOverlayType').value === 'windrose') {
        $('#styleOverlaySizeFriendly').innerHTML = ''
        return
      }
      if ($('#styleOverlayType').value === 'pointyHex' || $('#styleOverlayType').value === 'flatHex')
        size *= Math.cos(30 * Math.PI / 180) * 2
      $('#styleOverlaySizeFriendly').value = '(' + Math.round(size * $('#distanceScale').value) + ' ' + $('#distanceUnit').value + ')'
    },
    getHexGridPoints(size, type) {
      let points = []
      const rt3 = Math.sqrt(3)
      const off = type === 'pointyHex' ? rt3 * size / 2 : size * 3 / 2
      const ySpace = type === 'pointyHex' ? size * 3 / 2 : rt3 * size / 2
      const xSpace = type === 'pointyHex' ? rt3 * size : size * 3
      for (let y = 0, l = 0; y < this.graphHeight; y += ySpace, l++) {
        for (let x = l % 2 ? 0 : off; x < this.graphWidth; x += xSpace) {
          points.push([x, y])
        }
      }
      return points
    },
  }
}
</script>

<style scoped>

</style>