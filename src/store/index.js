import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'
import cultures from './modules/cultures'
import global from './modules/global'
import graphic from './modules/graphic'
import names from './modules/names'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'

export default new Vuex.Store({
  modules: {
    cultures,
    graphic,
    names,
  },
  strict: debug,
  plugins: debug ? [createLogger()] : []
})