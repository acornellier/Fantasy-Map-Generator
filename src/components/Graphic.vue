<template>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"
       width="100%" height="100%">
    <defs>
      <g id="filters">
        <filter id="blurFilter" x="-1" y="-1" width="100" height="100">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.2"/>
        </filter>
        <filter id="blur1" x="-1" y="-1" width="100" height="100">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
        </filter>
        <filter id="blur5" x="-1" y="-1" width="100" height="100">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
        </filter>
        <filter id="blur10" x="-1" y="-1" width="100" height="100">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10"/>
        </filter>
        <filter id="splotch">
          <feTurbulence type="fractalNoise" baseFrequency=".01" numOctaves="4"/>
          <feColorMatrix values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -0.9 1.2"
                         result="texture"/>
          <feComposite in="SourceGraphic" in2="texture" operator="in"/>
        </filter>
        <filter id="bluredSplotch">
          <feTurbulence type="fractalNoise" baseFrequency=".01" numOctaves="4"/>
          <feColorMatrix values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -0.9 1.2"
                         result="texture"/>
          <feComposite in="SourceGraphic" in2="texture" operator="in"/>
          <feGaussianBlur stdDeviation="4"/>
        </filter>
        <filter id="dropShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="1" dy="2"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="dropShadow01">
          <feGaussianBlur in="SourceAlpha" stdDeviation=".1"/>
          <feOffset dx=".2" dy=".3"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="dropShadow05">
          <feGaussianBlur in="SourceAlpha" stdDeviation=".5"/>
          <feOffset dx=".5" dy=".7"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="outline">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="pencil">
          <feTurbulence baseFrequency="0.03" numOctaves="6" type="fractalNoise"/>
          <feDisplacementMap scale="3" in="SourceGraphic" xChannelSelector="R"
                             yChannelSelector="G"/>
        </filter>
        <filter id="turbulence">
          <feTurbulence baseFrequency="0.1" numOctaves="3" type="fractalNoise"/>
          <feDisplacementMap scale="10" in="SourceGraphic" xChannelSelector="R"
                             yChannelSelector="G"/>
        </filter>
        <filter id="filter-grayscale">
          <feColorMatrix
              values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="filter-sepia">
          <feColorMatrix
              values="0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="filter-dingy">
          <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0.3 0.3 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="filter-tint">
          <feColorMatrix values="1.1 0 0 0 0  0 1.1 0 0 0  0 0 0.9 0 0  0 0 0 1 0"/>
        </filter>
      </g>
      <g id="deftemp"></g>
      <g id="defs-icons">
        <symbol id="icon-anchor" viewBox="0 0 30 29">
          <title>Port</title>
          <path
              d="M15 4c0-0.547-0.453-1-1-1s-1 0.453-1 1 0.453 1 1 1 1-0.453 1-1zM28 18.5v5.5c0 0.203-0.125 0.391-0.313 0.469-0.063 0.016-0.125 0.031-0.187 0.031-0.125 0-0.25-0.047-0.359-0.141l-1.453-1.453c-2.453 2.953-6.859 4.844-11.688 4.844s-9.234-1.891-11.688-4.844l-1.453 1.453c-0.094 0.094-0.234 0.141-0.359 0.141-0.063 0-0.125-0.016-0.187-0.031-0.187-0.078-0.313-0.266-0.313-0.469v-5.5c0-0.281 0.219-0.5 0.5-0.5h5.5c0.203 0 0.391 0.125 0.469 0.313s0.031 0.391-0.109 0.547l-1.563 1.563c1.406 1.891 4.109 3.266 7.203 3.687v-10.109h-3c-0.547 0-1-0.453-1-1v-2c0-0.547 0.453-1 1-1h3v-2.547c-1.188-0.688-2-1.969-2-3.453 0-2.203 1.797-4 4-4s4 1.797 4 4c0 1.484-0.812 2.766-2 3.453v2.547h3c0.547 0 1 0.453 1 1v2c0 0.547-0.453 1-1 1h-3v10.109c3.094-0.422 5.797-1.797 7.203-3.687l-1.563-1.563c-0.141-0.156-0.187-0.359-0.109-0.547s0.266-0.313 0.469-0.313h5.5c0.281 0 0.5 0.219 0.5 0.5z"></path>
        </symbol>
      </g>
      <g id="defs-markers">
        <symbol id="marker0" viewBox="0 0 30 30">
          <path d="M6,19 l9,10 L24,19" fill="#000000" stroke="none"></path>
          <circle cx="15" cy="15" r="10" stroke-width="1" stroke="#000000"
                  fill="#ffffff"></circle>
          <text x="50%" y="50%" fill="#000000" stroke-width="0" stroke="#000000" font-size="22px"
                dominant-baseline="central">?
          </text>
        </symbol>
      </g>
      <pattern id="oceanic" width="100" height="100" patternUnits="userSpaceOnUse">
        <filter id='image'>
          <feImage x="0" y="0" width="100" height="100"
                   xlink:href="data:image/png;base64,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"/>
        </filter>
        <rect width='100' height='100' filter="url(#image)" opacity='0.2'/>
      </pattern>
      <pattern id="mottling" width="16" height="9" patternUnits="userSpaceOnUse">
        <filter id='turb'>
          <feTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='10'
                        stitchTiles='stitch'/>
        </filter>
        <rect width='16' height='9' filter="url(#turb)"/>
      </pattern>
      <g id="rose" stroke-width="1">
        <g id="sL" stroke="#3f3f3f">
          <line x1="0" y1="-10000" x2="0" y2="10000"/>
          <line x1="-10000" y1="0" x2="10000" y2="0"/>
        </g>
        <use xlink:href="#sL" transform="rotate(45)"/>
        <use xlink:href="#sL" transform="rotate(22.5)"/>
        <use xlink:href="#sL" transform="rotate(-22.5)"/>
        <use xlink:href="#sL" transform="rotate(11.25)"/>
        <use xlink:href="#sL" transform="rotate(-11.25)"/>
        <use xlink:href="#sL" transform="rotate(56.25)"/>
        <use xlink:href="#sL" transform="rotate(-56.25)"/>
        <g stroke-width="8">
          <circle r="9" stroke="#000000" fill="#1b1b1b"/>
          <circle r="75" stroke="#008000" fill="#ffffff" fill-opacity=".1"></circle>
          <circle r="212" stroke="#1b1b1b"></circle>
          <circle r="211" stroke="#008000" fill="#ffffff" fill-opacity=".1"></circle>
        </g>
        <g stroke="#1b1b1b">
          <circle r="71"/>
          <circle r="79"/>
          <circle r="94"/>
          <circle r="152"/>
          <circle r="164"/>
          <circle r="207"/>
        </g>
        <g id="s3">
          <g id="s2">
            <g id="s1" stroke="#1b1b1b">
              <path
                  d="M 39.416,95.16 C 33.65,103.95 30.76,110.5 28.93,117.18 C 15.24,113.43 13.54,127.15 23.04,131 C 13.71,145.8 7.84,173.93 0,212 L 0,103 A 103,103 0 0,0 39.416,95.16 z"
                  fill="#47a3d1"/>
              <path
                  d="M 39.416,95.16 C 33.65,103.95 30.76,110.5 28.93,117.18 C 15.24,113.43 13.54,127.15 23.04,131 C 13.71,145.8 7.84,173.93 0,212 L 0,103 A 103,103 0 0,0 39.416,95.16 z"
                  fill="black" transform="scale(-1,1)"/>
              <path
                  d="M -31.995,160.849 A 164,164 0 0,0 31.995,160.849 C 18.9,170.1 8.4,176.3 0,207 C -8.4,176.3 -18.9,170.1 -31.995,160.849 z"
                  fill="#c2390f" transform="rotate(22.5)"/>
            </g>
            <use xlink:href="#s1" transform="rotate(45)"/>
          </g>
          <use xlink:href="#s2" transform="rotate(90)"/>
        </g>
        <use xlink:href="#s3" transform="scale(-1)"/>
      </g>
    </defs>
    <g id="initial">
      <rect x="0" y="0" width="100%" height="100%" fill="url(#oceanic)"></rect>
      <use xlink:href="#rose" id="init-rose"></use>
    </g>
</svg>
</template>

<script>
export default {
  name: 'Graphic'
}
</script>

<style scoped>

</style>