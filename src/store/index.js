import Vue from 'vue'
import Vuex from 'vuex'
import createLogger from 'vuex/dist/logger'
import graphic from './modules/graphic'
import names from './modules/names'
import cultures from './modules/cultures'

Vue.use(Vuex)

const debug = process.env.NODE_ENV !== 'production'

export default new Vuex.Store({
  modules: {
    graphic,
    names,
    cultures,
  },
  strict: debug,
  plugins: debug ? [createLogger()] : []
})