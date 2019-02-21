<template>
 <div id="optionsContainer" class="hidden">
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
    <StyleContent/>
    <OptionsContent/>
    <CustomizeContent/>
    <AboutContent/>
    <Stickied/>
  </div>
</div>
</template>

<script>
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
  }
}
</script>

<style scoped>

</style>