<template>
<div id="riverEditor" class="dialog" style="display: none">
  <button id="riverWidth" onmouseover="tip('Change river width and widening')"
          class="icon-sort-alt-up"
          onclick='$("#riverEditor > *").not(this).not("#riverResizeButtons").toggle();'></button>
  <div id="riverWidthButtons" style="display: none">
    <i id="riverWidthIcon" onmouseover="tip('Change river width')" class="icon-w"></i>
    <input id="riverWidthInput" onmouseover="tip('Change river width')" value="1" type="range"
           min="0.2" max="5" step="0.1">
    <i id="riverIncrementIcon"
       onmouseover="tip('Change river bed increment (widening speed)')" class="icon-i"></i>
    <input id="riverIncrement"
           onmouseover="tip('Change river bed increment (widening speed)')" value="1"
           type="range" min="0.02" max="2" step="0.02">
  </div>
  <button id="riverRegenerate" onmouseover="tip('Regenerate river')"
          class="icon-shuffle"></button>
  <button id="riverResize" onmouseover="tip('Visually transform (rotate, rescale) river')"
          class="icon-ccw"
          onclick='$("#riverEditor > *").not(this).not("#riverWidthButtons").toggle();'></button>
  <div id="riverResizeButtons" style="display: none">
    <i id="riverAngleIcon" onmouseover="tip('Rotate river (set angle)')" class="icon-a"></i>
    <input id="riverAngle" onmouseover="tip('Rotate river (set angle)')" value="0"
           type="range" min="-90" max="90" step="0.2">
    <span id="riverAngleValue">0°</span>
    <i id="riverScaleIcon" onmouseover="tip('Change river scale')" class="icon-s"></i>
    <input id="riverScale" onmouseover="tip('Change river scale')" value="1" type="number"
           min="0.1" max="3" step="0.01">
    <span id="riverReset" onmouseover="tip('Reset transformation to default')"
          class="icon-cancel pointer"></span>
  </div>
  <button id="riverCopy" onmouseover="tip('Copy river')" class="icon-clone"></button>
  <button id="riverLegend" onmouseover="tip('Edit free text notes (legend) for the river')"
          class="icon-edit"></button>
  <button id="riverNew" onmouseover="tip('Create new river clicking on map')"
          class="icon-map-pin"></button>
  <button id="riverRemove" onmouseover="tip('Remove river')" class="icon-trash"></button>
</div>
</template>
<script>
export default {
  name: 'RiverEditor'
}
</script>
