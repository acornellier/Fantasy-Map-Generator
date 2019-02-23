<template>
<div id="reliefEditor" class="dialog" style="display: none">

  <button id="reliefGroups" onmouseover="tip('Change relief icon')"
          class="icon-tags"></button>
  <div id="reliefGroupsSelection" style="display: none">
    <select id="reliefGroup" onmouseover="tip('Change relief icon')">
      <option value="mounts" selected>mounts</option>
      <option value="hills">hills</option>
      <option value="swamps">swamps</option>
      <option value="forests">forests</option>
    </select>
    <i id="reliefRemoveGroup" onmouseover="tip('Remove all icons within selected group')"
       class="icon-trash pointer"></i>
  </div>

  <button id="reliefCopy" onmouseover="tip('Copy the relief icon')"
          class="icon-clone"></button>
  <button id="reliefAddfromEditor" onmouseover="tip('Add relief Icon')"
          class="icon-plus"></button>

  <button id="reliefBulkRemove" onmouseover="tip('Erase all relief icons in radius')"
          class="icon-eraser"></button>
  <div id="reliefBulkRemoveSection" style="display: none">
    <input id="reliefBulkRemoveRadius"
           oninput="tip('Eraser brush size: '+this.value); reliefBulkRemoveRadiusNumber.value = this.value"
           type="range" min="1" max="7" value="3">
    <input id="reliefBulkRemoveRadiusNumber"
           oninput="tip('Eraser brush size: '+this.value); reliefBulkRemoveRadius.value = this.value"
           type="number" min="1" max="7" value="3">
  </div>

  <button id="reliefRemove" onmouseover="tip('Remove this relief icon')"
          class="icon-trash"></button>
</div>
</template>
<script>
export default {
  name: 'ReliefEditor'
}
</script>