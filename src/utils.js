import * as d3 from 'd3'
import * as _ from 'lodash'

export const svg = () => d3.select('svg')
export const viewbox = () => svg().select('#viewbox')

// convert RGB color string to HEX without #
export function toHEX(rgb) {
  if (rgb.charAt(0) === '#') {return rgb}
  rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i)
  return (rgb && rgb.length === 4) ? '#' +
                                     ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                                     ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                                     ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : ''
}

// round string to d decimals
export function round(s, d) {
  return s.replace(/[\d.-][\d.e-]*/g, function(n) {return _.round(n, d || 1)})
}

// convert number to short string with SI postfix
export function si(n) {
  if (n >= 1e9) {return _.round(n / 1e9, 1) + 'B'}
  if (n >= 1e8) {return _.round(n / 1e6, 0) + 'M'}
  if (n >= 1e6) {return _.round(n / 1e6, 1) + 'M'}
  if (n >= 1e4) {return _.round(n / 1e3, 0) + 'K'}
  if (n >= 1e3) {return _.round(n / 1e3, 1) + 'K'}
  return _.round(n)
}

// getInteger number from user input data
export function getInteger(value) {
  const metric = value.slice(-1)
  if (metric === 'K') {return parseInt(value.slice(0, -1) * 1e3)}
  if (metric === 'M') {return parseInt(value.slice(0, -1) * 1e6)}
  if (metric === 'B') {return parseInt(value.slice(0, -1) * 1e9)}
  return parseInt(value)
}

// Code from Kaiido's answer:
// https://stackoverflow.com/questions/42402584/how-to-use-google-fonts-in-canvas-when-drawing-dom-objects-in-svg
export function GFontToDataURI(url) {
  return fetch(url) // first fecth the embed stylesheet page
    .then(resp => resp.text()) // we only need the text of it
    .then(text => {
      let s = document.createElement('style')
      s.innerHTML = text
      document.head.appendChild(s)
      let styleSheet = Array.prototype.filter.call(
        document.styleSheets,
        sS => sS.ownerNode === s)[0]
      let FontRule = rule => {
        let src = rule.style.getPropertyValue('src')
        let url = src.split('url(')[1].split(')')[0]
        return {
          rule: rule,
          src: src,
          url: url.substring(url.length - 1, 1)
        }
      }
      let fontRules = [], fontProms = []

      for (let r of styleSheet.cssRules) {
        let fR = FontRule(r)
        fontRules.push(fR)
        fontProms.push(
          fetch(fR.url) // fetch the actual font-file (.woff)
            .then(resp => resp.blob())
            .then(blob => {
              return new Promise(resolve => {
                let f = new FileReader()
                f.onload = () => resolve(f.result)
                f.readAsDataURL(blob)
              })
            })
            .then(dataURL => {
              return fR.rule.cssText.replace(fR.url, dataURL)
            })
        )
      }
      document.head.removeChild(s) // clean up
      return Promise.all(fontProms) // wait for all this has been done
    })
}

// return value (v) if defined with specified number of decimals (d)
// else return "no" or attribute (r)
export function ifDefined(v, r, d) {
  if (v === null || v === undefined) return r || 'no'
  if (d) return v.toFixed(d)
  return v
}