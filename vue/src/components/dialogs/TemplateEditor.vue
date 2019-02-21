<template>
<div id="templateEditor" class="dialog stable" style="display: none">
    <div id="templateTop">
      Base template: <select id="templateSelect" data-prev="templateCustom"
                             onmouseover="tip('Select base template')">
      <option value="templateCustom" selected>Custom</option>
      <option value="templateVolcano">Volcano</option>
      <option value="templateHighIsland">High Island</option>
      <option value="templateLowIsland">Low Island</option>
      <option value="templateContinents">Continents</option>
      <option value="templateArchipelago">Archipelago</option>
      <option value="templateAtoll">Atoll</option>
      <option value="templateMainland">Mainland</option>
      <option value="templatePeninsulas">Peninsulas</option>
    </select>
    </div>
    <div id="templateTools">
      <button id="templateMountain"
              onmouseover="tip('Mountain: high big blob. Can be placed only once and only as a first step')"
              class="noicon">M
      </button>
      <button id="templateHill" onmouseover="tip('Hill: small blob')" class="noicon">H</button>
      <button id="templatePit" onmouseover="tip('Pit: round depression')" class="noicon">P
      </button>
      <button id="templateRange" onmouseover="tip('Range: elongated elevation')" class="noicon">
        R
      </button>
      <button id="templateTrough" onmouseover="tip('Trough: elongated depression')"
              class="noicon">T
      </button>
      <button id="templateStrait" onmouseover="tip('Strait: centered vertical depression')"
              class="noicon">S
      </button>
      <button id="templateAdd" onmouseover="tip('Add or subtract value from all heights')"
              class="noicon">+
      </button>
      <button id="templateMultiply" onmouseover="tip('Multiply all heights by factor')"
              class="noicon">*
      </button>
      <button id="templateSmooth"
              onmouseover="tip('Smooth the map replacing cell heights by an average values of its neighbors')"
              class="noicon">~
      </button>
    </div>
    <div id="templateBody" data-changed=0>
      <div data-type="Mountain">Mountain
        <span onmouseover="tip('Remove step')" class="icon-trash-empty"
              onclick="this.parentNode.parentNode.removeChild(this.parentNode)"></span>
      </div>
    </div>
    <div id="templateBottom">
      <button id="templateRun" onmouseover="tip('Apply current template')"
              class="icon-play-circled2"></button>
      <button id="templateUndo" onmouseover="tip('Undo the latest action')" class="icon-ccw"
              disabled></button>
      <button id="templateRedo" onmouseover="tip('Redo the action')" class="icon-cw"
              disabled></button>
      <button id="templateComplete"
              onmouseover="tip('Finalize the Heightmap. Not allowed if insufficient land area available')"
              class="icon-check"></button>
      <button id="templateSave" onmouseover="tip('Save template')"
              class="icon-download"></button>
      <button id="templateLoad" onmouseover="tip('Open previously saved template')"
              class="icon-upload"></button>
      <button id="templateMail"
              onclick="window.open('mailto:maxganiev@yandex.com?Subject=Template%20suggestion', '_blank')"
              onmouseover="tip('Send a template suggestion to me')"
              class="icon-mail-alt"></button>
    </div>
  </div>
</template>
<script>
export default {
    name: 'TemplateEditor'
  }
</script>