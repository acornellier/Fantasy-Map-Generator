<template>
<div id="burgEditor" class="dialog" style="display: none">
  <button id="burgGroup" onmouseover="tip('Change Burg Group')" class="icon-tags"></button>
  <div id="burgGroupSection" style="display: none">
    <select id="burgSelectGroup" onmouseover="tip('Select a Group for this Burg')"
            style="width: 117px;"></select>
    <input id="burgInputGroup" placeholder="type new Group name"
           onmouseover="tip('Create new Group for the Burg')"
           style="display: none; width: 113px;"/>
    <i id="burgAddGroup" onmouseover="tip('Create new Group for the Burg')"
       class="icon-plus pointer"></i>
    <i id="burgRemoveGroup" onmouseover="tip('Remove selected Burg Group')"
       class="icon-trash pointer"></i>
  </div>

  <button id="burgEditLabel" onmouseover="tip('Change label for the Burg Group')"
          class="icon-map-signs"></button>
  <div id="burgEditLabelSection" style="display: none">

    <button id="burgName" onmouseover="tip('Change Burg name')" class="icon-pencil"></button>
    <div id="burgNameSection" style="display: none">
      <input id="burgNameInput" onmouseover="tip('Populate to rename the Burg')"
             style="width: 117px"/>
      <span id="burgNameReCulture"
            onmouseover="tip('Generate culture-specific name for the Burg')"
            class="icon-book pointer"></span>
      <span id="burgNameReRandom" onmouseover="tip('Generate random name for the Burg')"
            class="icon-globe pointer"></span>
    </div>
    <button id="burgSelectFont" onmouseover="tip('Select font for the Burg Group label')"
            class="icon-font"></button>
    <div id="burgSelectFontSection" style="display: none">
      <i id="burgToggleExternalFont"
         onmouseover="tip('Fetch fonts by linking @font-face declaration, just populate with font name if using Google font (fonts.google.com)')"
         class="icon-link pointer"></i>
      <input id="burgInputExternalFont" placeholder="link to @font-face"
             onmouseover="tip('Fetch fonts by linking @font-face declaration')"
             style="display: none; width: 113px;"/>
      <select id="burgSelectDefaultFont" onmouseover="tip('Select a font for the Group')"
              style="width: 117px;"></select>
    </div>

    <button id="burgSetFontSize" onmouseover="tip('Set font size for the Burg Group label')"
            class="icon-text-height"></button>
    <div id="burgFontSizeSection" style="display: none">
      <input id="burgSetLabelSize" onmouseover="tip('Set font size for the Burg Group label')"
             value="14" type="number" min="1" max="100" step=".5" style="width: 117px"/>
    </div>

    <button id="burgLabelColor" onmouseover="tip('Set label color for the Burg Group')"
            class="icon-brush"></button>
    <div id="burgLabelColorSection" style="display: none">
      <input onmouseover="tip('Set label color for the Burg Group')" id="burgLabelColorInput"
             type="color" class="editColor" value="#3e3e4b">
      <i onmouseover="tip('Set label opacity for the Burg Group')" class="icon-adjust"></i>
      <input onmouseover="tip('Set label opacity for the Burg Group')" id="burgLabelOpacity"
             value="1" type="number" min="0" max="1" step="0.02">
    </div>

    <button id="burgLabelRotation" onmouseover="tip('Rotate the label')"
            class="icon-ccw"></button>
    <div id="burgLabelRotationSection" style="display: none; width: 142px;">
      <input id="burgLabelAngle" value="0" type="range" min="-90" max="90" step="0.2"
             style="width: 98px">
      <output id="burgLabelAngleOutput">0°</output>
    </div>
  </div>

  <button id="burgEditIcon" onmouseover="tip('Change icon for the Burg Group')"
          class="icon-fort-awesome"></button>
  <div id="burgEditIconSection" style="display: none">

    <button id="burgIconFill" onmouseover="tip('Change icon fill')"
            class="icon-dot-circled"></button>
    <div id="burgIconFillSection" style="display: none;">
      <i onmouseover="tip('Change icon size')" class="icon-resize-full"></i>
      <input id="burgIconSize" onmouseover="tip('Change icon size')" type="range"
             class="editRange" value="1" min=".1" max="5" step=".05"
             style="width: 60px;">
      <i onmouseover="tip('Set icon fill opacity')" class="icon-adjust"></i>
      <input id="burgIconFillOpacity" onmouseover="tip('Set icon fill opacity')" value="1"
             type="number" min="0" max="1" step="0.02" style="width: 40px;">
      <input id="burgIconFillColor" onmouseover="tip('Change icon fill color')" type="color"
             class="editColor" value="#000000">
    </div>

    <button id="burgIconStroke" onmouseover="tip('Change icon stroke')"
            class="icon-circle-empty"></button>
    <div id="burgIconStrokeSection" style="display: none;">
      <i onmouseover="tip('Change icon stroke width')" class="icon-resize-horizontal"></i>
      <input id="burgIconStrokeWidth" onmouseover="tip('Change icon stroke width')"
             type="number" value="1" min="0" max="2" step=".02" style="width: 40px;">
      <i onmouseover="tip('Set icon stroke opacity')" class="icon-adjust"></i>
      <input id="burgIconStrokeOpacity" onmouseover="tip('Set icon stroke opacity')" value="1"
             type="number" min="0" max="1" step="0.02" style="width: 40px;">
      <input id="burgIconStrokeColor" onmouseover="tip('Change icon stroke color')"
             type="color" class="editColor" value="#000000">
    </div>
  </div>

  <button id="burgFeatures" onmouseover="tip('Change Burg features')"
          class="icon-cog-alt"></button>
  <div id="burgFeaturesSection" style="display: none">
    <button id="burgToggleCapital"
            onmouseover="tip('Mark the Burg as country capital. Neutral burg cannot be a capital')"
            class="icon-star"></button>
    <button id="burgTogglePort"
            onmouseover="tip('Mark the Burg as port (toggle anchor icon)')"
            class="icon-anchor"></button>
    <i onmouseover="tip('Set Burg population')" class="icon-users"></i>
    <input id="burgPopulation" onmouseover="tip('Set Burg population (in population points)')"
           type="number" value="1" min="0" step="1" style="width: 40px;">
    <output id="burgPopulationFriendly" onmouseover="tip('Burg population (in people)')">
      1000
    </output>
  </div>

  <button id="burgSeeInMFCG"
          onmouseover="tip('See the burg representation in Medieval Fantasy City Generator by watabou')"
          class="icon-map"></button>
  <button id="burgRelocate" onmouseover="tip('Move burg to a different cell')"
          class="icon-target"></button>
  <button id="burglLegend" onmouseover="tip('Edit free text notes (legend) for this burg')"
          class="icon-edit"></button>
  <button id="burgAddfromEditor" onmouseover="tip('Add new Burg')" class="icon-plus"></button>
  <button id="burgRemove" onmouseover="tip('Remove the Burg')" class="icon-trash"></button>
</div>
</template>
<script>
export default {
  name: 'BurgEditor'
}
</script>