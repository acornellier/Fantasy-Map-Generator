<template>
<div id="iconEditor" class="dialog" style="display: none">
  <button id="iconGroups" onmouseover="tip('Change icon group')" class="icon-tags"></button>
  <div id="iconGroupsSelection" style="display: none">
    <select id="iconGroup" onmouseover="tip('Select a group for this icon')"></select>
    <i id="iconRemoveGroup" onmouseover="tip('Remove selected icon group')"
       class="icon-trash pointer"></i>
  </div>
  <button id="iconColors" onmouseover="tip('Change icon colors')"
          class="editButton icon-brush"></button>
  <div id="iconColorsSection" style="display: none">
    <i onmouseover="tip('Change group fill color')" class="icon-f"></i>
    <input id="iconFillColor" onmouseover="tip('Change group fill color')" type="color"
           class="editColor" value="#000000">
    <i onmouseover="tip('Change group stroke color')" class="icon-s"></i>
    <input id="iconStrokeColor" onmouseover="tip('Change group stroke color')" type="color"
           class="editColor" value="#000000">
  </div>
  <button id="iconSetSize" onmouseover="tip('Change group size')"
          class="icon-resize-full"></button>
  <div id="iconSizeSection" style="display: none">
    <i onmouseover="tip('Change size for group icon')" class="icon-s"></i>
    <input id="iconSize" onmouseover="tip('Change size for group icon')" type="range"
           class="editRange" value="1" min=".5" max="10" step=".05"></select>
    <i onmouseover="tip('Change group stroke-width')" class="icon-w"></i>
    <input id="iconStrokeWidth" onmouseover="tip('Change group stroke-width')" type="number"
           class="editNumber" value="1" min="0" max="5" step=".02"></select>
  </div>
  <button id="iconCopy" onmouseover="tip('Copy the icon')" class="icon-clone"></button>
  <button id="iconRemove" onmouseover="tip('Remove icon')" class="icon-trash"></button>
</div>
</template>
<script>
export default {
  name: 'IconEditor'
}
</script>