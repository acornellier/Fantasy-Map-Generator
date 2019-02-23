<template>
<div id="imageConverter" class="dialog stable" style="display: none">
    <div id="convertImageButtons">
      <button id="convertImageLoad" onmouseover="tip('Load image to convert')"
              class="icon-upload"></button>
      <button id="convertAutoLum" onmouseover="tip('Auto-assign colors based on liminosity')"
              class="icon-adjust"></button>
      <button id="convertAutoHue" onmouseover="tip('Auto-assign colors based on hue')"
              class="icon-brush"></button>
      <button id="convertColorsMinus"
              onmouseover="tip('Reduce the number of colors. Minimal number is 3')"
              class="icon-minus-squared"></button>
      <button id="convertColorsPlus"
              onmouseover="tip('Increase the number of colors. Maximum number is 256')"
              class="icon-plus-squared"></button>
      <input id="convertColors" value="12" style="display: none;"/>
      <button id="convertImageGrid" onmouseover="tip('Toggle grid')" class="icon-eye"></button>
      <button id="convertOverlayButton" onmouseover="tip('Change overlay opacity')"
              class="icon-clone"></button>
      <input id="convertOverlay" onmouseover="tip('Change overlay opacity')" type="range"
             min="0" max="1" step="0.01" value="0" style="display: none;">
      <span id="convertOverlayValue" onmouseover="tip('Overlay opacity')"
            style="display: none;">0</span>
      <button id="convertComplete"
              onmouseover="tip('Complete conversion. All unassigned colors will be considered as ocean')"
              class="icon-check"></button>
    </div>
    <div id="colorsSelect">
      <div id="colorScheme"></div>
      <span id="colorsSelectValue">0</span>
    </div>
    <div id="colorsAssigned" style="display: none">
      <label>Assigned colors: </label><br>
    </div>
    <div id="colorsUnassigned" style="display: none">
      <label>Unassigned colors: </label><br>
    </div>
  </div>
</template>
<script>
export default {
    name: 'ImageConverter'
  }
</script>