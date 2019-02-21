<template>
<div id="dialogs" style="background-color: #ffffff">
  <LabelsEditor/>
  <RiverEditor/>
  <RouteEditor/>
  <IconEditor/>
  <ReliefEditor/>
  <BurgEditor/>
  <MarkerEditor/>
  <TemplateEditor/>
  <ImageConverter/>
  <BrushesPanel/>
  <PerspectivePanel/>
  <CountriesEditor/>
  <BurgsEditor/>
  <CulturesEditor/>
  <NamesBaseEditor/>
  <LegendEditor/>
  <ScaleEditor/>
  <div id="alert" style="display: none">
    <p id="alertMessage">Warning!</p>
  </div>
</div>
</template>

<script>
  import RiverEditor from './RiverEditor'
  import LabelsEditor from './LabelsEditor'
  import RouteEditor from './RouteEditor'
  import IconEditor from './IconEditor'
  import ReliefEditor from './ReliefEditor'
  import BurgEditor from './BurgEditor'
  import MarkerEditor from './MarkerEditor'
  import TemplateEditor from './TemplateEditor'
  import ImageConverter from './ImageConverter'
  import BrushesPanel from './BrushesPanel'
  import PerspectivePanel from './PerspectivePanel'
  import CountriesEditor from './CountriesEditor'
  import BurgsEditor from './BurgsEditor'
  import CulturesEditor from './CulturesEditor'
  import NamesBaseEditor from './NamesBaseEditor'
  import LegendEditor from './LegendEditor'
  import ScaleEditor from './ScaleEditor'

  export default {
  name: 'Dialogs',
  components: {
    ScaleEditor,
    LegendEditor,
    NamesBaseEditor,
    CulturesEditor,
    BurgsEditor,
    CountriesEditor,
    PerspectivePanel,
    BrushesPanel,
    ImageConverter,
    TemplateEditor,
    MarkerEditor,
    BurgEditor, ReliefEditor, IconEditor, RouteEditor, LabelsEditor, RiverEditor}
}
</script>

