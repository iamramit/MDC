function getColorBrightness(rgbColor) {
  var colorValues = rgbColor.match(/[\d\.]+/g).map(Number);
  return 0.2126 * (colorValues[0] / 255) + 0.7152 * (colorValues[1] / 255) + 0.0722 * (colorValues[2] / 255);
}

function isSimilarToBackground(color) {
  var backgroundColor = 'rgb(255, 255, 255)';

  var colorBrightness = getColorBrightness(color);
  var backgroundColorBrightness = getColorBrightness(backgroundColor);

  return (backgroundColorBrightness / colorBrightness) < 1.5;
}

var SwatchColors = (function() {
  function SwatchColors() {
    this.colors = {};

    this.images = {};

    this.triggers = ['color','colour','couleur','farbe','cor',];
  }

  function setSwatchColor(swatch) {
    var swatchId = swatch.getAttribute('swatch-id');

    if (Object.keys(this.colors).includes(swatchId)) {
      swatch.style.setProperty("--background-graphic", this.colors[swatchId]);

      if (isSimilarToBackground(this.colors[swatchId])) swatch.classList.add('is-similar-to-background');
      if (getColorBrightness(this.colors[swatchId]) > 0.5) {
        swatch.style.setProperty('--tick-color', '#000');
      } else {
        swatch.style.setProperty('--tick-color', '#fff');
      }
      swatch.classList.remove('is-blank');
    }

    if (Object.keys(this.images).includes(swatchId)) {
      swatch.style.setProperty("--background-graphic", this.images[swatchId]);
      swatch.classList.add('is-image');
      swatch.classList.remove('is-blank');
    }
  }
  SwatchColors.prototype.setSwatchColor = setSwatchColor;

  return SwatchColors;
}());

const Swatches = new SwatchColors();

function VariantSwatch() {
  return Reflect.construct(HTMLElement, [], this.constructor);
}

VariantSwatch.prototype = Object.create(HTMLElement.prototype);
VariantSwatch.prototype.constructor = VariantSwatch;
Object.setPrototypeOf(VariantSwatch, HTMLElement);

VariantSwatch.prototype.connectedCallback = function() {
  Swatches.setSwatchColor(this);
};
customElements.define('variant-swatch', VariantSwatch);

export default Swatches;
