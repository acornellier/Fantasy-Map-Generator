<template>
<div id="brushesPanel" class="dialog stable" style="display: none">
    <div id="brushesButtons">
      <button id="brushElevate"
              onmouseover="tip('Click and drag the map to increase cells elevation')"
              class="noicon">↥
      </button>
      <button id="brushDepress"
              onmouseover="tip('Click and drag the map to decrease cells elevation')"
              class="noicon">↧
      </button>
      <button id="brushAlign"
              onmouseover="tip('Click and drag the map to align cells elevation')"
              class="noicon">=
      </button>
      <button id="brushSmooth"
              onmouseover="tip('Click and drag the map to smooth cells elevation')"
              class="noicon">~
      </button>
      <button id="brushHill" onmouseover="tip('Click on the map to place a Hill')"
              class="feature noicon">H
      </button>
      <button id="brushPit" onmouseover="tip('Click on the map to place a Pit')"
              class="feature noicon">P
      </button>
      <button id="brushRange" onmouseover="tip('Select two points to place a Range')"
              class="feature noicon">R
      </button>
      <button id="brushTrough" onmouseover="tip('Select two points to place a Trought')"
              class="feature noicon">T
      </button>
    </div>
    <div style="display: table;">
      <label id="brushRadiusLabel"
             onmouseover="tip('Set the brush effective radius. Works only with 4 brushes above')"
             class="disabled italic">R:</label>
      <input id="brushRadius" oninput="tip('Brush radius: '+this.value)" type="range" min="1"
             max="10" value="3" class="disabled" disabled>
      <label onmouseover="tip('Set the brush power in points of height')"
             class="italic">H:</label>
      <input id="brushPower" oninput="tip('Brush power: '+this.value)" type="range" min="1"
             max="30" value="5">
    </div>
    <div id="modifyButtons">
      <button id="undo" onmouseover="tip('Undo the latest action (Ctrl + Z)')" class="icon-ccw"
              disabled></button>
      <button id="redo" onmouseover="tip('Redo the action (Ctrl + Y)')" class="icon-cw"
              disabled></button>
      <button id="rescaleButton" onmouseover="tip('Show rescaler slider')"
              class="icon-exchange"></button>
      <input id="rescaler" onmouseover="tip('Slide to change map height')" type="range" min="1"
             max="10" step="0.1" value="5" class="hidden">
      <button id="rescaleCondButton" onmouseover="tip('Conditional rescaler')"
              class="icon-if"></button>
      <label class="condition hidden">h ≥</label>
      <input id="rescaleLower" class="condition hidden" onmouseover="tip('Set lower threshold')"
             value="20" type="number" min="0" max="100">
      <label class="condition hidden">≤</label>
      <input id="rescaleHigher" class="condition hidden"
             onmouseover="tip('Set higher threshold')" value="100" type="number" min="1"
             max="100">
      <label class="condition hidden">⇒</label>
      <select class="condition hidden" id="conditionSign">
        <option value="×" selected>×</option>
        <option value="÷">÷</option>
        <option value="+">+</option>
        <option value="-">-</option>
        <option value="^">^</option>
      </select>
      <input id="rescaleModifier" onmouseover="tip('Set modifier value')" type="number"
             value="0.9" min="0" max="1.5" step="0.01" class="condition hidden">
      <button id="rescaleExecute" onmouseover="tip('Run condition')"
              class="icon-play-circled2 condition hidden"></button>
      <button id="smoothHeights" onmouseover="tip('Smooth all heights')"
              class="icon-smooth"></button>
      <button id="disruptHeights" onmouseover="tip('Disrupt (randomize) heights')"
              class="icon-disrupt"></button>
      <button id="brushClear" onmouseover="tip('Clear all height')"
              class="icon-eraser"></button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'BrushesPanel'
}
</script>