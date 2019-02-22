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
    <LayoutContent/>
    <StyleContent
      @updateLabelGroups="updateLabelGroups"
      @applyDefaultStyle="applyDefaultStyle"
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

import LayoutContent from './LayoutContent.vue'
import StyleContent from './StyleContent.vue'
import OptionsContent from './OptionsContent.vue'
import CustomizeContent from './CustomizeContent.vue'
import AboutContent from './AboutContent.vue'
import Stickied from './Stickied.vue'

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
  methods: {
    updateLabelGroups() { this.$emit('updateLabelGroups') },
    applyDefaultStyle() { this.$emit('applyDefaultStyle') },
  }
}
</script>

<style scoped>

</style>