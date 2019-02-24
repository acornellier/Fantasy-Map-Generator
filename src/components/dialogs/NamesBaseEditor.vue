<template>
<div id="namesbaseEditor" class="dialog stable textual" style="display: none">
  <div id="namesbaseBasesTop">
    <span>Select base: </span>
    <select id="namesbaseSelect" onmouseover="tip('Select base to edit')" value="0"></select>
    <span>Base name: </span>
    <input id="namesbaseName" onmouseover="tip('Type to change a base name')"
           placeholder="Base name" autocorrect="off" spellcheck="false"/>
  </div>
  <div id="namesbaseBody">
    <span>Names data:</span><br>
    <textarea id="namesbaseTextarea" data-base="0" cols="70" rows="10"
              onmouseover="tip('Names data: a comma separated list of source names used for names generation')"
              placeholder="Provide a names data: a comma separated list of source names"
              autocorrect="off" spellcheck="false"></textarea>
    <br>
    <div>
      <span>Method: </span><select onmouseover="tip('Select generation method')"
                                   id="namesbaseMethod">
      <option value="let-to-let">Markov let-to-let</option>
      <option value="let-to-syl">Markov let-to-syl</option>
      <option value="syl-to-syl">Markov syl-to-syl</option>
      <option value="selection">Random selection</option>
    </select><span>   Length: </span>
      <input id="namesbaseMin" onmouseover="tip('Minimal name length recommendation')"
             type="number" min="2" max="100" value="4">
      <input id="namesbaseMax" onmouseover="tip('Maximal name length recommendation')"
             type="number" min="2" value="10">
      <span>Dublication: </span>
      <input id="namesbaseDouble"
             onmouseover="tip('Populate with letters that can used twice in a row')"
             autocorrect="off" spellcheck="false" value="abc">
    </div>
    <fieldset>
      <legend>Generated examples:</legend>
      <div id="namesbaseExamples"
           onmouseover="tip('Generated examples. Click to re-gererate')"></div>
    </fieldset>
  </div>
  <div id="namesbaseBottom">
    <button id="namesbaseDefault" onmouseover="tip('Restore default namesbase')"
            class="icon-cancel"></button>
    <button id="namesbaseAdd" onmouseover="tip('Add a new base')" class="icon-plus"></button>
    <button id="namesbaseUpdateExamples"
            onmouseover="tip('Re-generate examples based on provided data and generation method')"
            class="icon-cw"></button>
    <button id="namesbaseDownload" onmouseover="tip('Download namesbase to PC')"
            class="icon-download"></button>
    <button id="namesbaseUpload" onmouseover="tip('Upload a namesbase from PC')"
            class="icon-upload"></button>
    <button id="namesbaseMail"
            onclick="window.open('mailto:maxganiev@yandex.com?Subject=Namesbase%20suggestion', '_blank')"
            onmouseover="tip('Send a namesbase suggestion to me')"
            class="icon-mail-alt"></button>
  </div>
</div>
</template>
<script>
import {mapState} from 'vuex'

export default {
  name: 'NamesBaseEditor',
  computed: mapState({
    nameBases: state => state.names.nameBases,
    chain: state => state.names.chain,
  }),
}
</script>