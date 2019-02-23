import * as d3 from 'd3'
import * as $ from 'jquery'
import Vue from 'vue'
import FantasyMapGenerator from './components/FantasyMapGenerator.vue'
import store from './store'

Vue.config.productionTip = false

window.$ = $
window.d3 = d3

new Vue({
  store,
  render: h => h(FantasyMapGenerator)
}).$mount('#app')
