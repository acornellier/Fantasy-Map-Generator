<template>
<div id="legendEditor" class="dialog stable textual" style="display: none">
  <div>
    <span>Select object: </span>
    <select id="legendSelect" onmouseover="tip('Select object')"
            style="width: 120px;"></select>
    <span>Object name: </span>
    <input id="legendName" onmouseover="tip('Type to change object name')" autocorrect="off"
           spellcheck="false" style="width: 120px;">
  </div>
  <div>
    <span>Legend:</span><br>
    <textarea id="legendText" cols="70" rows="7"
              onmouseover="tip('Legend is a free text note, enter any object description you like')"
              placeholder="Legend is a free text note, enter any object description you like"></textarea>
  </div>
  <div>
    <button id="legendFocus" onmouseover="tip('Focus map on selected object')"
            class="icon-target"></button>
    <button id="legendDownload" onmouseover="tip('Download legends to PC')"
            class="icon-download"></button>
    <button id="legendUpload" onmouseover="tip('Upload legends from PC')"
            class="icon-upload"></button>
    <button id="legendRemove" onmouseover="tip('Remove this note')"
            class="icon-trash"></button>
  </div>
</div>
</template>
<script>
export default {
  name: 'LegendEditor'
}
</script>